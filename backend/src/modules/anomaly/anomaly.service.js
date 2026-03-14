import * as anomalyModel from "./anomaly.model.js";
import * as recommendationsService from "../recommendations/recommendations.service.js";
import { AppError } from "#utils/helper/AppError.js";

export const getAnomalies = async (account) => {
  const anomalies = await anomalyModel.getAnomaliesByAccountId(account.id);

  if (!anomalies) throw new AppError("Failed to fetch anomalies", 500);

  return anomalies;
};

export const triggerAnalysis = async (account) => {
  await anomalyModel.ensureFallbackResourceExists();

  const mlServiceUrl =
    process.env.ML_SERVICE_URL ||
    "http://127.0.0.1:5001/api/ml/analyze?version=2";

  try {
    const response = await fetch(mlServiceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aws_account_id: account.id }),
    });

    if (!response.ok) throw new Error(`ML Service Error`);
    const mlData = await response.json();

    const recResult = await recommendationsService.runDetectionCycle(account);

    return {
      message: "Analysis complete",
      anomalies_detected: mlData.anomalies_detected || 0,
      recommendations_generated: recResult.new_recommendations || 0,
    };
  } catch (error) {
    throw new AppError("AI Analysis is currently unavailable.", 503);
  }
};
