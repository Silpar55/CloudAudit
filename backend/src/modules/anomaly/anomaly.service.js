import * as anomalyModel from "./anomaly.model.js";
import * as recommendationsService from "../recommendations/recommendations.service.js";
import * as recommendationsModel from "../recommendations/recommendations.model.js";
import { AppError } from "#utils/helper/AppError.js";
import { insertAuditLog } from "#modules/audit/audit.model.js";
import {
  sendAnomalyAlertSlackMessage,
  sendMlAnalysisPassedSlackMessage,
} from "#utils/notifications/slack.js";
import {
  sendAnomalyAlertEmail,
  sendMlAnalysisPassedEmail,
} from "#utils/notifications/email.js";

export const getAnomalies = async (account) => {
  const anomalies = await anomalyModel.getAnomaliesByInternalId(account.id);

  if (!anomalies) throw new AppError("Failed to fetch anomalies", 500);

  return anomalies;
};

export const triggerAnalysis = async (
  account,
  userId,
  actorName = "User",
) => {
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

    // Slack notifications should reflect what the UI sees (DB truth),
    // not just the ML service "anomalies_detected" count.
    const dbAnomalies =
      (await anomalyModel.getAnomaliesByInternalId(account.id).catch(() => [])) ??
      [];
    const openAnomalies = dbAnomalies.filter(
      (a) => (a.status ?? "open") === "open",
    );

    const anomaliesDetected = openAnomalies.length;
    // Recommendations should match the UI (DB truth), not just the AI engine output.
    const dbRecommendations =
      (await recommendationsModel
        .getRecommendationsByInternalId(account.id)
        .catch(() => [])) ?? [];
    const recommendationsGenerated = dbRecommendations.length;

    // For operator-facing notifications, prefer the real AWS account number.
    const awsAccountNumber = account.aws_account_id || account.external_id || account.id;

    // Store a team-scoped event so every workspace member can see it in the UI.
    // Notification visibility is handled via a separate endpoint that uses
    // verifyTeamMembership (not verifyPermissions).
    try {
      await insertAuditLog(account.team_id, userId, "ML_ANALYSIS_RAN", {
        awsAccountNumber,
        anomaliesDetected,
        recommendationsGenerated,
        mlStatus: anomaliesDetected > 0 ? "anomalies_detected" : "no_anomalies",
      });
    } catch (auditError) {
      console.error("Failed to insert ML analysis audit log:", auditError);
    }

    if (anomaliesDetected > 0) {
      try {
        await sendAnomalyAlertSlackMessage({
          actorName,
          awsAccountNumber,
          anomaliesDetected,
          recommendationsGenerated,
        });
      } catch (slackError) {
        console.error(
          `Failed to send anomaly Slack alert for account ${awsAccountNumber}:`,
          slackError,
        );
      }

      try {
        await sendAnomalyAlertEmail({
          actorName,
          awsAccountNumber,
          anomaliesDetected,
          recommendationsGenerated,
        });
      } catch (emailError) {
        console.error(
          `Failed to send anomaly email alert for account ${awsAccountNumber}:`,
          emailError,
        );
      }
    } else {
      // Explicit success message so users know the ML run completed.
      try {
        await sendMlAnalysisPassedSlackMessage({
          actorName,
          awsAccountNumber,
          recommendationsGenerated,
        });
      } catch (slackError) {
        console.error(
          `Failed to send ML success Slack message for account ${awsAccountNumber}:`,
          slackError,
        );
      }

      try {
        await sendMlAnalysisPassedEmail({
          actorName,
          awsAccountNumber,
          recommendationsGenerated,
        });
      } catch (emailError) {
        console.error(
          `Failed to send ML success email message for account ${awsAccountNumber}:`,
          emailError,
        );
      }
    }

    return {
      message: "Analysis complete",
      anomalies_detected: anomaliesDetected,
      recommendations_generated: recommendationsGenerated,
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
