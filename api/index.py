"""Vercel entry point for the FastAPI backend.

Vercel's Python runtime looks for a module-level ASGI app in files under
/api. The real application lives in backend/ so it can also be run locally
with uvicorn; this file only puts it on the import path and re-exports it.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'backend'))

from main import app  # noqa: E402

# Vercel discovers this symbol.
__all__ = ['app']
