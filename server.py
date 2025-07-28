#!/usr/bin/env python3
"""
Simple HTTP server for Fleet Manager PWA
Run this to serve the application properly and avoid CORS issues
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Set the port
PORT = 8000

# Change to the directory containing the files
os.chdir(Path(__file__).parent)

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Set proper MIME types
        if self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript')
        elif self.path.endswith('.json'):
            self.send_header('Content-Type', 'application/json')
        elif self.path.endswith('.wasm'):
            self.send_header('Content-Type', 'application/wasm')
        
        super().end_headers()

def main():
    Handler = MyHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Fleet Manager Server running at:")
        print(f"  Local:   http://localhost:{PORT}")
        print(f"  Network: http://127.0.0.1:{PORT}")
        print(f"\nServing from: {os.getcwd()}")
        print(f"Press Ctrl+C to stop the server")
        
        # Open browser automatically
        try:
            webbrowser.open(f'http://localhost:{PORT}')
        except Exception as e:
            print(f"Could not open browser automatically: {e}")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()