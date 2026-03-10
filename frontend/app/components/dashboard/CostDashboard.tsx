"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Search,
  X,
} from "lucide-react";
import {
  useGetCachedCostData,
  useSyncCostAndUsage,
  type CostRow,
} from "~/hooks/useAws";
import { useAwsAccount } from "~/context/AwsAccountContext";
import { useParams } from "react-router";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
};

const fmtDate = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

const today = () => new Date().toISOString().split("T")[0];

const PALETTE = [
  "#6366f1",
  "#22d3ee",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#a78bfa",
  "#34d399",
  "#fb923c",
  "#38bdf8",
  "#e879f9",
  "#4ade80",
  "#facc15",
  "#f87171",
  "#60a5fa",
  "#c084fc",
];

const colorFor = (index: number) => PALETTE[index % PALETTE.length];

// ─── Date Range Presets ───────────────────────────────────────────────────────

type Preset = { label: string; start: string; end: string };

const PRESETS: Preset[] = [
  { label: "Last 7 days", start: daysAgo(7), end: today() },
  { label: "Last 14 days", start: daysAgo(14), end: today() },
  { label: "Last 30 days", start: daysAgo(30), end: today() },
  { label: "Last 90 days", start: daysAgo(90), end: today() },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MetricTileProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}

const MetricTile = ({ label, value, sub, icon }: MetricTileProps) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
        {icon}
      </div>
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
      )}
    </div>
  </div>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-white">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color || p.fill }}
          />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-mono font-semibold">{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Date Range Picker ────────────────────────────────────────────────────────

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}

const DateRangePicker = ({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
}: DateRangePickerProps) => {
  const [open, setOpen] = useState(false);

  const selectedPreset = PRESETS.find(
    (p) => p.start === startDate && p.end === endDate,
  );

  const handlePreset = (p: Preset) => {
    onChangeStart(p.start);
    onChangeEnd(p.end);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 hover:border-indigo-400 transition-colors"
      >
        <Calendar className="w-4 h-4 text-indigo-400" />
        <span>
          {selectedPreset ? selectedPreset.label : `${startDate} → ${endDate}`}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-4 w-80">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Quick select
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${
                      selectedPreset?.label === p.label
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Custom range
            </p>
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">From</label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => onChangeStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">To</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={today()}
                  onChange={(e) => onChangeEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <button
                onClick={() => setOpen(false)}
                className="mt-1 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── CostTable: paginated + filterable table ─────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface CostTableProps {
  rows: CostRow[];
}

const CostTable = ({ rows }: CostTableProps) => {
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  // Unique values for filter dropdowns
  const services = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((r) => r.service))).sort()],
    [rows],
  );
  const regions = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((r) => r.region))).sort()],
    [rows],
  );

  // Reset to page 1 whenever filters change
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const handleService = (v: string) => {
    setServiceFilter(v);
    setPage(1);
  };
  const handleRegion = (v: string) => {
    setRegionFilter(v);
    setPage(1);
  };
  const handlePageSize = (v: number) => {
    setPageSize(v);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (serviceFilter !== "all" && r.service !== serviceFilter) return false;
      if (regionFilter !== "all" && r.region !== regionFilter) return false;
      if (q) {
        return (
          r.service.toLowerCase().includes(q) ||
          r.region.toLowerCase().includes(q) ||
          r.time_period_start.includes(q)
        );
      }
      return true;
    });
  }, [rows, search, serviceFilter, regionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const hasActiveFilters =
    search !== "" || serviceFilter !== "all" || regionFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setServiceFilter("all");
    setRegionFilter("all");
    setPage(1);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Table header + filters */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Raw Cost Records
          </h2>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            )}
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
              {filtered.length.toLocaleString()} of{" "}
              {rows.length.toLocaleString()} rows
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search service, region, date…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
            />
            {search && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Service filter */}
          <select
            value={serviceFilter}
            onChange={(e) => handleService(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors max-w-48"
          >
            {services.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All services" : s}
              </option>
            ))}
          </select>

          {/* Region filter */}
          <select
            value={regionFilter}
            onChange={(e) => handleRegion(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "All regions" : r}
              </option>
            ))}
          </select>

          {/* Rows per page */}
          <select
            value={pageSize}
            onChange={(e) => handlePageSize(Number(e.target.value))}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {["Date", "Service", "Region", "Cost", "Usage Qty", "Unit"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {pageSlice.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-400 text-xs"
                >
                  No records match your filters.
                </td>
              </tr>
            ) : (
              pageSlice.map((row) => (
                <tr
                  key={row.cache_id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">
                    {row.time_period_start.split("T")[0]}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-200 font-medium whitespace-nowrap max-w-48 truncate">
                    {row.service}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {row.region}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                    {fmt(Number(row.unblended_cost))}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {Number(row.usage_quantity).toFixed(4)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                    {row.usage_quantity_unit}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="px-6 py-3 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-400">
          {filtered.length === 0
            ? "No results"
            : `Showing ${((safePage - 1) * pageSize + 1).toLocaleString()}–${Math.min(safePage * pageSize, filtered.length).toLocaleString()} of ${filtered.length.toLocaleString()}`}
        </p>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            className="px-2 py-1 text-xs rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Page number pills */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1,
            )
            .reduce<(number | "…")[]>((acc, p, idx, arr) => {
              if (
                idx > 0 &&
                typeof arr[idx - 1] === "number" &&
                (p as number) - (arr[idx - 1] as number) > 1
              ) {
                acc.push("…");
              }
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-1 text-xs text-gray-400"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`min-w-7 h-7 px-2 text-xs rounded-lg font-medium transition-colors ${
                    safePage === p
                      ? "bg-indigo-500 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {p}
                </button>
              ),
            )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            className="px-2 py-1 text-xs rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

// No props needed — teamId and awsAccountInternalId come from context.
const CostDashboard = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { account } = useAwsAccount();
  const awsAccountInternalId = account?.id;

  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today());

  // Track if we have already auto-triggered the sync to prevent infinite loops
  const hasAttemptedAutoSync = useRef(false);

  // ── Read: DB cache only, fast and cheap ──────────────────────────────────
  const {
    data: rows = [],
    isLoading,
    isFetching,
    isError,
    error,
    dataUpdatedAt,
  } = useGetCachedCostData(teamId, awsAccountInternalId, startDate, endDate);

  // ── Write: live AWS sync, only on user action ─────────────────────────────
  const {
    mutate: runSync,
    isPending: isSyncing,
    isError: isSyncError,
    error: syncError,
  } = useSyncCostAndUsage(teamId, awsAccountInternalId, startDate, endDate);

  const handleRefresh = useCallback(() => {
    hasAttemptedAutoSync.current = true; // Mark as user-triggered
    runSync();
  }, [runSync]);

  const isBusy = isFetching || isSyncing;

  // ── Auto-Sync on Empty Cache ──────────────────────────────────
  useEffect(() => {
    // If we finished loading the cache, it's empty, and we haven't tried syncing yet
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

  // If the auto-sync fired, reset the ref when the user changes dates so it can auto-sync the new dates if they are empty too!
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

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">Loading cost data…</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

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

  // ── Empty state — no cache yet for this date range ────────────────────────

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        {/* Keep the header visible so users can change the date range */}
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

  // ── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
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
        </div>
      </div>

      {/* Metric Tiles */}
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

      {/* Daily Cost Trend */}
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

      {/* Two-col: Stacked by Service + Service Breakdown */}
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

      {/* Two-col: Region Bar + Service Pie */}
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

      {/* Raw Data Table — paginated + filtered */}
      <CostTable rows={rows} />
    </div>
  );
};

export default CostDashboard;
