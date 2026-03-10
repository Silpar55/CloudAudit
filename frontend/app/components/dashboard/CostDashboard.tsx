"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  RefreshCw,
  DollarSign,
  TrendingUp,
  Globe,
  Calendar,
  AlertCircle,
  CloudOff,
  Sparkles,
  Info,
} from "lucide-react";
import {
  useCheckCurStatus,
  useGetCachedCostData,
  useSyncCostAndUsage,
} from "~/hooks/useAws";
import { useAwsAccount } from "~/context/AwsAccountContext";
import { useParams } from "react-router";

// ─── Refactored Component Imports ─────────────────────────────────────────────
import {
  fmt,
  fmtShort,
  fmtDate,
  daysAgo,
  today,
  colorFor,
} from "~/utils/format";
import { ChartTooltip, CostTable, DateRangePicker, MetricTile } from ".";

const CostDashboard = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { account, refreshAccount } = useAwsAccount();
  const awsAccountInternalId = account?.id;

  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today());

  const hasAttemptedAutoSync = useRef(false);

  const {
    data: rows = [],
    isLoading,
    isFetching,
    isError,
    error,
    dataUpdatedAt,
  } = useGetCachedCostData(teamId, awsAccountInternalId, startDate, endDate);
  const {
    mutate: runSync,
    isPending: isSyncing,
    isError: isSyncError,
    error: syncError,
  } = useSyncCostAndUsage(teamId, awsAccountInternalId, startDate, endDate);

  const { mutate: checkCur, isPending: isCheckingCur } = useCheckCurStatus();

  // ── Silent S3 Status Check on Dashboard Load ──────────────────
  useEffect(() => {
    if (account?.cur_status === "pending") {
      checkCur(
        { teamId: teamId!, accId: awsAccountInternalId! },
        {
          onSuccess: (data) => {
            // If the backend S3 check says it's ready, refresh the context to unlock the UI!
            if (data.status === "active") refreshAccount();
          },
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run exactly once when the component mounts

  const handleManualStatusCheck = () => {
    checkCur(
      { teamId: teamId!, accId: awsAccountInternalId! },
      {
        onSuccess: (data) => {
          if (data.status === "active") refreshAccount();
        },
      },
    );
  };

  const handleRefresh = useCallback(() => {
    hasAttemptedAutoSync.current = true;
    runSync();
  }, [runSync]);

  const isBusy = isFetching || isSyncing;

  useEffect(() => {
    if (
      !isLoading &&
      !isFetching &&
      rows.length === 0 &&
      !hasAttemptedAutoSync.current
    ) {
      hasAttemptedAutoSync.current = true;
      runSync();
    }
  }, [isLoading, isFetching, rows.length, runSync]);

  useEffect(() => {
    hasAttemptedAutoSync.current = false;
  }, [startDate, endDate]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const totalCost = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.unblended_cost), 0),
    [rows],
  );

  const byService = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      map[r.service] = (map[r.service] || 0) + Number(r.unblended_cost);
    });
    return Object.entries(map)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [rows]);

  const byRegion = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      map[r.region] = (map[r.region] || 0) + Number(r.unblended_cost);
    });
    return Object.entries(map)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [rows]);

  const dailyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const day = r.time_period_start.split("T")[0];
      map[day] = (map[day] || 0) + Number(r.unblended_cost);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date: fmtDate(date), cost }));
  }, [rows]);

  const topServices = useMemo(
    () => byService.slice(0, 5).map((s) => s.name),
    [byService],
  );

  const dailyByService = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    rows.forEach((r) => {
      if (!topServices.includes(r.service)) return;
      const day = r.time_period_start.split("T")[0];
      if (!map[day]) map[day] = {};
      map[day][r.service] =
        (map[day][r.service] || 0) + Number(r.unblended_cost);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, services]) => ({ date: fmtDate(date), ...services }));
  }, [rows, topServices]);

  const topService = byService[0];
  const topRegion = byRegion[0];
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // ── Reusable Banner Component ─────────────────────────────────────────────
  const PendingBanner = () => {
    if (account?.cur_status !== "pending") return null;
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-4 animate-in fade-in slide-in-from-top-4">
        <div className="flex items-start gap-3 flex-1">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              AWS is preparing your high-fidelity billing data
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">
              Your basic Cost Explorer data is available below. Advanced AI
              features and deep anomaly detection will automatically unlock when
              AWS finishes generating your complete usage report (this usually
              takes about 24 hours).
            </p>
          </div>
        </div>
        {/* The Manual Override Button! */}
        <button
          onClick={handleManualStatusCheck}
          disabled={isCheckingCur}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-blue-200 rounded-lg transition-colors shrink-0 whitespace-nowrap"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isCheckingCur ? "animate-spin" : ""}`}
          />
          {isCheckingCur ? "Checking AWS..." : "Check Status"}
        </button>
      </div>
    );
  };

  // ── Loading & Error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">Loading cost data…</p>
      </div>
    );
  }

  if (isError || isSyncError) {
    const msg =
      (syncError as any)?.message ??
      (error as any)?.message ??
      "An unexpected error occurred.";
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-base font-semibold text-gray-800 dark:text-white">
          Failed to load cost data
        </p>
        <p className="text-sm text-gray-400 max-w-xs">{msg}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <PendingBanner />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cost Explorer
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChangeStart={setStartDate}
              onChangeEnd={setEndDate}
            />
            <button
              onClick={handleRefresh}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isBusy ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing…" : "Sync from AWS"}
            </button>
            <button
              disabled={account?.cur_status === "pending" || isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-sm"
              title={
                account?.cur_status === "pending"
                  ? "Waiting for AWS to generate data..."
                  : "Run Machine Learning Analysis"
              }
            >
              <Sparkles className="w-4 h-4" /> Run AI Analysis
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <CloudOff className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-base font-semibold text-gray-800 dark:text-white">
            No cached data for this period
          </p>
          <p className="text-sm text-gray-400 max-w-sm">
            No cost records found for{" "}
            <span className="font-mono text-gray-600 dark:text-gray-300">
              {startDate} → {endDate}
            </span>
            . Run a sync to pull the latest data from AWS Cost Explorer.
          </p>
          <button
            onClick={handleRefresh}
            disabled={isBusy}
            className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isBusy ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing from AWS…" : "Sync now"}
          </button>
        </div>
      </div>
    );
  }

  // ── Dashboard Layout ──────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <PendingBanner />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cost Explorer
          </h1>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Cache loaded at {lastUpdated}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChangeStart={setStartDate}
            onChangeEnd={setEndDate}
          />
          <button
            onClick={handleRefresh}
            disabled={isBusy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isBusy ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing…" : "Refresh"}
          </button>
          <button
            disabled={account?.cur_status === "pending" || isBusy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-sm"
            title={
              account?.cur_status === "pending"
                ? "Waiting for AWS to generate data..."
                : "Run Machine Learning Analysis"
            }
          >
            <Sparkles className="w-4 h-4" /> Run AI Analysis
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Total Cost"
          value={fmt(totalCost)}
          sub={`${startDate} → ${endDate}`}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <MetricTile
          label="Top Service"
          value={topService ? fmt(topService.cost) : "—"}
          sub={topService?.name ?? "No data"}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricTile
          label="Top Region"
          value={topRegion ? fmt(topRegion.cost) : "—"}
          sub={topRegion?.name ?? "No data"}
          icon={<Globe className="w-4 h-4" />}
        />
        <MetricTile
          label="Services Active"
          value={String(byService.length)}
          sub={`across ${byRegion.length} region${byRegion.length !== 1 ? "s" : ""}`}
          icon={<Calendar className="w-4 h-4" />}
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-6">
          Daily Cost Trend
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={dailyTrend}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f0f0f0"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtShort}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#costGrad)"
              name="Total Cost"
              dot={false}
              activeDot={{ r: 4, fill: "#6366f1" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-6">
            Daily Cost by Service (Top 5)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={dailyByService}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              {topServices.map((svc, i) => (
                <defs key={svc}>
                  <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={colorFor(i)}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={colorFor(i)}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
              ))}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f0f0"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtShort}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
              />
              {topServices.map((svc, i) => (
                <Area
                  key={svc}
                  type="monotone"
                  dataKey={svc}
                  stackId="1"
                  stroke={colorFor(i)}
                  fill={`url(#grad-${i})`}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-6">
            Cost by Service
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              layout="vertical"
              data={byService.slice(0, 8)}
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#f0f0f0"
                strokeOpacity={0.5}
              />
              <XAxis
                type="number"
                tickFormatter={fmtShort}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip content={<ChartTooltip />} cursor={false} />
              <Bar dataKey="cost" name="Cost" radius={[0, 4, 4, 0]}>
                {byService.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={colorFor(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-6">
            Cost by Region
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={byRegion.slice(0, 8)}
              margin={{ top: 4, right: 16, left: 0, bottom: 32 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tickFormatter={fmtShort}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} cursor={false} />
              <Bar dataKey="cost" name="Cost" radius={[4, 4, 0, 0]}>
                {byRegion.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={colorFor(i + 5)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Service Distribution
          </h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie
                  data={byService.slice(0, 7)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="cost"
                  paddingAngle={2}
                >
                  {byService.slice(0, 7).map((_, i) => (
                    <Cell key={i} fill={colorFor(i)} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 overflow-hidden">
              {byService.slice(0, 7).map((s, i) => {
                const pct = ((s.cost / totalCost) * 100).toFixed(1);
                return (
                  <div key={s.name} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: colorFor(i) }}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                      {s.name}
                    </span>
                    <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-200 shrink-0">
                      {pct}%
                    </span>
                  </div>
                );
              })}
              {byService.length > 7 && (
                <p className="text-xs text-gray-400 pl-4">
                  +{byService.length - 7} more
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <CostTable rows={rows} />
    </div>
  );
};

export default CostDashboard;
