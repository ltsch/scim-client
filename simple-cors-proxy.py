# simple-cors-proxy.py
# Secure Python CORS proxy with security checks for public deployment
# Requires: pip install requests

from http.server import BaseHTTPRequestHandler
from socketserver import ThreadingTCPServer
import requests
import time
import ipaddress
import re
from urllib.parse import urlparse

class SecureCORSProxy(BaseHTTPRequestHandler):
    # Security configuration
    ALLOWED_CONTENT_TYPES = {
        'application/json',
        'application/scim+json',
        'text/plain',
        'application/xml',
        'text/xml'
    }
    
    # Allowed IP ranges (localhost and private networks)
    ALLOWED_IP_RANGES = [
        '127.0.0.0/8',      # localhost
        '10.0.0.0/8',       # private network
        '172.16.0.0/12',    # private network
        '192.168.0.0/16',   # private network
        '::1/128',           # IPv6 localhost
        'fc00::/7',          # IPv6 unique local
        'fe80::/10'          # IPv6 link-local
    ]
    
    # Rate limiting (requests per minute per IP)
    RATE_LIMIT = 60
    rate_limit_store = {}
    
    def _get_client_ip(self):
        """Extract real client IP from forwarded headers"""
        # Check X-Real-IP first (set by Nginx)
        real_ip = self.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        # Check X-Forwarded-For (may contain multiple IPs)
        forwarded_for = self.headers.get('X-Forwarded-For')
        if forwarded_for:
            # Take the first IP (original client)
            return forwarded_for.split(',')[0].strip()
        
        # Fallback to direct connection
        return self.client_address[0]
    
    def _is_allowed_ip(self, ip_str):
        """Check if IP is in allowed ranges"""
        try:
            ip = ipaddress.ip_address(ip_str)
            for network in self.ALLOWED_IP_RANGES:
                if ip in ipaddress.ip_network(network):
                    return True
            return False
        except ValueError:
            return False
    
    def _check_rate_limit(self, ip):
        """Simple rate limiting"""
        current_time = time.time()
        minute_ago = current_time - 60
        
        # Clean old entries
        self.rate_limit_store = {k: v for k, v in self.rate_limit_store.items() 
                               if v > minute_ago}
        
        # Count requests for this IP
        requests_this_minute = sum(1 for t in self.rate_limit_store.values() 
                                 if t > minute_ago and k == ip)
        
        if requests_this_minute >= self.RATE_LIMIT:
            return False
        
        # Add current request
        self.rate_limit_store[f"{ip}_{current_time}"] = current_time
        return True
    
    def _validate_target_url(self, url):
        """Validate the target URL for security"""
        try:
            parsed = urlparse(url)
            
            # Check for valid scheme
            if parsed.scheme not in ['http', 'https']:
                return False, "Invalid URL scheme"
            
            # Check for valid hostname
            if not parsed.hostname:
                return False, "No hostname in URL"
            
            # Optional: Add domain restrictions here if needed
            # if not parsed.hostname.endswith('.yourdomain.com'):
            #     return False, "Domain not allowed"
            
            return True, None
        except Exception as e:
            return False, f"URL parsing error: {e}"
    
    def _check_content_type(self, content_type):
        """Check if content type is allowed"""
        if not content_type:
            return True  # Allow if no content type specified
        
        # Extract base content type
        base_type = content_type.split(';')[0].strip().lower()
        
        # Check if it's in our allowed list
        return base_type in self.ALLOWED_CONTENT_TYPES
    
    def _security_check(self):
        """Perform all security checks"""
        client_ip = self._get_client_ip()
        
        # Log the request with client info
        print(f"[{time.strftime('%H:%M:%S')}] Request from {client_ip} - {self.command} {self.path}")
        
        # Check IP restrictions
        if not self._is_allowed_ip(client_ip):
            print(f"[{time.strftime('%H:%M:%S')}] Blocked request from {client_ip} - IP not allowed")
            return False, f"Access denied from {client_ip}", 403
        
        # Check rate limiting
        if not self._check_rate_limit(client_ip):
            print(f"[{time.strftime('%H:%M:%S')}] Rate limit exceeded for {client_ip}")
            return False, "Rate limit exceeded", 429
        
        # Check content type for POST/PUT/PATCH
        if self.command in ['POST', 'PUT', 'PATCH']:
            content_type = self.headers.get('Content-Type', '')
            if not self._check_content_type(content_type):
                print(f"[{time.strftime('%H:%M:%S')}] Blocked request - invalid content type: {content_type}")
                return False, f"Content type not allowed: {content_type}", 400
        
        return True, None, None
    
    def do_GET(self):
        # Security check
        allowed, error_msg, status_code = self._security_check()
        if not allowed:
            self.send_response(status_code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(error_msg.encode())
            return
        
        # Remove leading slash and /proxy/ prefix if present
        url = self.path[1:]  # Remove leading slash
        if url.startswith('proxy/'):
            url = url[6:]  # Remove 'proxy/' prefix
        
        # Validate target URL
        url_valid, url_error = self._validate_target_url(url)
        if not url_valid:
            self.send_response(400)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(url_error.encode())
            return
        
        start_time = time.time()
        print(f"[{time.strftime('%H:%M:%S')}] GET {url}")
        try:
            # Forward relevant headers
            headers = {}
            for h in ['Authorization', 'Accept', 'Content-Type', 'User-Agent', 'If-Match', 'If-None-Match']:
                if h in self.headers:
                    headers[h] = self.headers[h]
            print(f"[{time.strftime('%H:%M:%S')}] Making request to {url}")
            resp = requests.get(url, headers=headers, allow_redirects=True, timeout=25)
            elapsed = time.time() - start_time
            print(f"[{time.strftime('%H:%M:%S')}] Response {resp.status_code} in {elapsed:.2f}s")
            self.send_response(resp.status_code)
            self.send_header('Access-Control-Allow-Origin', '*')
            for k, v in resp.headers.items():
                if k.lower() != 'content-encoding':
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(resp.content)
        except Exception as e:
            elapsed = time.time() - start_time
            print(f"[{time.strftime('%H:%M:%S')}] Error after {elapsed:.2f}s: {e}")
            self.send_response(502)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(str(e).encode())

    def do_OPTIONS(self):
        # Security check for OPTIONS
        allowed, error_msg, status_code = self._security_check()
        if not allowed:
            self.send_response(status_code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(error_msg.encode())
            return
        
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_POST(self):
        self._proxy_request('POST')
    def do_PUT(self):
        self._proxy_request('PUT')
    def do_PATCH(self):
        self._proxy_request('PATCH')
    def do_DELETE(self):
        self._proxy_request('DELETE')

    def _proxy_request(self, method):
        # Security check
        allowed, error_msg, status_code = self._security_check()
        if not allowed:
            self.send_response(status_code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(error_msg.encode())
            return
        
        # Remove leading slash and /proxy/ prefix if present
        url = self.path[1:]  # Remove leading slash
        if url.startswith('proxy/'):
            url = url[6:]  # Remove 'proxy/' prefix
        
        # Validate target URL
        url_valid, url_error = self._validate_target_url(url)
        if not url_valid:
            self.send_response(400)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(url_error.encode())
            return
        
        start_time = time.time()
        print(f"[{time.strftime('%H:%M:%S')}] {method} {url}")
        try:
            headers = {}
            for h in ['Authorization', 'Accept', 'Content-Type', 'User-Agent', 'If-Match', 'If-None-Match']:
                if h in self.headers:
                    headers[h] = self.headers[h]
            length = int(self.headers.get('Content-Length', 0))
            data = self.rfile.read(length) if length > 0 else None
            print(f"[{time.strftime('%H:%M:%S')}] Making {method} request to {url}")
            resp = requests.request(method, url, headers=headers, data=data, allow_redirects=True, timeout=25)
            elapsed = time.time() - start_time
            print(f"[{time.strftime('%H:%M:%S')}] Response {resp.status_code} in {elapsed:.2f}s")
            self.send_response(resp.status_code)
            self.send_header('Access-Control-Allow-Origin', '*')
            for k, v in resp.headers.items():
                if k.lower() != 'content-encoding':
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(resp.content)
        except Exception as e:
            elapsed = time.time() - start_time
            print(f"[{time.strftime('%H:%M:%S')}] Error after {elapsed:.2f}s: {e}")
            self.send_response(502)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(str(e).encode())

if __name__ == '__main__':
    import os
    port = int(os.environ.get('CORS_PROXY_PORT', 8002))
    print(f'Secure multi-threaded Python CORS proxy running on http://localhost:{port}')
    print(f'Security features: IP validation, rate limiting, content-type restrictions')
    server = ThreadingTCPServer(('0.0.0.0', port), SecureCORSProxy)
    server.serve_forever() 