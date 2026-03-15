/**
 * Safely parses JSON strings. If the data is already an object or null, returns it as-is.
 */
export const parseJSONSafe = (data) => {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  }
  return data;
};

/**
 * Ensures costs are formatted to standard 2 decimal places for UI.
 */
export const formatCost = (value) => {
  if (value === null || value === undefined) return 0.0;
  return Number(parseFloat(value).toFixed(2));
};

/**
 * Translates raw DB enums into clean UI text.
 */
export const formatResourceType = (type) => {
  if (!type) return "Unknown";
  const map = {
    ec2_instance: "EC2 Instance",
    rds_instance: "RDS Database",
    s3_bucket: "S3 Bucket",
    other: "Other Resource",
  };
  // Fallback: capitalize and replace underscores
  return (
    map[type] ||
    type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
};

export const formatAnomalyForUI = (anomaly) => {
  if (!anomaly) return anomaly;
  return {
    ...anomaly,
    expected_cost: formatCost(anomaly.expected_cost),
    deviation_pct: formatCost(anomaly.deviation_pct),
    // Safely parse JSON strings so the frontend doesn't have to call JSON.parse()
    root_cause_details: parseJSONSafe(anomaly.root_cause_details),
  };
};

export const formatRecommendationForUI = (rec) => {
  if (!rec) return rec;
  return {
    ...rec,
    estimated_monthly_savings: formatCost(rec.estimated_monthly_savings),
    // Provide a dedicated string for the UI without destroying the raw enum needed by frontend logic
    resource_type_display: formatResourceType(rec.resource_type),
    confidence_score_pct: `${formatCost(parseFloat(rec.confidence_score || 0) * 100)}%`,
    metadata: parseJSONSafe(rec.metadata),
    action_steps: parseJSONSafe(rec.action_steps),
  };
};
