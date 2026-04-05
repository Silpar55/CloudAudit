/**
 * CloudAudit — Authenticated app route: `recommendations.tsx`.
 * Requires login; lives under the main app shell (sidebar/header).
 */

import React, { useState, useMemo } from "react";
import { useRecommendations } from "../../../../hooks/useRecommendations";
import { useAwsAccount } from "../../../../context/AwsAccountContext";
import { useParams } from "react-router";
import { Button, SectionLoader, Card, Input } from "~/components/ui";
import { RecommendationCard, MetricTile } from "~/components/dashboard";
import ImplementationSuccessModal from "~/components/dashboard/ImplementationSuccessModal";
import { Zap, TrendingUp, CheckCircle, Target } from "lucide-react";
import type { ImplementationSummary } from "~/services/recommendationsService";

type RecFilter = "Pending" | "Dismissed" | "Resolved";

export default function RecommendationsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { account } = useAwsAccount();
  const { recommendations, loading, implement, resolve, dismiss, generate } =
    useRecommendations(teamId, account?.id);

  const [filter, setFilter] = useState<RecFilter>("Pending");
  const [query, setQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [implementFeedback, setImplementFeedback] =
    useState<ImplementationSummary | null>(null);
  const [implementModalOpen, setImplementModalOpen] = useState(false);

  // Derived state for the summary bar
  const pendingRecs = recommendations.filter((r) => r.status === "pending");
  const resolvedRecs = recommendations.filter((r) => r.status === "implemented");
  const dismissedRecs = recommendations.filter((r) => r.status === "dismissed");
  const automatedCount = pendingRecs.filter(
    (r) => r.resolution_type === "automated",
  ).length;

  const totalSavings = pendingRecs.reduce(
    (sum, r) =>
      sum + parseFloat((r.estimated_monthly_savings as string) || "0"),
    0,
  );

  // Tab + search filtering — default tab shows only actionable (pending) items
  const filteredRecs = useMemo(() => {
    let filtered = recommendations;
    if (filter === "Pending") {
      filtered = filtered.filter((r) => r.status === "pending");
    } else if (filter === "Dismissed") {
      filtered = filtered.filter((r) => r.status === "dismissed");
    } else if (filter === "Resolved") {
      filtered = filtered.filter((r) => r.status === "implemented");
    }

    const q = query.trim().toLowerCase();
    if (!q) return filtered;

    return filtered.filter((r) => {
      const haystack = [
        r.recommendation_type,
        r.description,
        r.resource_id,
        r.resource_type_display || r.resource_type,
        r.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [recommendations, filter, query]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await generate();
    setIsGenerating(false);
  };

  const emptyCopy =
    filter === "Pending"
      ? "No pending recommendations. Run a scan or check Resolved / Dismissed for history."
      : filter === "Dismissed"
        ? "Nothing dismissed yet."
        : "Nothing resolved yet.";

  return (
    <div className="p-8 mx-auto w-full space-y-8 max-w-7xl">
      <ImplementationSuccessModal
        isOpen={implementModalOpen}
        onClose={() => {
          setImplementModalOpen(false);
          setImplementFeedback(null);
        }}
        summary={implementFeedback}
      />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-500" />
            Optimization Recommendations
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pending items need a decision. Resolved and Dismissed are kept
            separate so your queue stays clear.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? "Running Engines..." : "Scan for New Savings"}
        </Button>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile
          label="Pending Actions"
          value={String(pendingRecs.length)}
          sub="Requires your attention"
          icon={<Target className="w-4 h-4" />}
        />
        <MetricTile
          label="Automated Fixes"
          value={String(automatedCount)}
          sub="1-Click eligible"
          icon={<Zap className="w-4 h-4 text-indigo-500" />}
        />
        <MetricTile
          label="Total Potential Savings"
          value={`$${totalSavings.toFixed(2)}/mo`}
          sub="Estimated reduction"
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
        {/* ── Filter Tabs ──────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-8 flex-wrap gap-y-2">
          {(
            [
              "Pending",
              "Dismissed",
              "Resolved",
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                filter === tab
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {tab}
              {tab === "Pending" && (
                <span className="ml-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 py-0.5 px-2 rounded-full text-xs">
                  {pendingRecs.length}
                </span>
              )}
              {tab === "Dismissed" && (
                <span className="ml-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-0.5 px-2 rounded-full text-xs">
                  {dismissedRecs.length}
                </span>
              )}
              {tab === "Resolved" && (
                <span className="ml-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 py-0.5 px-2 rounded-full text-xs">
                  {resolvedRecs.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="w-full md:w-96">
          <Input
            placeholder="Search recommendation, resource, status..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
          />
        </div>
      </div>

      {/* ── Content Area ─────────────────────────────────────────────────── */}
      {loading && recommendations.length === 0 ? (
        <div className="py-12">
          <SectionLoader />
        </div>
      ) : filteredRecs.length === 0 ? (
        <Card
          padding="lg"
          className="flex flex-col items-center justify-center text-center py-20 shadow-none border-gray-200 dark:border-gray-700"
        >
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {filter === "Pending"
              ? "Nothing in your queue"
              : "No items here"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-2">
            {emptyCopy}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredRecs.map((rec) => (
            <RecommendationCard
              key={rec.recommendation_id}
              recommendation={rec}
              onImplement={implement}
              onResolve={resolve}
              onDismiss={dismiss}
              teamId={teamId || ""}
              onImplementFeedback={(summary) => {
                setImplementFeedback(summary);
                setImplementModalOpen(true);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
