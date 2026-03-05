"""
app/routes/health.py
Health check endpoint — used by Docker Compose healthcheck and the Node.js backend
to verify the ML service is alive before sending workloads.
"""
from flask import Blueprint, jsonify
import numpy as np
import pandas as pd
import sklearn

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    """
    Lightweight liveness + dependency probe.
    Returns 200 if Flask is up and core ML libraries import correctly.
    Docker Compose healthcheck hits this endpoint before marking the
    container healthy.
    """
    return jsonify({
        "status": "ok",
        "service": "cloudaudit-ml",
        "dependencies": {
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
        }
    }), 200