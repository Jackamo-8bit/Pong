import os, sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
os.chdir(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

class NoCacheHandler(SimpleHTTPRequestHandler):
    # Always revalidate, so edits show up on reload instead of stale cached CSS/JS
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

print(f"Serving on http://localhost:{port}")
HTTPServer(("", port), NoCacheHandler).serve_forever()
