import http.server
import socketserver
import os
import sys

PORT = 5500

web_dir = os.path.join(os.path.dirname(__file__), '..')
os.chdir(web_dir)

Handler = http.server.SimpleHTTPRequestHandler

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        httpd.serve_forever()
except OSError as e:
    print(f"Port {PORT} is likely busy. Error: {e}")
    print("Try running 'npm run dev' or checking if the server is already active.")
