import React, { useState } from "react";
import type { Recommendation } from "~/services/recommendationsService";
import { Alert, Badge, Button, Card } from "../ui";
import { Server, Sparkles, Zap, Cpu, Network, Activity } from "lucide-react";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onImplement: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  teamId: string;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onImplement,
  onDismiss,
  teamId,
}) => {
  const [loadingAction, setLoadingAction] = useState<
    "implement" | "dismiss" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  const handleAction = async (actionType: "implement" | "dismiss") => {
    setLoadingAction(actionType);
    setError(null);
    try {
      if (actionType === "implement")
        await onImplement(recommendation.recommendation_id);
      if (actionType === "dismiss")
        await onDismiss(recommendation.recommendation_id);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          `Failed to ${actionType} recommendation.`,
      );
    } finally {
      setLoadingAction(null);
    }
  };

  // Safe parsing for backend JSONB strings
  const metadataObj =
    typeof recommendation.metadata === "string"
      ? JSON.parse(recommendation.metadata || "{}")
      : recommendation.metadata || {};

  const actionSteps = Array.isArray(recommendation.action_steps)
    ? recommendation.action_steps
    : typeof recommendation.action_steps === "string"
      ? JSON.parse(recommendation.action_steps || "[]")
      : [];

  const isAutomated = recommendation.resolution_type === "automated";
  const isPending = recommendation.status === "pending";

  return (
    <Card
      padding="md"
      className="hover:shadow-md transition-shadow border-gray-200 dark:border-gray-700 flex flex-col"
    >
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        {/* Left Side: Details */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={isAutomated ? "info" : "warning"}>
              {isAutomated ? (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Automated
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Investigation
                </span>
              )}
            </Badge>
            {recommendation.status !== "pending" && (
              <Badge
                variant={
                  recommendation.status === "implemented"
                    ? "success"
                    : "default"
                }
              >
                {recommendation.status.toUpperCase()}
              </Badge>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {new Date(recommendation.created_at || Date.now()).toLocaleString(
                "en-CA",
                {
                  dateStyle: "long",
                },
              )}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {recommendation.recommendation_type}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Server className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                {recommendation.resource_id}
              </p>
            </div>
          </div>

          <div className="text-gray-700 dark:text-gray-300 text-sm">
            <p>{recommendation.description}</p>
          </div>

          {/* CloudWatch Evidence Snippet */}
          {isAutomated && Object.keys(metadataObj).length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-4 text-xs">
              {metadataObj.avg_cpu !== undefined && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                    <Cpu className="w-3 h-3" /> Avg CPU
                  </span>
                  <span className="font-mono font-medium text-gray-900 dark:text-gray-200">
                    {Number(metadataObj.avg_cpu).toFixed(2)}%
                  </span>
                </div>
              )}
              {metadataObj.avg_network_mb !== undefined && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                    <Network className="w-3 h-3" /> Avg Network
                  </span>
                  <span className="font-mono font-medium text-gray-900 dark:text-gray-200">
                    {Number(metadataObj.avg_network_mb).toFixed(2)} MB/d
                  </span>
                </div>
              )}
              {metadataObj.avg_connections !== undefined && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                    <Activity className="w-3 h-3" /> Connections
                  </span>
                  <span className="font-mono font-medium text-gray-900 dark:text-gray-200">
                    {Number(metadataObj.avg_connections).toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* LLM Action Steps Toggle */}
          {!isAutomated && actionSteps.length > 0 && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowSteps(!showSteps)}
              >
                {showSteps ? "Hide" : "View"} Investigation Steps
              </Button>
              {showSteps && (
                <div className="mt-3 p-4 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/30 rounded-lg text-sm">
                  <ul className="list-decimal pl-5 space-y-2">
                    {actionSteps.map((step: string, idx: number) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && <Alert variant="danger">{error}</Alert>}
        </div>

        {/* Right Side: Financial Math (Matches Anomaly Dashboard but Green) */}
        <div className="xl:text-right bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-100 dark:border-green-900/30 min-w-50">
          <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase tracking-wider mb-1">
            Est. Monthly Savings
          </p>
          <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
            $
            {parseFloat(
              recommendation.estimated_monthly_savings as string,
            ).toFixed(2)}
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between xl:justify-end gap-3 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Confidence:
              </span>
              <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                {(Number(recommendation.confidence_score) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-5 mt-auto border-t border-gray-100 dark:border-gray-800">
        {isPending && (
          <>
            {isAutomated ? (
              <Button
                onClick={() => handleAction("implement")}
                disabled={loadingAction !== null}
              >
                {loadingAction === "implement"
                  ? "Applying..."
                  : "1-Click Implement"}
              </Button>
            ) : (
              <Button
                onClick={() => handleAction("dismiss")}
                disabled={loadingAction !== null}
              >
                Mark as Resolved
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => handleAction("dismiss")}
              disabled={loadingAction !== null}
            >
              Dismiss
            </Button>
          </>
        )}

        {recommendation.anomaly_id && (
          <a
            href={`/teams/${teamId}/anomalies?id=${recommendation.anomaly_id}`}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 ml-auto font-medium transition-colors"
          >
            View Linked Anomaly &rarr;
          </a>
        )}
      </div>
    </Card>
  );
};

export default RecommendationCard;
