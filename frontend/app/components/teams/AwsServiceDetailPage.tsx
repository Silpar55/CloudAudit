import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Link, useParams } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Boxes,
  RefreshCw,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useGetCachedCostData, useSyncCostAndUsage } from "~/hooks/useAws";
import { useAwsAccount } from "~/context/AwsAccountContext";
import { useRecommendations } from "~/hooks/useRecommendations";
import { useGetAnomalies } from "~/hooks/useAnomaly";
import {
  getServiceMetaForSlug,
  resolveService,
  recommendationMatchesSlug,
  anomalyMatchesSlug,
} from "~/utils/awsServiceCatalog";
import { fmt, fmtDate, fmtShort, daysAgo, today } from "~/utils/format";
import { Alert, Button, Card, SectionLoader, Spinner } from "~/components/ui";
import {
  ChartTooltip,
  DateRangePicker,
  MetricTile,
  RecommendationCard,
} from "~/components/dashboard";
import ImplementationSuccessModal from "~/components/dashboard/ImplementationSuccessModal";
import type { ImplementationSummary } from "~/services/recommendationsService";

const AwsServiceDetailPage = () => {
  const { teamId, slug } = useParams<{ teamId: string; slug: string }>();
  const { account } = useAwsAccount();
  const accId = account?.id;

  const [startDate, setStartDate] = useState(() => daysAgo(30));
  const [endDate, setEndDate] = useState(() => today());
  const [implementFeedback, setImplementFeedback] =
    useState<ImplementationSummary | null>(null);
  const [implementModalOpen, setImplementModalOpen] = useState(false);

  const meta = useMemo(() => getServiceMetaForSlug(slug ?? ""), [slug]);
  const Icon = meta.Icon;

  const {
    data: rows = [],
    isLoading,
    isFetching,
    dataUpdatedAt,
  } = useGetCachedCostData(teamId, accId, startDate, endDate);

  const { mutate: runSync, isPending: isSyncing } = useSyncCostAndUsage(
    teamId,
    accId,
    startDate,
    endDate,
  );

  const hasAttemptedAutoSync = useRef(false);
  useEffect(() => {
    hasAttemptedAutoSync.current = false;
  }, [startDate, endDate]);

  useEffect(() => {
    if (
      !isLoading &&
      !isFetching &&
      rows.length === 0 &&
      accId &&
      !hasAttemptedAutoSync.current
    ) {
      hasAttemptedAutoSync.current = true;
      runSync();
    }
  }, [isLoading, isFetching, rows.length, accId, runSync]);

  const serviceRows = useMemo(
    () => rows.filter((r) => resolveService(r.service).slug === slug),
    [rows, slug],
  );

  const rawCeNames = useMemo(
    () => [...new Set(serviceRows.map((r) => r.service))],
    [serviceRows],
  );

  const {
    recommendations,
    loading: recLoading,
    implement,
    resolve,
    dismiss,
  } = useRecommendations(teamId, accId);

  const { data: anomalies = [] } = useGetAnomalies(teamId, accId);

  const filteredRecs = useMemo(
    () =>
      recommendations.filter(
        (r) =>
          r.status === "pending" && recommendationMatchesSlug(r, slug ?? ""),
      ),
    [recommendations, slug],
  );

  const filteredAnomalies = useMemo(
    () =>
      (anomalies as any[])
        .filter((a) => !a.status || a.status === "open")
        .filter((a) => anomalyMatchesSlug(a, slug ?? "", rawCeNames)),
    [anomalies, slug, rawCeNames],
  );

  const totalCost = useMemo(
    () => serviceRows.reduce((s, r) => s + Number(r.unblended_cost ?? 0), 0),
    [serviceRows],
  );

  const sharePct = useMemo(() => {
    const all = rows.reduce((s, r) => s + Number(r.unblended_cost ?? 0), 0);
    if (all <= 0 || totalCost <= 0) return 0;
    return (totalCost / all) * 100;
  }, [rows, totalCost]);

  const byRegion = useMemo(() => {
    const map: Record<string, number> = {};
    serviceRows.forEach((r) => {
      map[r.region] = (map[r.region] || 0) + Number(r.unblended_cost);
    });
    return Object.entries(map)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [serviceRows]);

  const dailyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    serviceRows.forEach((r) => {
      const day = r.time_period_start.split("T")[0];
      map[day] = (map[day] || 0) + Number(r.unblended_cost);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date: fmtDate(date), cost }));
  }, [serviceRows]);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const handleRefresh = useCallback(() => {
    runSync();
  }, [runSync]);

  if (!teamId || !slug) return null;

  if (!accId) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Alert variant="warning" title="AWS account">
          Connect an AWS account to see cost data for this service.
        </Alert>
      </div>
    );
  }

  if (isLoading && serviceRows.length === 0) {
    return (
      <div className="p-8">
        <SectionLoader />
      </div>
    );
  }

  return (
    <div className="p-8 mx-auto w-full max-w-7xl space-y-8">
      <ImplementationSuccessModal
        isOpen={implementModalOpen}
        onClose={() => {
          setImplementModalOpen(false);
          setImplementFeedback(null);
        }}
        summary={implementFeedback}
      />
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
            <Icon className="w-7 h-7 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {meta.label}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
              Spend trend, regional split, and AI recommendations scoped to this
              AWS service (from Cost Explorer cache).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChangeStart={setStartDate}
            onChangeEnd={setEndDate}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isSyncing || isFetching}
            icon={
              <RefreshCw
                className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
              />
            }
          >
            Refresh costs
          </Button>
        </div>
      </div>

      {serviceRows.length === 0 && !isFetching ? (
        <Card
          padding="lg"
          className="border-dashed border-gray-300 dark:border-slate-600"
        >
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Boxes className="w-10 h-10 text-gray-400 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                No cost recorded for {meta.label}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                In this date range there is no cached usage for this service.
                Try extending the range on the Cost Explorer page or run a sync
                from Overview.
              </p>
              <Link
                to={`/teams/${teamId}/cost-explorer`}
                className="inline-flex items-center gap-1 text-sm font-medium text-aws-orange mt-3 hover:underline"
              >
                Open Cost Explorer
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile
          label={`${meta.label} spend`}
          value={fmt(totalCost)}
          sub={lastUpdated ? `Cache updated ${lastUpdated}` : "Estimated"}
          icon={<Icon className="w-4 h-4" />}
        />
        <MetricTile
          label="Share of workspace"
          value={`${sharePct.toFixed(1)}%`}
          sub="Vs. all services in range"
          icon={<Sparkles className="w-4 h-4" />}
        />
        <MetricTile
          label="Regions"
          value={String(byRegion.length)}
          sub="With recorded usage"
          icon={<Boxes className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg" className="shadow-lg">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Daily spend
          </h2>
          {dailyTrend.length === 0 ? (
            <p className="text-sm text-gray-500">No series data.</p>
          ) : (
            <div className="h-64 min-w-0">
              <ResponsiveContainer width="100%" height={256} minWidth={0}>
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="svcCost" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#f97316"
                        stopOpacity={0.35}
                      />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-slate-700"
                  />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => fmtShort(v)}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    name="Spend"
                    dataKey="cost"
                    stroke="#ea580c"
                    fillOpacity={1}
                    fill="url(#svcCost)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card padding="lg" className="shadow-lg">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            By region
          </h2>
          {byRegion.length === 0 ? (
            <p className="text-sm text-gray-500">No regional breakdown.</p>
          ) : (
            <div className="h-64  min-w-0 min-h-0">
              <ResponsiveContainer width="100%" height={256} minWidth={0}>
                <BarChart
                  data={byRegion}
                  layout="vertical"
                  margin={{ left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-slate-700"
                  />
                  <XAxis type="number" tickFormatter={(v) => fmtShort(v)} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) =>
                      value != null ? [fmt(value), "Cost"] : ["—", "Cost"]
                    }
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Bar dataKey="cost" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
              Recommendations
            </h2>
            <Link
              to={`/teams/${teamId}/recommendations`}
              className="text-xs font-medium text-aws-orange hover:underline inline-flex items-center gap-1"
            >
              All
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recLoading ? (
            <div className="flex justify-center py-12">
              <Spinner
                size={32}
                className="border-indigo-500 border-t-transparent"
              />
            </div>
          ) : filteredRecs.length === 0 ? (
            <Card
              padding="lg"
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              No pending recommendations tagged for {meta.label}.
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRecs.slice(0, 5).map((r) => (
                <RecommendationCard
                  key={r.recommendation_id}
                  recommendation={r}
                  onImplement={implement}
                  onResolve={resolve}
                  onDismiss={dismiss}
                  teamId={teamId}
                  onImplementFeedback={(summary) => {
                    setImplementFeedback(summary);
                    setImplementModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Anomalies
            </h2>
            <Link
              to={`/teams/${teamId}/anomalies`}
              className="text-xs font-medium text-aws-orange hover:underline inline-flex items-center gap-1"
            >
              All
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {filteredAnomalies.length === 0 ? (
            <Card
              padding="lg"
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              No anomalies linked to this service in the current model output.
            </Card>
          ) : (
            <ul className="space-y-3">
              {filteredAnomalies.slice(0, 5).map((a: any) => (
                <li key={a.anomaly_id}>
                  <Card
                    padding="md"
                    className="border border-gray-200 dark:border-slate-700"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white font-mono truncate">
                      {a.resource_id || "—"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Deviation +{Number(a.deviation_pct ?? 0).toFixed(1)}% ·{" "}
                      {a.detected_at
                        ? new Date(a.detected_at).toLocaleDateString()
                        : ""}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AwsServiceDetailPage;
