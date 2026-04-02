import * as anomalyModel from "./anomaly.model.js";
import * as recommendationsService from "../recommendations/recommendations.service.js";
import * as recommendationsModel from "../recommendations/recommendations.model.js";
import * as authModel from "#modules/auth/auth.model.js";
import * as teamModel from "#modules/team/team.model.js";
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
import { logger } from "#utils/logger.js";

export const getAnomalies = async (account) => {
  const anomalies = await anomalyModel.getAnomaliesByInternalId(account.id);

  if (!anomalies) throw new AppError("Failed to fetch anomalies", 500);

  return anomalies;
};

/**
 * @param {object} options
 * @param {boolean} [options.silent] - If true (weekly cron), skip Slack/email to operators.
 * @param {boolean} [options.sendEmail] - If false, skip SES anomaly/success emails (user preference).
 */
const runMlAnalysisCore = async (
  account,
  userId,
  actorName = "User",
  { silent = false, sendEmail = true } = {},
) => {
  await anomalyModel.ensureFallbackResourceExists();

  const mlServiceUrl =
    process.env.ML_SERVICE_URL ||
    "http://127.0.0.1:5001/api/ml/analyze?version=2";

  const mlCtx = {
    component: "ml_bridge",
    internalAccountId: account.id,
    awsAccountNumber: account.aws_account_id || null,
    mlServiceUrl,
  };

  try {
    const response = await fetch(mlServiceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aws_account_id: account.id }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      logger.error("ML service HTTP failure", {
        ...mlCtx,
        status: response.status,
        bodyPreview: responseText.slice(0, 2000),
      });
      throw new Error(`ML Service Error`);
    }

    let mlData;
    try {
      mlData = JSON.parse(responseText);
    } catch (parseErr) {
      logger.error("ML service returned non-JSON", {
        ...mlCtx,
        bodyPreview: responseText.slice(0, 2000),
        error: parseErr?.message,
      });
      throw new Error(`ML Service Error`);
    }

    logger.info("ML service response", {
      ...mlCtx,
      mlStatus: mlData?.status,
      mlMessage: mlData?.message,
      anomaliesReportedByMl: mlData?.anomalies_detected,
      modelVersion: mlData?.model_version,
    });

    if (mlData?.status === "skipped") {
      logger.warn("ML analysis skipped (no anomalies written)", {
        ...mlCtx,
        mlMessage: mlData?.message,
        hint:
          "Usually empty daily_cost_summaries or fewer than 14 points per service/region — run CUR sync and check CUR Athena logs.",
      });
    }

    const recResult = await recommendationsService.runDetectionCycle(account);

    const dbAnomalies =
      (await anomalyModel.getAnomaliesByInternalId(account.id).catch(() => [])) ??
      [];
    const openAnomalies = dbAnomalies.filter(
      (a) => (a.status ?? "open") === "open",
    );

    const anomaliesDetected = openAnomalies.length;
    const dbRecommendations =
      (await recommendationsModel
        .getRecommendationsByInternalId(account.id)
        .catch(() => [])) ?? [];
    const recommendationsGenerated = dbRecommendations.length;

    const awsAccountNumber = account.aws_account_id || account.external_id || account.id;

    const shouldSlack = !silent;
    const shouldEmail = !silent && sendEmail;

    if (userId) {
      try {
        await insertAuditLog(account.team_id, userId, "ML_ANALYSIS_RAN", {
          awsAccountNumber,
          anomaliesDetected,
          recommendationsGenerated,
          mlStatus: anomaliesDetected > 0 ? "anomalies_detected" : "no_anomalies",
          ...(silent ? { scheduled: true } : {}),
        });
      } catch (auditError) {
        console.error("Failed to insert ML analysis audit log:", auditError);
      }
    }

    if (shouldSlack || shouldEmail) {
      if (anomaliesDetected > 0) {
        if (shouldSlack) {
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
        }

        if (shouldEmail) {
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
        }
      } else {
        if (shouldSlack) {
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
        }

        if (shouldEmail) {
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
      }
    }

    logger.info("ML pipeline: post-recommendations DB snapshot", {
      ...mlCtx,
      openAnomaliesInDb: anomaliesDetected,
      recommendationsInDb: recommendationsGenerated,
      recommendationCycleAiCount: recResult?.ai_recommendations_generated,
    });

    return {
      message: "Analysis complete",
      anomalies_detected: anomaliesDetected,
      recommendations_generated: recommendationsGenerated,
    };
  } catch (error) {
    logger.error("ML pipeline failed", {
      ...mlCtx,
      error: error?.message,
      stack: error?.stack,
    });
    throw new AppError("AI Analysis is currently unavailable.", 503);
  }
};

export const triggerAnalysis = async (
  account,
  userId,
  actorName = "User",
) => {
  const actor = await authModel.findUserById(userId);
  const sendEmail = actor?.email_notifications_enabled !== false;
  return runMlAnalysisCore(account, userId, actorName, {
    silent: false,
    sendEmail,
  });
};

/**
 * Weekly cron: refresh CUR then ML. Uses team owner for audit FK; no Slack/email spam.
 */
export const runScheduledWeeklyAccountAnalysis = async (account) => {
  const ownerId = await teamModel.getActiveTeamOwnerUserId(account.team_id);
  if (!ownerId) {
    logger.warn("Scheduled ML: no active team owner; skipping audit log", {
      teamId: account.team_id,
      internalAccountId: account.id,
    });
  }
  return runMlAnalysisCore(account, ownerId, "Weekly schedule", {
    silent: true,
    sendEmail: false,
  });
};

// ── Async analysis runner (prevents gateway timeouts) ─────────────────────────

const analysisRuns = new Map(); // accountInternalId -> status

const nowIso = () => new Date().toISOString();

export const getAnalysisStatus = (accountInternalId) => {
  return (
    analysisRuns.get(accountInternalId) ?? {
      state: "idle",
      startedAt: null,
      finishedAt: null,
      result: null,
      error: null,
    }
  );
};

export const triggerAnalysisAsync = async (account, userId, actorName = "User") => {
  const current = getAnalysisStatus(account.id);
  if (current.state === "running") {
    return {
      message: "Analysis already running",
      state: "running",
      startedAt: current.startedAt,
    };
  }

  analysisRuns.set(account.id, {
    state: "running",
    startedAt: nowIso(),
    finishedAt: null,
    result: null,
    error: null,
  });

  // Fire-and-forget analysis so the HTTP request returns quickly.
  setImmediate(async () => {
    try {
      const startedAt = analysisRuns.get(account.id)?.startedAt ?? nowIso();
      const result = await triggerAnalysis(account, userId, actorName);
      analysisRuns.set(account.id, {
        state: "completed",
        startedAt,
        finishedAt: nowIso(),
        result,
        error: null,
      });
    } catch (e) {
      const startedAt = analysisRuns.get(account.id)?.startedAt ?? nowIso();
      analysisRuns.set(account.id, {
        state: "failed",
        startedAt,
        finishedAt: nowIso(),
        result: null,
        error: e?.message || "Analysis failed",
      });
    }
  });

  return {
    message: "Analysis started",
    state: "running",
    startedAt: getAnalysisStatus(account.id).startedAt,
  };
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
