import http.server
import socketserver
import os

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow requests from your React Frontend (Vite)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

PORT = 8000
print(f"--- HLS CORS SERVER ---")
print(f"Serving files from: {os.getcwd()}")
print(f"URL: http://localhost:{PORT}/stream.m3u8")
print(f"-----------------------")

handler = CORSRequestHandler
with socketserver.TCPServer(("", PORT), handler) as httpd:
    httpd.serve_forever()
