from flask import Blueprint, request, jsonify
from ..services.anomaly_service import AnomalyService

ml_bp = Blueprint("ml", __name__)
anomaly_service = AnomalyService()


@ml_bp.post("/api/ml/analyze")
def analyze_costs():
	data = request.get_json()
	aws_account_id = data.get("aws_account_id")

	if not aws_account_id:
		return jsonify({"error": "aws_account_id is required"}), 400

	try:
		result = anomaly_service.run_analysis_for_account(aws_account_id)
		return jsonify(result), 200
	except Exception as e:
		return jsonify({"error": str(e)}), 500