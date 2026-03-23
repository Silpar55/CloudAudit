import React, { useState } from "react";
import type { Recommendation } from "~/services/recommendationsService";
import { Alert, Badge, Button, Modal, InsightCard } from "../ui";
import {
  Server,
  Sparkles,
  Zap,
  FileSearch,
  X,
  Activity,
  ListChecks,
} from "lucide-react";

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
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const isAutomated = recommendation.resolution_type === "automated";
  const isPending = recommendation.status === "pending";

  const metadataObj = recommendation.metadata || {};
  const actionSteps = recommendation.action_steps || [];

  return (
    <>
      <InsightCard
        accentColor="green"
        icon={<Server />}
        title={recommendation.recommendation_type}
        subtitle={
          <div>
            <p className="font-mono font-medium text-indigo-600 dark:text-indigo-400 mb-2">
              Target:{" "}
              {recommendation.resource_id === "Unknown"
                ? "Account-Level"
                : recommendation.resource_id}
            </p>
            {/* Truncated description keeps the card clean and short */}
            <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
              {recommendation.description}
            </p>
            {error && (
              <Alert variant="danger" className="mt-2">
                {error}
              </Alert>
            )}

            {/* View Steps Button opens the Modal */}
            {!isAutomated && actionSteps.length > 0 && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold"
                  onClick={() => setIsModalOpen(true)}
                >
                  <FileSearch className="w-4 h-4 mr-2" />
                  View Investigation Details
                </Button>
              </div>
            )}
          </div>
        }
        badge={
          <div className="flex gap-2">
            <Badge variant={isAutomated ? "info" : "warning"}>
              {isAutomated ? (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Automated
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Analysis
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
          </div>
        }
        timestamp={new Date(
          recommendation.created_at || Date.now(),
        ).toLocaleString("en-CA", { dateStyle: "long" })}
        metadata={isAutomated ? metadataObj : null}
        metricsContent={
          <>
            <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase tracking-wider mb-1">
              Est. Monthly Savings
            </p>
            <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
              ${recommendation.estimated_monthly_savings}
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Confidence:
                </span>
                <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                  {recommendation.confidence_score_pct ||
                    `${(Number(recommendation.confidence_score) * 100).toFixed(0)}%`}
                </span>
              </div>
            </div>
          </>
        }
        footerContent={
          <>
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
          </>
        }
      />

      {/* MODAL: Investigation Steps (Now Wide & 2-Column) */}
      {!isAutomated && isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          maxWidth="max-w-5xl" // Expands the modal for a 2-column layout
        >
          <div className="relative">
            {/* Top Right Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-2 -right-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            <div className="pr-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-500" />
                AI Investigation Report
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                Resource:{" "}
                <span className="font-mono">{recommendation.resource_id}</span>
              </p>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Explanation */}
              <div className="flex flex-col">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  Diagnostic Explanation
                </h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-slate-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex-1">
                  {recommendation.description}
                </div>
              </div>

              {/* Right Column: Action Steps */}
              <div className="flex flex-col">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-green-500" />
                  Recommended Action Steps
                </h4>
                <div className="bg-indigo-50 dark:bg-indigo-900/10 text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-5 flex-1">
                  <ul className="list-decimal pl-5 space-y-4 text-sm">
                    {actionSteps.map((step: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-5">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Close Report
              </Button>
              {isPending && (
                <Button
                  onClick={() => {
                    handleAction("dismiss");
                    setIsModalOpen(false);
                  }}
                >
                  Mark as Resolved
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default RecommendationCard;
