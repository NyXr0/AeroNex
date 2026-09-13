"""Entry point: python run_api.py [port]

Port resolution order: explicit CLI arg > PORT env var (most cloud hosts -
Render, Railway, Fly.io - inject this and expect the app to bind to it) >
8000 for local dev.
"""
import os
import sys

from app.api.server import serve

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 8000))
    serve(port)
