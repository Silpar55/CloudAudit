import React, { useMemo, useState } from "react";
import { useParams } from "react-router";
import { useAwsAccount } from "~/context/AwsAccountContext";
import {
  useGetAnomalies,
  useDismissAnomaly,
  useResolveAnomaly,
} from "~/hooks/useAnomaly";
import { Badge, Spinner, Alert, Button, Input } from "~/components/ui";
import { InsightCard } from "~/components/ui";
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Server,
  Target,
} from "lucide-react";
import { fmt } from "~/utils/format";
import { MetricTile } from ".";

type AnomalyFilter = "Open" | "Dismissed" | "Resolved";

const AnomalyDashboard = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { account } = useAwsAccount();
  const awsAccountInternalId = account?.id;

  const {
    data: anomalies = [],
    isLoading,
    isError,
  } = useGetAnomalies(teamId, awsAccountInternalId);

  const dismissAnomaly = useDismissAnomaly();
  const resolveAnomaly = useResolveAnomaly();
  const [filter, setFilter] = useState<AnomalyFilter>("Open");
  const [query, setQuery] = useState("");

  const openAnomalies = useMemo(() => {
    return (anomalies as any[]).filter(
      (a) => !a.status || a.status === "open",
    );
  }, [anomalies]);

  const dismissedAnomalies = useMemo(() => {
    return (anomalies as any[]).filter((a) => a.status === "dismissed");
  }, [anomalies]);

  const resolvedAnomalies = useMemo(() => {
    return (anomalies as any[]).filter((a) => a.status === "resolved");
  }, [anomalies]);

  const kpis = useMemo(() => {
    const critical = openAnomalies.filter((a: any) => a.severity >= 80).length;
    const totalImpact = openAnomalies.reduce((sum: number, a: any) => {
      const excess = a.expected_cost * (a.deviation_pct / 100);
      return sum + excess;
    }, 0);
    return {
      openCount: openAnomalies.length,
      critical,
      totalImpact,
    };
  }, [openAnomalies]);

  const filteredAnomalies = useMemo(() => {
    let rows = anomalies as any[];
    if (filter === "Open") {
      rows = rows.filter((a) => !a.status || a.status === "open");
    } else if (filter === "Dismissed") {
      rows = rows.filter((a) => a.status === "dismissed");
    } else if (filter === "Resolved") {
      rows = rows.filter((a) => a.status === "resolved");
    }

    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((a) => {
      const haystack = [
        a.resource_id,
        a.status,
        a.model_version,
        JSON.stringify(a.root_cause_details ?? {}),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [anomalies, filter, query]);

  const getSeverityProps = (severity: number) => {
    if (severity >= 80)
      return {
        variant: "danger",
        label: "Critical",
        color: "text-red-600 dark:text-red-400",
        accent: "red" as const,
      };
    if (severity >= 50)
      return {
        variant: "warning",
        label: "Warning",
        color: "text-yellow-600 dark:text-yellow-400",
        accent: "yellow" as const,
      };
    return {
      variant: "info",
      label: "Low",
      color: "text-blue-600 dark:text-blue-400",
      accent: "default" as const,
    };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 w-full">
        <Spinner size={40} className="border-indigo-500 border-t-transparent" />
        <p className="text-sm text-gray-400">Loading AI detections...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 mx-auto w-full">
        <Alert
          variant="danger"
          title="Error Loading Anomalies"
          dismissible={false}
        >
          Failed to fetch anomaly data from the server. Please try again later.
        </Alert>
      </div>
    );
  }

  const emptyCopy =
    filter === "Open"
      ? "No open anomalies. Check Dismissed or Resolved for history."
      : filter === "Dismissed"
        ? "Nothing dismissed yet."
        : "Nothing resolved yet.";

  return (
    <div className="p-8 mx-auto w-full space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-500" />
          AI Intelligence: Anomalies
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Open items need your review. Dismissed and Resolved are grouped
          separately so the feed stays actionable.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile
          label="Open detections"
          value={String(kpis.openCount)}
          sub="Needs review"
          icon={<Target className="w-4 h-4" />}
        />
        <MetricTile
          label="Critical (open)"
          value={String(kpis.critical)}
          sub="Severity 80+"
          icon={
            <AlertTriangle
              className={`w-4 h-4 ${kpis.critical > 0 ? "text-red-500" : ""}`}
            />
          }
        />
        <MetricTile
          label="Est. impact (open)"
          value={fmt(kpis.totalImpact)}
          sub="Unexpected overspend"
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
        <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-8 flex-wrap gap-y-2">
          {(["Open", "Dismissed", "Resolved"] as const).map((tab) => (
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
              {tab === "Open" && (
                <span className="ml-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 py-0.5 px-2 rounded-full text-xs">
                  {openAnomalies.length}
                </span>
              )}
              {tab === "Dismissed" && (
                <span className="ml-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-0.5 px-2 rounded-full text-xs">
                  {dismissedAnomalies.length}
                </span>
              )}
              {tab === "Resolved" && (
                <span className="ml-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 py-0.5 px-2 rounded-full text-xs">
                  {resolvedAnomalies.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="w-full md:w-96">
          <Input
            placeholder="Search resource, reason, status..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
          />
        </div>
      </div>

      {filteredAnomalies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {filter === "Open" ? "Nothing to review" : "No items here"}
          </h2>
          <p className="text-sm text-gray-500 max-w-md mt-2 text-center">
            {emptyCopy}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-2">
            Detection Feed
          </h3>

          {filteredAnomalies.map((anomaly: any) => {
            const { variant, label, color, accent } = getSeverityProps(
              anomaly.severity,
            );
            const actualCost =
              anomaly.expected_cost * (1 + anomaly.deviation_pct / 100);

            return (
              <InsightCard
                key={anomaly.anomaly_id}
                accentColor={accent}
                icon={<Server />}
                title={
                  anomaly?.resource_id === "Unknown" || !anomaly.resource_id
                    ? "Account-Level Resource"
                    : anomaly.resource_id
                }
                badge={
                  <div className="flex items-center gap-2">
                    <Badge variant={variant as any}>
                      {label} (Score: {anomaly.severity})
                    </Badge>
                    {anomaly.status && anomaly.status !== "open" && (
                      <Badge
                        variant={
                          anomaly.status === "resolved" ? "success" : "default"
                        }
                      >
                        {anomaly.status.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                }
                timestamp={new Date(anomaly?.detected_at).toLocaleString(
                  "en-CA",
                  { dateStyle: "long", timeStyle: "short" },
                )}
                // We pass the root cause details directly since the backend parses them now!
                metadata={anomaly.root_cause_details}
                metricsContent={
                  <>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                      Deviation
                    </p>
                    <p className={`text-3xl font-bold font-mono ${color}`}>
                      +{Number(anomaly?.deviation_pct ?? 0).toFixed(1)}%
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Expected:</span>
                        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                          {fmt(anomaly.expected_cost)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Actual:</span>
                        <span className="font-mono font-medium text-gray-900 dark:text-white">
                          {fmt(actualCost)}
                        </span>
                      </div>
                    </div>
                  </>
                }
                footerContent={
                  anomaly.status === "open" && teamId && awsAccountInternalId ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          dismissAnomaly.mutate({
                            teamId,
                            accId: awsAccountInternalId,
                            anomalyId: anomaly.anomaly_id,
                          })
                        }
                        disabled={
                          dismissAnomaly.isPending || resolveAnomaly.isPending
                        }
                      >
                        Dismiss
                      </Button>
                      <Button
                        onClick={() =>
                          resolveAnomaly.mutate({
                            teamId,
                            accId: awsAccountInternalId,
                            anomalyId: anomaly.anomaly_id,
                          })
                        }
                        disabled={
                          dismissAnomaly.isPending || resolveAnomaly.isPending
                        }
                      >
                        Mark as Resolved
                      </Button>
                    </div>
                  ) : null
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnomalyDashboard;
