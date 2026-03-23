import React, { useState, useMemo } from "react";
import { useRecommendations } from "../../../../hooks/useRecommendations";
import { useAwsAccount } from "../../../../context/AwsAccountContext";
import { useParams } from "react-router";
import { Button, SectionLoader, Card } from "~/components/ui";
import { RecommendationCard, MetricTile } from "~/components/dashboard";
import { Zap, TrendingUp, CheckCircle, Target } from "lucide-react";

export default function RecommendationsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { account } = useAwsAccount();
  const { recommendations, loading, implement, dismiss, generate } =
    useRecommendations(teamId, account?.id);

  const [filter, setFilter] = useState<"All" | "EC2" | "RDS" | "Dismissed">(
    "All",
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // Derived state for the summary bar
  const pendingRecs = recommendations.filter((r) => r.status === "pending");
  const automatedCount = pendingRecs.filter(
    (r) => r.resolution_type === "automated",
  ).length;

  const totalSavings = pendingRecs.reduce(
    (sum, r) =>
      sum + parseFloat((r.estimated_monthly_savings as string) || "0"),
    0,
  );

  // Tab Filtering Logic
  const filteredRecs = useMemo(() => {
    if (filter === "Dismissed") {
      return recommendations.filter((r) => r.status === "dismissed");
    }

    let filtered = pendingRecs;
    if (filter === "EC2")
      filtered = filtered.filter((r) => r.resource_type === "ec2_instance");
    if (filter === "RDS")
      filtered = filtered.filter((r) => r.resource_type === "rds_instance");
    return filtered;
  }, [recommendations, filter, pendingRecs]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await generate();
    setIsGenerating(false);
  };

  return (
    <div className="p-8 mx-auto w-full space-y-8 max-w-7xl">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-500" />
            Optimization Recommendations
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review and apply automated right-sizing and AI-driven cost-saving
            actions.
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

      {/* ── Filter Tabs ──────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-8">
        {["All", "EC2", "RDS", "Dismissed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              filter === tab
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {tab}
            {tab === "All" && (
              <span className="ml-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-0.5 px-2 rounded-full text-xs">
                {pendingRecs.length}
              </span>
            )}
          </button>
        ))}
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
            Architecture Fully Optimized
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-2">
            There are currently no active recommendations matching your filter.
            Great job keeping your cloud lean!
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredRecs.map((rec) => (
            <RecommendationCard
              key={rec.recommendation_id}
              recommendation={rec}
              onImplement={implement}
              onDismiss={dismiss}
              teamId={teamId || ""}
            />
          ))}
        </div>
      )}
    </div>
  );
}
