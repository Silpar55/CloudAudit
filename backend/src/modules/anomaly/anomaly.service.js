import * as anomalyModel from "./anomaly.model.js";
import * as recommendationsService from "../recommendations/recommendations.service.js";
import { AppError } from "#utils/helper/AppError.js";

export const getAnomalies = async (account) => {
  const anomalies = await anomalyModel.getAnomaliesByInternalId(account.id);

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

export const dismissAnomaly = async (account, anomalyId, statusNote) => {
  const anomaly = await anomalyModel.getAnomalyById(anomalyId, account.id);
  if (!anomaly) throw new AppError("Anomaly not found", 404);

  let updated;
  try {
    updated = await anomalyModel.updateAnomalyStatus(
      anomalyId,
      account.id,
      "dismissed",
      statusNote,
    );
  } catch (err) {
    throw new AppError(
      "Anomaly status lifecycle is not initialized. Please run DB migration 004.",
      409,
    );
  }
  if (!updated) throw new AppError("Failed to dismiss anomaly", 500);
  return updated;
};

export const resolveAnomaly = async (account, anomalyId, statusNote) => {
  const anomaly = await anomalyModel.getAnomalyById(anomalyId, account.id);
  if (!anomaly) throw new AppError("Anomaly not found", 404);

  let updated;
  try {
    updated = await anomalyModel.updateAnomalyStatus(
      anomalyId,
      account.id,
      "resolved",
      statusNote,
    );
  } catch (err) {
    throw new AppError(
      "Anomaly status lifecycle is not initialized. Please run DB migration 004.",
      409,
    );
  }
  if (!updated) throw new AppError("Failed to resolve anomaly", 500);
  return updated;
};
