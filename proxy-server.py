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
import ssl

# Create SSL context that doesn't verify certificates (for development)
ssl._create_default_https_context = ssl._create_unverified_context

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/valhalla/'):
            # Extract the actual Valhalla URL and JSON data
            path_parts = self.path.split('?', 1)
            valhalla_path = path_parts[0].replace('/valhalla/', '')
            json_param = path_parts[1] if len(path_parts) > 1 else ''
            
            # Extract the JSON data from the json parameter
            json_data = ''
            if json_param.startswith('json='):
                json_data = json_param[5:]  # Remove 'json=' prefix
                # URL decode the JSON data
                import urllib.parse
                json_data = urllib.parse.unquote(json_data)
            
            valhalla_url = f'https://valhalla1.openstreetmap.de/{valhalla_path}?json={urllib.parse.quote(json_data)}'
            
            print(f"🛣️ Proxy request: {self.path}")
            print(f"🛣️ Valhalla URL: {valhalla_url}")
            print(f"🛣️ JSON data: {json_data}")
            
            # Valhalla API uses GET requests with JSON parameter
            try:
                # Create GET request with JSON parameter
                req = urllib.request.Request(valhalla_url)
                req.add_header('User-Agent', 'BikeRoutePlanner/1.0')
                
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    print(f"🛣️ Response status: {response.status}")
                    print(f"🛣️ Response content type: {response.headers.get('Content-Type', 'Unknown')}")
                    print(f"🛣️ Response length: {len(data)} bytes")
                    
                    # Debug: Show first 200 characters of response
                    response_preview = data[:200].decode('utf-8', errors='ignore')
                    print(f"🛣️ Response preview: {response_preview}")
                    
                    # Send response back with CORS headers
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                    self.end_headers()
                    self.wfile.write(data)
                    
            except Exception as e:
                print(f"🛣️ Proxy error: {e}")
                self.send_error(500, f"Proxy error: {str(e)}")
        else:
            # Serve static files
            self.serve_static_file()
    
    def do_POST_Valhalla(self, valhalla_url, json_data):
        try:
            # Create POST request with JSON data
            import urllib.request
            req = urllib.request.Request(valhalla_url, method='POST')
            req.add_header('User-Agent', 'BikeRoutePlanner/1.0')
            req.add_header('Content-Type', 'application/json')
            req.data = json_data.encode('utf-8')
            
            with urllib.request.urlopen(req) as response:
                data = response.read()
                print(f"🛣️ Response status: {response.status}")
                print(f"🛣️ Response content type: {response.headers.get('Content-Type', 'Unknown')}")
                print(f"🛣️ Response length: {len(data)} bytes")
                
                # Debug: Show first 200 characters of response
                response_preview = data[:200].decode('utf-8', errors='ignore')
                print(f"🛣️ Response preview: {response_preview}")
                
                # Send response back with CORS headers
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                self.wfile.write(data)
                
        except Exception as e:
            print(f"🛣️ Proxy error: {e}")
            self.send_error(500, f"Proxy error: {str(e)}")
    
    def do_POST(self):
        # Handle POST requests for Valhalla
        if self.path.startswith('/valhalla/'):
            # Extract the actual Valhalla URL
            valhalla_url = self.path.replace('/valhalla/', 'https://valhalla.openstreetmap.de/')
            
            print(f"🛣️ POST Proxy request: {self.path}")
            print(f"🛣️ Valhalla URL: {valhalla_url}")
            
            # Get the POST data
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            print(f"🛣️ POST data: {post_data}")
            
            # Forward the POST request
            self.do_POST_Valhalla(valhalla_url, post_data)
        else:
            self.send_error(404, "Not Found")
    
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
