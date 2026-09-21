# Local preview server for the site — same as `python -m http.server`, except it
# tells the browser never to cache anything.
#
# Why this exists: python's stock http.server sends no cache headers at all, so
# browsers apply "heuristic freshness" and happily re-serve a stale index.html
# and stale js/sims/*.js even after a reload. You edit a sim, refresh, and see
# the old one — with no error to tell you why. This sends no-store on every
# response so what you see is always what is on disk.
#
#   python .claude/serve.py            -> http://localhost:8123/
#   python .claude/serve.py 9000       -> a different port
#
# Serves the repo root (this file's parent's parent), whatever directory you
# happen to run it from.

import sys
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # keep the console quiet except for errors
        if not args or str(args[0]).startswith(("GET", "HEAD")):
            return
        super().log_message(fmt, *args)


if __name__ == "__main__":
    handler = partial(NoCacheHandler, directory=ROOT)
    with ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"serving {ROOT}")
        print(f"  http://localhost:{PORT}/                 (doodle hub)")
        print(f"  http://localhost:{PORT}/astronomy/       (the astronomy page)")
        print("no-cache is ON — edit a sim, hit refresh, see the change. Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped.")
