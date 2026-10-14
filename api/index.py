"""
Punto de entrada de la API para Vercel (función serverless de Python).

Reutiliza tal cual la aplicación FastAPI de backend/server.py, de modo que
todas las rutas /api/... (por ejemplo /api/analyze-pdf) funcionan igual que
en el servidor original, pero en el mismo dominio que la web.
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from server import app  # noqa: E402,F401  (Vercel busca la variable "app")
