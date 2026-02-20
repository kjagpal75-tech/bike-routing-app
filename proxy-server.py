#!/usr/bin/env python3
"""
Simple proxy server to bypass CORS for Valhalla API
Run this instead of the basic HTTP server for direct Valhalla access
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import json

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/valhalla/'):
            # Extract the actual Valhalla URL
            valhalla_url = self.path.replace('/valhalla/', 'https://valhalla.openstreetmap.de/')
            
            try:
                # Make request to Valhalla
                req = urllib.request.Request(valhalla_url)
                req.add_header('User-Agent', 'BikeRoutePlanner/1.0')
                
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    
                    # Send response back with CORS headers
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                    self.end_headers()
                    self.wfile.write(data)
                    
            except Exception as e:
                self.send_error(500, f"Proxy error: {str(e)}")
        else:
            # Serve static files
            super().do_GET()
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    port = 8000
    server = HTTPServer(('localhost', port), ProxyHandler)
    print(f"🚀 Proxy server running on http://localhost:{port}")
    print("🛣️ Valhalla API proxied at /valhalla/")
    print("🌐 App available at http://localhost:{port}")
    server.serve_forever()
