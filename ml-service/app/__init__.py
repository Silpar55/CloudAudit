"""
CloudAudit — Flask application factory (`create_app`).

Registers health and ML blueprints. Part of the ML microservice; see ml-service/README.md.
"""
from flask import Flask
from .routes.health import health_bp
from .routes.ml import ml_bp


def create_app() -> Flask:
    app = Flask(__name__)

    # --- Register blueprints ---
    app.register_blueprint(health_bp)
    app.register_blueprint(ml_bp)

    return app