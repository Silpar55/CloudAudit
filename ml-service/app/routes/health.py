"""
app/routes/health.py
Health check — now also confirms Prophet/cmdstan are importable.
"""
from flask import Blueprint, jsonify
import numpy as np
import pandas as pd
import sklearn
import prophet  # will raise ImportError if Prophet isn't installed correctly

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "cloudaudit-ml",
        "dependencies": {
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
            "prophet": prophet.__version__,
        }
    }), 200