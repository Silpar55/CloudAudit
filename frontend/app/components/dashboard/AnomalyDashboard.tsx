import React, { useMemo } from "react";
import { useParams } from "react-router";
import { useAwsAccount } from "~/context/AwsAccountContext";
import { useGetAnomalies } from "~/hooks/useAnomaly";

// UI Components
import { Card, Badge, Spinner, Alert } from "~/components/ui";
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

const AnomalyDashboard = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { account } = useAwsAccount();
  const awsAccountInternalId = account?.id;

  // Uses the exact same cache key as the Sidebar Zero extra network requests.
  const {
    data: anomalies = [],
    isLoading,
    isError,
  } = useGetAnomalies(teamId, awsAccountInternalId);

  console.log(anomalies);

  // ── Derived KPI Data ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = anomalies.length;
    const critical = anomalies.filter((a: any) => a.severity >= 80).length;

    // Calculate total unexpected spend (Expected Cost * Deviation Percentage)
    const totalImpact = anomalies.reduce((sum: number, a: any) => {
      const excess = Number(a.expected_cost) * (Number(a.deviation_pct) / 100);
      return sum + excess;
    }, 0);

    return { total, critical, totalImpact };
  }, [anomalies]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getSeverityProps = (severity: number) => {
    if (severity >= 80)
      return { variant: "danger", label: "Critical", color: "text-red-500" };
    if (severity >= 50)
      return { variant: "warning", label: "Warning", color: "text-yellow-500" };
    return { variant: "info", label: "Low", color: "text-blue-500" };
  };

  // ── Loading & Error States ────────────────────────────────────────────────
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

  return (
    <div className="p-8 mx-auto w-full space-y-8 max-w-7xl">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-500" />
          AI Intelligence: Anomalies
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Machine learning detections for unusual spending spikes and irregular
          resource usage.
        </p>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile
          label="Total Detections"
          value={String(kpis.total)}
          sub="All time"
          icon={<Target className="w-4 h-4" />}
        />
        <MetricTile
          label="Critical Alerts"
          value={String(kpis.critical)}
          sub="Severity 80+"
          icon={
            <AlertTriangle
              className={`w-4 h-4 ${kpis.critical > 0 ? "text-red-500" : ""}`}
            />
          }
        />
        <MetricTile
          label="Est. Financial Impact"
          value={fmt(kpis.totalImpact)}
          sub="Unexpected overspend"
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* ── Empty State ──────────────────────────────────────────────────── */}
      {anomalies.length === 0 ? (
        <Card
          padding="lg"
          className="flex flex-col items-center justify-center text-center py-20 shadow-none"
        >
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Your infrastructure is healthy
          </h2>
          <p className="text-sm text-gray-500 max-w-md mt-2">
            The machine learning engine has not detected any irregular spending
            patterns or anomalies in your current billing data.
          </p>
        </Card>
      ) : (
        /* ── Anomaly Feed ────────────────────────────────────────────────── */
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-2">
            Detection Feed
          </h3>

          {anomalies.map((anomaly: any) => {
            const { variant, label, color } = getSeverityProps(
              anomaly.severity,
            );
            const actualCost =
              Number(anomaly.expected_cost) *
              (1 + Number(anomaly.deviation_pct) / 100);

            return (
              <Card
                key={anomaly.anomaly_id}
                padding="md"
                className="hover:shadow-md transition-shadow border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left Side: Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant={variant as any}>
                        {label} (Score: {anomaly.severity})
                      </Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {new Date(anomaly?.detected_at).toLocaleString(
                          "en-CA",
                          {
                            dateStyle: "long",
                            timeStyle: "medium",
                          },
                        )}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-gray-400" />
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">
                          {anomaly?.resource_id === "Unknown" ||
                          !anomaly.resource_id
                            ? "Account-Level Resource"
                            : anomaly.resource_id}
                        </h4>
                      </div>

                      {/* Root Cause Details Parser */}
                      {anomaly.root_cause_details && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                          <span className="font-semibold block mb-1">
                            AI Diagnostic:
                          </span>
                          {typeof anomaly.root_cause_details === "string"
                            ? anomaly.root_cause_details
                            : JSON.stringify(anomaly.root_cause_details)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Financial Math */}
                  <div className="sm:text-right bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-900/30 min-w-50">
                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase tracking-wider mb-1">
                      Deviation
                    </p>
                    <p className={`text-2xl font-bold font-mono ${color}`}>
                      +{Number(anomaly.deviation_pct).toFixed(1)}%
                    </p>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Expected:</span>
                        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                          {fmt(Number(anomaly.expected_cost))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Actual:</span>
                        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                          {fmt(actualCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnomalyDashboard;
