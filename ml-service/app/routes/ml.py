"""
app/routes/ml.py
Anomaly analysis endpoint with model version switching.

Query param:  ?version=2  → Prophet v2.0 (default going forward)
              ?version=1  → Isolation Forest v1.0 (legacy, kept for comparison)
"""
from flask import Blueprint, request, jsonify
from ..services.anomaly_service import AnomalyService
from ..services.anomaly_service_v2 import AnomalyServiceV2

ml_bp = Blueprint("ml", __name__)

# Instantiate both — they're stateless orchestrators
_service_v1 = AnomalyService()
_service_v2 = AnomalyServiceV2()


@ml_bp.post("/api/ml/analyze")
def analyze_costs():
    data = request.get_json()
    aws_account_id = data.get("aws_account_id")

    if not aws_account_id:
        return jsonify({"error": "aws_account_id is required"}), 400

    # Default to v2 — pass ?version=1 to run legacy Isolation Forest
    version = request.args.get("version", "2")
    service = _service_v1 if version == "1" else _service_v2

    try:
        result = service.run_analysis_for_account(aws_account_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500