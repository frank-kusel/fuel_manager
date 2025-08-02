#!/usr/bin/env python3
"""
Simple HTTP server for Fuel Manager PWA
Run this to serve the application properly and avoid CORS issues
"""

import http.server
import socketserver
import os
import webbrowser
import socket
from pathlib import Path

# Set the port (will try 8000, then find next available)
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

def find_free_port(start_port=8000):
    """Find the next available port starting from start_port"""
    port = start_port
    while port < start_port + 100:  # Try up to 100 ports
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            port += 1
    return start_port  # Fallback

def main():
    Handler = MyHTTPRequestHandler
    
    # Find available port
    available_port = find_free_port(PORT)
    if available_port != PORT:
        print(f"Port {PORT} is busy, using port {available_port} instead")
    
    with socketserver.TCPServer(("", available_port), Handler) as httpd:
        print(f"\n🚧 Fuel Manager Development Server 🚧")
        print(f"  Local:   http://localhost:{available_port}")
        print(f"  Network: http://127.0.0.1:{available_port}")
        print(f"\nServing from: {os.getcwd()}")
        print(f"Press Ctrl+C to stop the server\n")
        
        # Open browser automatically
        try:
            print("Opening browser...")
            webbrowser.open(f'http://localhost:{available_port}')
        except Exception as e:
            print(f"Could not open browser automatically: {e}")
            print(f"Please manually open: http://localhost:{available_port}")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped. Thank you! 👋")

if __name__ == "__main__":
    main()