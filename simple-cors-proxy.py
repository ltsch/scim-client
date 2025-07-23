# simple-cors-proxy.py
# Minimal Python CORS proxy for local development with comprehensive security
# Requires: pip install requests

from http.server import BaseHTTPRequestHandler
from socketserver import ThreadingTCPServer
import requests
import time
import urllib.parse
import re
from urllib.parse import urlparse
from collections import defaultdict
import threading

class CORSProxy(BaseHTTPRequestHandler):
    # Local development origins - always allowed
    LOCAL_ORIGINS = [
        'http://localhost:8000',
        'http://localhost:5174',  # Vite dev server
        'http://127.0.0.1:8000',
        'http://127.0.0.1:5174',
        'https://localhost:8000',
        'https://localhost:5174',
        'https://127.0.0.1:8000',
        'https://127.0.0.1:5174'
    ]
    
    # Security settings
    MAX_REQUEST_SIZE = 1024 * 1024  # 1MB max request size
    MAX_RESPONSE_SIZE = 10 * 1024 * 1024  # 10MB max response size
    RATE_LIMIT_REQUESTS = 1000  # Max requests per minute per IP (increased for testing)
    RATE_LIMIT_WINDOW = 60  # 1 minute window
    
    # Allowed content types for requests (API calls only)
    ALLOWED_CONTENT_TYPES = [
        'application/json',
        'application/xml',
        'text/plain',
        'text/xml',
        'application/x-www-form-urlencoded',
        'application/scim+json',
        'application/scim+xml'
    ]
    
    # Blocked content types (media, executables, etc.)
    BLOCKED_CONTENT_TYPES = [
        'image/',
        'video/',
        'audio/',
        'application/octet-stream',
        'application/pdf',
        'application/zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed',
        'application/x-msdownload',
        'application/x-executable',
        'text/html',  # Block HTML to prevent SSRF attacks
        'text/css',
        'application/javascript',
        'text/javascript'
    ]
    
    # Rate limiting storage (IP -> list of timestamps)
    _rate_limit_data = defaultdict(list)
    _rate_limit_lock = threading.Lock()
    
    # Allowed HTTP methods for API calls
    ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    
    def _is_local_development(self, origin):
        """Check if the origin is a local development environment"""
        if not origin:
            return False
        return origin in self.LOCAL_ORIGINS or re.match(r'^https?://(localhost|127\.0\.0\.1):(8000|5174)$', origin)
    
    def _is_same_domain_request(self, origin, referer):
        """Check if the request is from the same domain as the proxy"""
        if not origin:
            return False
            
        try:
            # Parse the origin URL
            origin_parsed = urlparse(origin)
            origin_domain = origin_parsed.netloc
            
            # Check if it's a valid domain (not localhost/127.0.0.1)
            if self._is_local_development(origin):
                return True
                
            # For production domains, check if it's a valid domain
            # Allow any domain that's not obviously malicious
            if origin_domain and '.' in origin_domain and not origin_domain.startswith('.'):
                # Additional security: check for common malicious patterns
                malicious_patterns = [
                    r'\.(tk|ml|ga|cf|gq)$',  # Free domains often used for attacks
                    r'^(0\.0\.0\.0|255\.255\.255\.255)',  # Invalid IPs
                    r'^(localhost|127\.0\.0\.1|0\.0\.0\.0)',  # Local addresses
                ]
                
                for pattern in malicious_patterns:
                    if re.search(pattern, origin_domain):
                        return False
                        
                return True
                
        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] Error parsing origin {origin}: {e}")
            return False
            
        return False
    
    def _check_rate_limit(self, client_ip):
        """Check if the client has exceeded rate limits"""
        current_time = time.time()
        
        with self._rate_limit_lock:
            # Clean old entries
            self._rate_limit_data[client_ip] = [
                ts for ts in self._rate_limit_data[client_ip] 
                if current_time - ts < self.RATE_LIMIT_WINDOW
            ]
            
            # Check if limit exceeded
            if len(self._rate_limit_data[client_ip]) >= self.RATE_LIMIT_REQUESTS:
                return False
                
            # Add current request
            self._rate_limit_data[client_ip].append(current_time)
            return True
    
    def _check_content_type_security(self, headers):
        """Check if content type is allowed"""
        content_type = headers.get('Content-Type', '').lower()
        
        # Check for blocked content types
        for blocked_type in self.BLOCKED_CONTENT_TYPES:
            if content_type.startswith(blocked_type):
                return False, f"Content type '{content_type}' is not allowed"
        
        # For POST/PUT/PATCH requests, require allowed content types
        if self.command in ['POST', 'PUT', 'PATCH']:
            if not any(allowed in content_type for allowed in self.ALLOWED_CONTENT_TYPES):
                return False, f"Content type '{content_type}' is not allowed for {self.command} requests"
        
        return True, None
    
    def _check_request_size(self, headers):
        """Check if request size is within limits"""
        content_length = headers.get('Content-Length')
        if content_length:
            try:
                size = int(content_length)
                if size > self.MAX_REQUEST_SIZE:
                    return False, f"Request size {size} exceeds maximum {self.MAX_REQUEST_SIZE}"
            except ValueError:
                return False, "Invalid Content-Length header"
        return True, None
    
    def _check_url_security(self, url):
        """Check if the target URL is safe"""
        try:
            parsed = urlparse(url)
            
            # Block local/private IP addresses
            if parsed.hostname:
                if parsed.hostname in ['localhost', '127.0.0.1', '0.0.0.0', '::1']:
                    return False, "Local/private IP addresses are not allowed"
                
                # Block private IP ranges
                if parsed.hostname.startswith(('10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.')):
                    return False, "Private IP addresses are not allowed"
            
            # Block file:// URLs
            if parsed.scheme == 'file':
                return False, "File URLs are not allowed"
                
            # Block ftp:// URLs
            if parsed.scheme == 'ftp':
                return False, "FTP URLs are not allowed"
                
            # Only allow HTTP/HTTPS
            if parsed.scheme not in ['http', 'https']:
                return False, f"Scheme '{parsed.scheme}' is not allowed"
                
        except Exception as e:
            return False, f"Invalid URL: {e}"
            
        return True, None
    
    def _check_origin_security(self):
        """Check if the request is from an allowed origin"""
        origin = self.headers.get('Origin')
        referer = self.headers.get('Referer')
        
        # Log security check for debugging
        print(f"[{time.strftime('%H:%M:%S')}] Security check - Origin: {origin}, Referer: {referer}")
        
        # Allow local development environments
        if self._is_local_development(origin):
            print(f"[{time.strftime('%H:%M:%S')}] Allowing local development origin: {origin}")
            return True
        
        # Check if it's a same-domain request (production deployment)
        if self._is_same_domain_request(origin, referer):
            print(f"[{time.strftime('%H:%M:%S')}] Allowing same-domain request from: {origin}")
            return True
        
        # Check Referer header as fallback for same-domain requests
        if referer:
            try:
                referer_parsed = urlparse(referer)
                referer_domain = referer_parsed.netloc
                
                if self._is_local_development(referer):
                    print(f"[{time.strftime('%H:%M:%S')}] Allowing local development referer: {referer}")
                    return True
                    
                if referer_domain and '.' in referer_domain and not referer_domain.startswith('.'):
                    print(f"[{time.strftime('%H:%M:%S')}] Allowing same-domain referer: {referer}")
                    return True
                    
            except Exception as e:
                print(f"[{time.strftime('%H:%M:%S')}] Error parsing referer {referer}: {e}")
        
        # If no Origin or Referer, check if it's a direct request (for testing)
        # This allows curl and direct browser requests for testing
        user_agent = self.headers.get('User-Agent', '')
        if not origin and not referer:
            print(f"[{time.strftime('%H:%M:%S')}] No Origin/Referer, allowing direct request with UA: {user_agent[:50]}")
            return True
        
        print(f"[{time.strftime('%H:%M:%S')}] BLOCKED: Origin {origin} not allowed")
        return False
    
    def _send_security_error(self, message, status_code=403):
        """Send a security error response"""
        print(f"[{time.strftime('%H:%M:%S')}] SECURITY BLOCKED: {message}")
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        error_response = {
            'error': 'Access denied',
            'message': message,
            'code': 'SECURITY_VIOLATION'
        }
        import json
        self.wfile.write(json.dumps(error_response).encode())

    def _perform_security_checks(self):
        """Perform all security checks"""
        client_ip = self.client_address[0]
        
        # 1. Check origin security first
        if not self._check_origin_security():
            return False, "Request origin not allowed"
        
        # 2. Check HTTP method
        if self.command not in self.ALLOWED_METHODS:
            return False, f"HTTP method '{self.command}' not allowed"
        
        # 3. Check content type (for POST/PUT/PATCH requests)
        if self.command in ['POST', 'PUT', 'PATCH']:
            content_type_ok, content_type_error = self._check_content_type_security(self.headers)
            if not content_type_ok:
                return False, content_type_error
        
        # 4. Check request size
        size_ok, size_error = self._check_request_size(self.headers)
        if not size_ok:
            return False, size_error
        
        # 5. Check target URL security (for GET requests)
        if self.command == 'GET':
            url = self._extract_target_url()
            if url:
                url_ok, url_error = self._check_url_security(url)
                if not url_ok:
                    return False, url_error
        
        # 6. Check rate limiting last (after all other security checks)
        if not self._check_rate_limit(client_ip):
            return False, "Rate limit exceeded"
        
        return True, None
    
    def _extract_target_url(self):
        """Extract the target URL from the request"""
        if '?' in self.path:
            path, query = self.path.split('?', 1)
            params = urllib.parse.parse_qs(query)
            if 'url' in params:
                return params['url'][0]
        return self.path[1:] if self.path.startswith('/') else self.path

    def do_GET(self):
        # Perform security checks
        security_ok, security_error = self._perform_security_checks()
        if not security_ok:
            self._send_security_error(security_error)
            return
            
        # Parse the URL parameter from the query string
        url = self._extract_target_url()
        
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
            
            # Check response size
            if len(resp.content) > self.MAX_RESPONSE_SIZE:
                self._send_security_error(f"Response size {len(resp.content)} exceeds maximum {self.MAX_RESPONSE_SIZE}", 413)
                return
            
            self.send_response(resp.status_code)
            # Return the specific origin that made the request
            origin = self.headers.get('Origin')
            if origin:
                self.send_header('Access-Control-Allow-Origin', origin)
            else:
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
        # Perform security checks
        security_ok, security_error = self._perform_security_checks()
        if not security_ok:
            self._send_security_error(security_error)
            return
            
        origin = self.headers.get('Origin')
        if origin:
            self.send_header('Access-Control-Allow-Origin', origin)
        else:
            self.send_header('Access-Control-Allow-Origin', '*')
        self.send_response(200)
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
        # Perform security checks
        security_ok, security_error = self._perform_security_checks()
        if not security_ok:
            self._send_security_error(security_error)
            return
            
        # Parse the URL parameter from the query string
        url = self._extract_target_url()
        
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
            
            # Check response size
            if len(resp.content) > self.MAX_RESPONSE_SIZE:
                self._send_security_error(f"Response size {len(resp.content)} exceeds maximum {self.MAX_RESPONSE_SIZE}", 413)
                return
            
            self.send_response(resp.status_code)
            # Return the specific origin that made the request
            origin = self.headers.get('Origin')
            if origin:
                self.send_header('Access-Control-Allow-Origin', origin)
            else:
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
    import sys
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except Exception:
            pass
    print(f'Secure CORS proxy running on http://localhost:{port}')
    print(f'Local development origins: {CORSProxy.LOCAL_ORIGINS}')
    print(f'Security: Rate limiting ({CORSProxy.RATE_LIMIT_REQUESTS} req/min), Content-type filtering, Size limits')
    print(f'Max request size: {CORSProxy.MAX_REQUEST_SIZE} bytes')
    print(f'Max response size: {CORSProxy.MAX_RESPONSE_SIZE} bytes')
    server = ThreadingTCPServer(('0.0.0.0', port), CORSProxy)
    server.serve_forever() 