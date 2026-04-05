"""
CloudAudit — WSGI entry for Gunicorn.

Production processes import `app` from this module. Gunicorn binds per Dockerfile/compose;
see root README and ml-service/README for stack context.
"""
from app import create_app

app = create_app()
