#!/usr/bin/env python3
"""
Simple proxy server to bypass CORS for Valhalla API
Run this instead of the basic HTTP server for direct Valhalla access
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import json
import os
import mimetypes

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
            self.serve_static_file()
    
    def serve_static_file(self):
        try:
            # Get the directory where the script is located
            script_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Determine file path and strip query parameters
            if self.path == '/':
                file_path = os.path.join(script_dir, 'index.html')
                clean_path = 'index.html'
            else:
                # Remove query parameters (e.g., app.js?v=2.1.0 -> app.js)
                clean_path = self.path.lstrip('/').split('?')[0]
                file_path = os.path.join(script_dir, clean_path)
            
            # Security check - prevent directory traversal
            if '..' in file_path or not file_path.startswith(script_dir):
                self.send_error(403, "Forbidden")
                return
            
            # Debug logging
            print(f"📁 Original path: {self.path}")
            print(f"📁 Clean path: {clean_path}")
            print(f"📁 Serving file: {file_path}")
            print(f"📁 File exists: {os.path.exists(file_path)}")
            
            # Check if file exists
            if not os.path.exists(file_path):
                self.send_error(404, f"File not found: {file_path}")
                return
            
            # Get MIME type
            mime_type, _ = mimetypes.guess_type(file_path)
            if mime_type is None:
                mime_type = 'application/octet-stream'
            
            # Read and serve file
            with open(file_path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")
    
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
    print(f"📁 Serving files from: {os.path.dirname(os.path.abspath(__file__))}")
    server.serve_forever()
