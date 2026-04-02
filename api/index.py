"""
Vercel entrypoint — redirects visitors to the live SnapLabs deployment.
Streamlit requires a persistent WebSocket server; use Railway or Render instead.
Update LIVE_URL below once deployed on Railway/Render.
"""
from http.server import BaseHTTPRequestHandler

LIVE_URL = "https://snaplabs.up.railway.app"  # <-- update after Railway deploy

REDIRECT_HTML = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url={LIVE_URL}">
  <title>SnapLabs – Redirecting</title>
  <style>
    body {{ background: #0d0d1a; color: #a78bfa; font-family: sans-serif;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; margin: 0; }}
    a {{ color: #818cf8; }}
  </style>
</head>
<body>
  <div style="text-align:center">
    <h1>⚡ SnapLabs</h1>
    <p>Redirecting to the live app...</p>
    <p><a href="{LIVE_URL}">{LIVE_URL}</a></p>
  </div>
</body>
</html>"""


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(302)
        self.send_header("Location", LIVE_URL)
        self.end_headers()
        self.wfile.write(REDIRECT_HTML.encode())

    def log_message(self, *args):
        pass
