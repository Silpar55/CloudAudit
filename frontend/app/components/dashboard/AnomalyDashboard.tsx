import React, { useMemo } from "react";
import { useParams } from "react-router";
import { useAwsAccount } from "~/context/AwsAccountContext";
import { useGetAnomalies } from "~/hooks/useAnomaly";
import { Badge, Spinner, Alert } from "~/components/ui";
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

const AnomalyDashboard = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { account } = useAwsAccount();
  const awsAccountInternalId = account?.id;

  const {
    data: anomalies = [],
    isLoading,
    isError,
  } = useGetAnomalies(teamId, awsAccountInternalId);

  console.log(anomalies);

  const kpis = useMemo(() => {
    const total = anomalies.length;
    const critical = anomalies.filter((a: any) => a.severity >= 80).length;
    // Expected cost and deviation are already formatted as numbers by our backend formatter!
    const totalImpact = anomalies.reduce((sum: number, a: any) => {
      const excess = a.expected_cost * (a.deviation_pct / 100);
      return sum + excess;
    }, 0);
    return { total, critical, totalImpact };
  }, [anomalies]);

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

  return (
    <div className="p-8 mx-auto w-full space-y-8 max-w-7xl">
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

      {anomalies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Your infrastructure is healthy
          </h2>
          <p className="text-sm text-gray-500 max-w-md mt-2 text-center">
            The machine learning engine has not detected any irregular spending
            patterns in your current billing data.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-2">
            Detection Feed
          </h3>

          {anomalies.map((anomaly: any) => {
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
                  <Badge variant={variant as any}>
                    {label} (Score: {anomaly.severity})
                  </Badge>
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
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnomalyDashboard;
