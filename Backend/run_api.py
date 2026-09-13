"""Entry point: python run_api.py [port]"""
import sys
from app.api.server import serve

if __name__ == "__main__":
    serve(int(sys.argv[1]) if len(sys.argv) > 1 else 8000)
