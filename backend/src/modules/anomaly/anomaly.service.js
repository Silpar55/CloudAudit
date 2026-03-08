import * as anomalyModel from "./anomaly.model.js";
import { AppError } from "#utils/helper/AppError.js";

export const getAnomalies = async (internalId) => {
  const anomalies = await anomalyModel.getAnomaliesByAccountId(internalId);

  if (!anomalies) throw new AppError("Failed to fetch anomalies", 500);

  return anomalies;
};

export const triggerAnalysis = async (internalId) => {
  const mlServiceUrl =
    process.env.ML_SERVICE_URL || "http://127.0.0.1:5001/api/ml/analyze";

  try {
    // Call the Python ML Service securely via the Node.js backend proxy
    const response = await fetch(mlServiceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aws_account_id: internalId }), // Send internal UUID
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ML Service Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("ML Service Connection Failed:", error.message);

    // GRACEFUL DEGRADATION: Ensure the frontend doesn't crash if Python is offline
    throw new AppError(
      "AI Analysis is currently unavailable. Please try again later.",
      503,
    );
  }
};
