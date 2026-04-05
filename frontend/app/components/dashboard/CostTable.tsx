/**
 * CloudAudit — Dashboard UI: `CostTable.tsx`.
 * Cost, anomalies, recommendations, and team overview widgets.
 */

import React, { useState, useMemo } from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { type CostRow } from "~/hooks/useAws";
import { fmt } from "~/utils/format";

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

  const services = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((r) => r.service))).sort()],
    [rows],
  );
  const regions = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((r) => r.region))).sort()],
    [rows],
  );

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
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
              {filtered.length.toLocaleString()} of{" "}
              {rows.length.toLocaleString()} rows
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            className="px-2 py-1 text-xs rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1,
            )
            .reduce<(number | "…")[]>((acc, p, idx, arr) => {
              if (
                idx > 0 &&
                typeof arr[idx - 1] === "number" &&
                (p as number) - (arr[idx - 1] as number) > 1
              )
                acc.push("…");
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
                  className={`min-w-7 h-7 px-2 text-xs rounded-lg font-medium transition-colors ${safePage === p ? "bg-indigo-500 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  {p}
                </button>
              ),
            )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            className="px-2 py-1 text-xs rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostTable;
