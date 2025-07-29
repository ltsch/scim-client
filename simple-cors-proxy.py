# simple-cors-proxy.py
# Minimal Python CORS proxy for local development
# Requires: pip install requests

from http.server import BaseHTTPRequestHandler
from socketserver import ThreadingTCPServer
import requests
import time

class CORSProxy(BaseHTTPRequestHandler):
    def do_GET(self):
        url = self.path[1:]
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
        url = self.path[1:]
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
    print(f'Multi-threaded Python CORS proxy running on http://localhost:{port}')
    server = ThreadingTCPServer(('0.0.0.0', port), CORSProxy)
    server.serve_forever() 