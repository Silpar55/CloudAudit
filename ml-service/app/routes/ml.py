"""
app/routes/ml.py
Anomaly analysis endpoint with model version switching.

Query param:  ?version=2  → Prophet v2.0 (default going forward)
              ?version=1  → Isolation Forest v1.0 (legacy, kept for comparison)
"""
import logging

from flask import Blueprint, request, jsonify
from ..services.anomaly_service import AnomalyService
from ..services.anomaly_service_v2 import AnomalyServiceV2

logger = logging.getLogger(__name__)

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
		status = result.get("status") if isinstance(result, dict) else None
		msg_preview = (
			(result.get("message") or "")[:300] if isinstance(result, dict) else ""
		)
		anom = (
			result.get("anomalies_detected") if isinstance(result, dict) else None
		)
		logger.info(
			"ML analyze finished account=%s version=%s status=%s anomalies_detected=%s msg=%s",
			aws_account_id,
			version,
			status,
			anom,
			msg_preview,
		)
		if status == "skipped":
			logger.warning(
				"ML analyze skipped account=%s version=%s reason=%s",
				aws_account_id,
				version,
				msg_preview or "unknown",
			)
		return jsonify(result), 200
	except Exception as e:
		logger.exception(
			"ML analyze failed account=%s version=%s",
			aws_account_id,
			version,
		)
		return jsonify({"error": str(e)}), 500
