import os
import sys

# Ensure repository root and backend directory are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Initialize database on cold start if running on Vercel
try:
    from backend.database import init_db
    init_db()
except Exception as e:
    print(f"[Vercel Cold Start DB Note]: {e}")

from backend.server import HetaApiHandler

# Vercel Python Serverless handler
class handler(HetaApiHandler):
    pass

