# simple-cors-proxy.py
# Secure Python CORS proxy with security checks for public deployment
# Requires: pip install requests

from http.server import BaseHTTPRequestHandler
from socketserver import ThreadingTCPServer
import requests
import json
import os
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

    # Allowed target patterns (domains, wildcards, IPs, CIDRs)
    ALLOWED_TARGET_PATTERNS = []

    @classmethod
    def load_allowed_targets(cls, path_candidates=None):
        """Load allowed targets JSON from first existing path.

        Expected JSON structure: { "allowed_targets": ["*.example.com", "10.0.0.0/8", "localhost"] }
        """
        default_candidates = [
            # Inside container, static assets are under nginx html root
            '/usr/share/nginx/html/allowed-targets.json',
            # Fallback to working directory (for local dev)
            os.path.join(os.getcwd(), 'allowed-targets.json')
        ]
        candidates = path_candidates or default_candidates
        for candidate in candidates:
            try:
                if os.path.exists(candidate):
                    with open(candidate, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        patterns = data.get('allowed_targets', [])
                        if isinstance(patterns, list):
                            cls.ALLOWED_TARGET_PATTERNS = [str(p).strip() for p in patterns if str(p).strip()]
                            print(f"[ALLOWED] Loaded {len(cls.ALLOWED_TARGET_PATTERNS)} target patterns from {candidate}")
                            return
            except Exception as e:
                print(f"[ALLOWED] Failed to load from {candidate}: {e}")
        # If nothing loaded, keep empty list (deny-all) and log
        print("[ALLOWED] No allowlist loaded; all proxy targets will be denied")
    
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
            
            return True, None
        except Exception as e:
            return False, f"URL parsing error: {e}"

    def _is_target_allowed(self, url):
        """Check if the target URL's hostname is allowed by configured patterns.

        Supports:
          - Exact hostnames (e.g., example.com)
          - Wildcards (e.g., *.example.com)
          - IP addresses
          - CIDR ranges (IPv4/IPv6)
        """
        try:
            parsed = urlparse(url)
            host = parsed.hostname or ''
            if not host:
                return False

            # If no patterns configured, deny
            patterns = self.ALLOWED_TARGET_PATTERNS or []
            if not patterns:
                return False

            # Utility: IP matching via ipaddress
            def ip_in_cidr(host_ip, cidr):
                try:
                    ip_obj = ipaddress.ip_address(host_ip)
                    net = ipaddress.ip_network(cidr, strict=False)
                    return ip_obj in net
                except Exception:
                    return False

            # Utility: simple wildcard match
            def host_matches_pattern(h, pat):
                pat = pat.lower()
                h = h.lower()
                if '/' in pat:
                    # CIDR pattern
                    return ip_in_cidr(h, pat)
                if pat.startswith('*.'):
                    base = pat[2:]
                    return h == base or h.endswith('.' + base)
                return h == pat

            # Iterate patterns; allow if any match
            for pat in patterns:
                if host_matches_pattern(host, pat):
                    return True
            return False
        except Exception:
            return False
    
    def _extract_target_url(self, path):
        """Extract target URL from path - only accepts /proxy/ prefix with valid HTTPS URL
        
        This function expects paths in the format: /proxy/https://example.com/endpoint
        It validates that:
        1. Path starts with /proxy/
        2. URL after /proxy/ is a valid HTTPS URL
        3. URL matches the HTTPS regex pattern for security
        
        Args:
            path: The request path (e.g., '/proxy/https://api.example.com/endpoint')
            
        Returns:
            str: The extracted HTTPS URL, or None if validation fails
        """
        # Step 1: Check if path starts with /proxy/
        if not path.startswith('/proxy/'):
            print(f"[DEBUG] Path does not start with /proxy/: '{path}'", flush=True)
            return None
        
        # Step 2: Extract URL after /proxy/
        url = path[7:]  # Remove '/proxy/'
        
        # Step 3: Validate URL with regex (HTTPS only)
        import re
        url_pattern = r'^https:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$'
        
        if not re.match(url_pattern, url):
            print(f"[DEBUG] URL does not match HTTPS pattern: '{url}'", flush=True)
            return None
        
        return url
    
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
        print(f"[{time.strftime('%H:%M:%S')}] Request from {client_ip} - {self.command} {self.path}", flush=True)
        print(f"[{time.strftime('%H:%M:%S')}] Headers: {dict(self.headers)}", flush=True)
        
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
        
        # Extract target URL from path
        url = self._extract_target_url(self.path)
        
        # Check if URL extraction failed
        if url is None:
            print(f"[{time.strftime('%H:%M:%S')}] Failed to extract URL from path: '{self.path}'", flush=True)
            self.send_response(400)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"Invalid proxy path. Must start with /proxy/ followed by a valid HTTPS URL")
            return
        
        # Validate target URL
        url_valid, url_error = self._validate_target_url(url)
        if not url_valid:
            print(f"[{time.strftime('%H:%M:%S')}] URL validation failed: {url_error}")
            self.send_response(400)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(url_error.encode())
            return

        # Enforce target allowlist
        if not self._is_target_allowed(url):
            print(f"[{time.strftime('%H:%M:%S')}] Blocked target host (not allowed): {url}")
            self.send_response(403)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"detail":"Target host not allowed by proxy policy"}')
            return
        
        start_time = time.time()
        print(f"[{time.strftime('%H:%M:%S')}] GET {url}")
        try:
            # Forward relevant headers (case-insensitive retrieval)
            headers = {}
             
            # Standard headers that should always be forwarded
            standard_headers = ['Authorization', 'Accept', 'Content-Type', 'User-Agent', 'If-Match', 'If-None-Match', 'Origin', 'Referer']
            
            # Forward standard headers
            for h in standard_headers:
                v = self.headers.get(h)
                if v is not None:
                    headers[h] = v
            
            # Forward all custom headers (those starting with X-)
            for header_name, header_value in self.headers.items():
                if header_name.startswith('X-') and header_name not in headers:
                    headers[header_name] = header_value
            # Debug which headers are forwarded (do not print sensitive values)
            print(f"[{time.strftime('%H:%M:%S')}] Forwarding headers: {', '.join(sorted(headers.keys()))}")

            print(f"[{time.strftime('%H:%M:%S')}] Making request to {url}")

            # Preserve Authorization across redirects by handling redirects manually
            resp = self._forward_with_redirects('GET', url, headers=headers, data=None)
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
        
        # Extract target URL from path
        url = self._extract_target_url(self.path)
        
        # Check if URL extraction failed
        if url is None:
            print(f"[{time.strftime('%H:%M:%S')}] Failed to extract URL from path: '{self.path}'", flush=True)
            self.send_response(400)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"Invalid proxy path. Must start with /proxy/ followed by a valid HTTPS URL")
            return
        
        # Validate target URL
        url_valid, url_error = self._validate_target_url(url)
        if not url_valid:
            print(f"[{time.strftime('%H:%M:%S')}] URL validation failed: {url_error}")
            self.send_response(400)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(url_error.encode())
            return

        # Enforce target allowlist
        if not self._is_target_allowed(url):
            print(f"[{time.strftime('%H:%M:%S')}] Blocked target host (not allowed): {url}")
            self.send_response(403)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"detail":"Target host not allowed by proxy policy"}')
            return
        
        start_time = time.time()
        print(f"[{time.strftime('%H:%M:%S')}] {method} {url}")
        try:
            headers = {}
            forward_list = ['Authorization', 'Accept', 'Content-Type', 'User-Agent', 'If-Match', 'If-None-Match', 'Origin', 'Referer']
            for h in forward_list:
                v = self.headers.get(h)
                if v is not None:
                    headers[h] = v
            length = int(self.headers.get('Content-Length', 0))
            data = self.rfile.read(length) if length > 0 else None
            print(f"[{time.strftime('%H:%M:%S')}] Making {method} request to {url}")

            # Preserve Authorization across redirects by handling redirects manually
            resp = self._forward_with_redirects(method, url, headers=headers, data=data)
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

    def _forward_with_redirects(self, method, url, headers=None, data=None, max_redirects=5):
        """Forward a request while preserving critical headers like Authorization across redirects.

        For 307/308, the original method and body are preserved.
        For 301/302/303, switch to GET per RFC when the original method is not GET.
        Relative redirect locations are resolved against the current URL.
        """
        session = requests.Session()
        current_url = url
        current_method = method.upper()
        current_data = data
        redirects = 0

        while True:
            resp = session.request(current_method, current_url, headers=headers, data=current_data,
                                   allow_redirects=False, timeout=25)

            if resp.is_redirect or resp.status_code in (301, 302, 303, 307, 308):
                location = resp.headers.get('Location')
                if not location:
                    return resp

                # Resolve relative URLs
                current_url = requests.compat.urljoin(current_url, location)
                redirects += 1

                # Adjust method per RFC
                if resp.status_code in (301, 302, 303) and current_method != 'GET':
                    current_method = 'GET'
                    current_data = None

                if redirects > max_redirects:
                    return resp
                # Loop to follow next redirect, preserving headers (incl. Authorization)
                continue

            return resp

if __name__ == '__main__':
    import os
    port = int(os.environ.get('CORS_PROXY_PORT', 8002))
    print(f'Secure multi-threaded Python CORS proxy running on http://localhost:{port}')
    print(f'Security features: IP validation, rate limiting, content-type restrictions')
    # Load allowed target patterns
    SecureCORSProxy.load_allowed_targets()
    server = ThreadingTCPServer(('0.0.0.0', port), SecureCORSProxy)
    server.serve_forever() 