import * as recommendationsModel from "./recommendations.model.js";
import * as anomalyModel from "../anomaly/anomaly.model.js";
import { getTemporaryCredentials } from "#utils/aws/sts.js";
import { AppError } from "#utils/helper/AppError.js";
import * as cw from "#utils/aws/cloudwatch.js";
import * as ec2 from "#utils/aws/ec2.js";
import * as rds from "#utils/aws/rds.js";

// Configurable Constants
const LOOKBACK_DAYS = 14;
const EC2_CPU_THRESHOLD = 5.0; // %
const EC2_NET_THRESHOLD = 5 * 1024 * 1024; // 5MB/day
const RDS_CPU_THRESHOLD = 20.0; // %
const RDS_CONN_THRESHOLD_PCT = 0.1; // 10% of max

export const getRecommendations = async (account) => {
  const recommendations =
    await recommendationsModel.getRecommendationsByInternalId(account.id);
  if (!recommendations)
    throw new AppError("Failed to fetch recommendations", 500);
  return recommendations;
};

export const runDetectionCycle = async (account) => {
  const anomalies =
    (await anomalyModel.getAnomaliesByInternalId(account.id)) || [];

  // 1. Run deterministic, automated engines first
  await detectUnusedEC2(account, anomalies);
  await detectOverProvisionedRDS(account, anomalies);

  // 2. Run AI engine on remaining orphans
  const aiCount = await detectManualAIRecommendations(account);

  return {
    message: "Recommendation detection cycle completed successfully.",
    ai_recommendations_generated: aiCount,
  };
};

export const detectUnusedEC2 = async (account, anomalies) => {
  const credentials = await getTemporaryCredentials(account).catch(() => null);
  const cwAvailable = credentials
    ? await cw.isCloudWatchAvailable(credentials)
    : false;

  const resources = await recommendationsModel.getActiveResourcesByService(
    account.id,
    "AmazonEC2",
    LOOKBACK_DAYS,
  );

  for (const resource of resources) {
    const { resource_id, total_recent_cost } = resource;
    const linkedAnomaly = anomalies.find((a) => a.resource_id === resource_id);
    let isIdle = false;
    let confidence = 0;
    let metadata = { lookback_days: LOOKBACK_DAYS };

    if (cwAvailable) {
      // Real AWS Path
      const cpu = await cw.getEC2CpuUtilization(
        credentials,
        resource_id,
        LOOKBACK_DAYS,
      );
      const net = await cw.getEC2NetworkIO(
        credentials,
        resource_id,
        LOOKBACK_DAYS,
      );

      if (cpu && net) {
        metadata = {
          ...metadata,
          avg_cpu: cpu.avg,
          avg_network_mb: (net.avgInBytes + net.avgOutBytes) / (1024 * 1024),
        };
        if (
          cpu.avg < EC2_CPU_THRESHOLD &&
          net.avgInBytes + net.avgOutBytes < EC2_NET_THRESHOLD
        ) {
          isIdle = true;
          confidence = 0.95; // High confidence due to CloudWatch metrics
        }
      }
    } else {
      // Mocked Account / CUR-only fallback path
      // Infer idleness if there's cost but low/no associated BoxUsage metrics in recent days
      // (Simplified heuristic for the mock environment)
      const monthlyProratedCost =
        (parseFloat(total_recent_cost) / LOOKBACK_DAYS) * 30;
      if (linkedAnomaly && linkedAnomaly.deviation_pct > 100) {
        isIdle = true;
        confidence = 0.7; // Lower confidence, relying on anomaly flags and CUR
        metadata = {
          ...metadata,
          cur_inferred: true,
          recent_cost: total_recent_cost,
        };
      }
    }

    if (isIdle) {
      const estimatedSavings =
        (parseFloat(total_recent_cost) / LOOKBACK_DAYS) * 30; // 1 month projection
      const description =
        linkedAnomaly && linkedAnomaly.root_cause_details?.cause
          ? `EC2 Instance appears idle. Anomaly note: ${linkedAnomaly.root_cause_details.cause}`
          : `EC2 instance ${resource_id} has average CPU < 5% and low network I/O over ${LOOKBACK_DAYS} days.`;

      await recommendationsModel.upsertRecommendation({
        aws_account_id: account.id,
        resource_id: resource_id,
        resource_type: "ec2_instance",
        anomaly_id: linkedAnomaly ? linkedAnomaly.anomaly_id : null,
        recommendation_type: "Rightsize/Stop",
        description,
        estimated_monthly_savings: estimatedSavings,
        confidence_score: confidence,
        metadata: JSON.stringify(metadata),
      });
    }
  }
};

export const detectOverProvisionedRDS = async (account, anomalies) => {
  const credentials = await getTemporaryCredentials(account).catch(() => null);
  const cwAvailable = credentials
    ? await cw.isCloudWatchAvailable(credentials)
    : false;

  const resources = await recommendationsModel.getActiveResourcesByService(
    account.id,
    "AmazonRDS",
    LOOKBACK_DAYS,
  );

  for (const resource of resources) {
    const { resource_id, total_recent_cost } = resource;
    const linkedAnomaly = anomalies.find((a) => a.resource_id === resource_id);
    let isOverProvisioned = false;
    let confidence = 0;
    let metadata = { lookback_days: LOOKBACK_DAYS };

    if (cwAvailable) {
      const cpu = await cw.getRDSCpuUtilization(
        credentials,
        resource_id,
        LOOKBACK_DAYS,
      );
      const conns = await cw.getRDSDatabaseConnections(
        credentials,
        resource_id,
        LOOKBACK_DAYS,
      );

      if (cpu && conns) {
        metadata = {
          ...metadata,
          avg_cpu: cpu.avg,
          avg_connections: conns.avg,
          max_connections: conns.max,
        };
        if (
          cpu.avg < RDS_CPU_THRESHOLD &&
          conns.avg < conns.max * RDS_CONN_THRESHOLD_PCT
        ) {
          isOverProvisioned = true;
          confidence = 0.85;
        }
      }
    } else {
      // Mock fallback
      if (linkedAnomaly) {
        isOverProvisioned = true;
        confidence = 0.65;
        metadata = { ...metadata, cur_inferred: true };
      }
    }

    if (isOverProvisioned) {
      // Assume 50% savings by down-tiering the instance class
      const estimatedSavings =
        (parseFloat(total_recent_cost) / LOOKBACK_DAYS) * 30 * 0.5;
      const description = `RDS database ${resource_id} is consistently underutilized (CPU < ${RDS_CPU_THRESHOLD}%). Consider modifying to a smaller instance class.`;

      await recommendationsModel.upsertRecommendation({
        aws_account_id: account.id,
        resource_id: resource_id,
        resource_type: "rds_instance",
        anomaly_id: linkedAnomaly ? linkedAnomaly.anomaly_id : null,
        recommendation_type: "Downsize",
        description,
        estimated_monthly_savings: estimatedSavings,
        confidence_score: confidence,
        metadata: JSON.stringify(metadata),
      });
    }
  }
};

export const implementRecommendation = async (
  account,
  recommendationId,
  userId,
) => {
  const rec = await recommendationsModel.getRecommendationById(
    recommendationId,
    account.id,
  );
  if (!rec) throw new AppError("Recommendation not found", 404);
  if (rec.status !== "pending")
    throw new AppError(
      `Cannot implement. Current status is ${rec.status}`,
      400,
    );

  const credentials = await getTemporaryCredentials(account).catch(() => null);
  let metadata =
    typeof rec.metadata === "string"
      ? JSON.parse(rec.metadata)
      : rec.metadata || {};

  // Pre-flight & Implementation
  if (rec.resource_type === "ec2_instance") {
    if (credentials) {
      const recentMaxCpu = await cw.getRecentEC2CpuMax(
        credentials,
        rec.resource_id,
        2,
      );
      if (recentMaxCpu && recentMaxCpu > 20.0) {
        // Abort if CPU spiked over 20% recently
        throw new AppError(
          `Aborted: EC2 instance CPU spiked to ${recentMaxCpu.toFixed(1)}% in the last 2 hours.`,
          409,
        );
      }
      await ec2.stopEC2Instance(credentials, rec.resource_id);
    }
  } else if (rec.resource_type === "rds_instance") {
    if (credentials) {
      const dbDetails = await rds.getRDSInstanceDetails(
        credentials,
        rec.resource_id,
      );
      metadata.previous_instance_class = dbDetails.DBInstanceClass;
      // Heuristic: move down one size (simplified for example, e.g., db.r5.xlarge -> db.r5.large)
      const newClass = dbDetails.DBInstanceClass.replace("xlarge", "large");
      await rds.modifyRDSInstanceClass(credentials, rec.resource_id, newClass);
    }
  }

  // Update State
  const updatedRec = await recommendationsModel.updateRecommendationStatus(
    recommendationId,
    "implemented",
    { implementedBy: userId, metadata },
  );

  // Audit Log
  await recommendationsModel.logAuditAction(
    account.team_id,
    userId,
    "IMPLEMENT_RECOMMENDATION",
    {
      recommendation_id: recommendationId,
      resource_id: rec.resource_id,
      action: rec.recommendation_type,
    },
  );

  return {
    message: "Recommendation implemented successfully",
    recommendation: updatedRec,
  };
};

export const rollbackRecommendation = async (
  account,
  recommendationId,
  userId,
) => {
  const rec = await recommendationsModel.getRecommendationById(
    recommendationId,
    account.id,
  );
  if (!rec) throw new AppError("Recommendation not found", 404);
  if (rec.status !== "implemented")
    throw new AppError(
      "Only implemented recommendations can be rolled back",
      400,
    );

  const credentials = await getTemporaryCredentials(account).catch(() => null);
  const metadata =
    typeof rec.metadata === "string"
      ? JSON.parse(rec.metadata)
      : rec.metadata || {};

  if (rec.resource_type === "ec2_instance" && credentials) {
    await ec2.startEC2Instance(credentials, rec.resource_id);
  } else if (rec.resource_type === "rds_instance" && credentials) {
    if (!metadata.previous_instance_class)
      throw new AppError("Missing previous instance class for rollback", 400);
    await rds.modifyRDSInstanceClass(
      credentials,
      rec.resource_id,
      metadata.previous_instance_class,
    );
  }

  const updatedRec = await recommendationsModel.updateRecommendationStatus(
    recommendationId,
    "rolled_back",
    { rollbackReason: "User requested rollback via Cloud Audit dashboard" },
  );

  await recommendationsModel.logAuditAction(
    account.team_id,
    userId,
    "ROLLBACK_RECOMMENDATION",
    {
      recommendation_id: recommendationId,
      resource_id: rec.resource_id,
    },
  );

  return {
    message: "Rollback initiated successfully",
    recommendation: updatedRec,
  };
};

export const dismissRecommendation = async (account, recommendationId) => {
  const rec = await recommendationsModel.getRecommendationById(
    recommendationId,
    account.id,
  );
  if (!rec || rec.status !== "pending")
    throw new AppError("Recommendation cannot be dismissed", 400);

  const updatedRec = await recommendationsModel.updateRecommendationStatus(
    recommendationId,
    "dismissed",
  );
  return { message: "Recommendation dismissed", recommendation: updatedRec };
};

// LYZR agent
const fetchAIInvestigation = async (internalAccountId, anomaly) => {
  const lyzrApiKey = process.env.LYZR_API_KEY;
  const agentId = process.env.LYZR_AGENT_ID;

  if (!lyzrApiKey || !agentId) {
    console.warn("Lyzr credentials missing. Skipping AI analysis.");
    return null;
  }

  const payload = {
    service: anomaly.service,
    region: anomaly.region,
    expected_cost: anomaly.expected_cost,
    deviation_percentage: anomaly.deviation_pct,
    root_cause_details: anomaly.root_cause_details,
  };

  try {
    const response = await fetch(process.env.LYZR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": lyzrApiKey,
      },
      body: JSON.stringify({
        agent_id: agentId,
        user_id: internalAccountId, // Tracking usage by team account ID
        session_id: anomaly.anomaly_id, // Keeps conversation context tied to the anomaly
        message: JSON.stringify(payload),
      }),
    });

    if (!response.ok)
      throw new Error(`Lyzr API responded with ${response.status}`);

    const data = await response.json();
    // Lyzr returns the agent's response in the `response` field
    const aiResponseText = data.response;

    // Parse the strict JSON schema we enforced in the prompt
    return JSON.parse(aiResponseText);
  } catch (error) {
    console.error(
      `AI Analysis failed for anomaly ${anomaly.anomaly_id}:`,
      error,
    );
    return null;
  }
};

export const detectManualAIRecommendations = async (account) => {
  const orphans = await recommendationsModel.getOrphanedAnomalies(account.id);

  let newGenerated = 0;

  for (const anomaly of orphans) {
    const aiAdvice = await fetchAIInvestigation(account.id, anomaly);

    console.log(aiAdvice);
    if (aiAdvice && aiAdvice.explanation && aiAdvice.action_steps) {
      // Determine a safe resource type fallback
      let resourceType = "other";
      if (anomaly.service === "AmazonEC2") resourceType = "ec2_instance";
      if (anomaly.service === "AmazonRDS") resourceType = "rds_instance";
      if (anomaly.service === "AmazonS3") resourceType = "s3_bucket";

      await recommendationsModel.upsertRecommendation({
        aws_account_id: account.id,
        // FIX: Match the actual DB fallback value
        resource_id: anomaly.resource_id || "Unknown",
        resource_type: resourceType,
        anomaly_id: anomaly.anomaly_id,
        recommendation_type: "Investigate",
        description: aiAdvice.explanation,
        estimated_monthly_savings: parseFloat(anomaly.expected_cost) * 30,
        confidence_score: 0.7,
        metadata: JSON.stringify({
          ai_generated: true,
          original_deviation: anomaly.deviation_pct,
        }),
        resolution_type: "manual",
        action_steps: aiAdvice.action_steps,
      });

      newGenerated++;
    }
  }

  return newGenerated;
};
