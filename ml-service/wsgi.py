"""
wsgi.py
Gunicorn entrypoint — production WSGI server calls this to get the Flask app.
"""
from app import create_app

app = create_app()
