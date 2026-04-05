/**
 * CloudAudit — Shared UI primitive: `InsightCard.tsx`.
 * Reusable across features; keep presentation-agnostic where possible.
 */

import React from "react";

interface InsightCardProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  timestamp?: string;
  metadata?: Record<string, any> | null | string;
  metricsContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  accentColor?: "red" | "green" | "yellow" | "indigo" | "default";
}

const InsightCard: React.FC<InsightCardProps> = ({
  icon,
  title,
  subtitle,
  badge,
  timestamp,
  metadata,
  metricsContent,
  footerContent,
  accentColor = "default",
}) => {
  // Theme dictionaries for subtle metric backgrounds
  const metricsBgMap = {
    red: "bg-red-50 dark:bg-red-900/10 border-l border-red-100 dark:border-red-900/30",
    green:
      "bg-green-50 dark:bg-green-900/10 border-l border-green-100 dark:border-green-900/30",
    yellow:
      "bg-yellow-50 dark:bg-yellow-900/10 border-l border-yellow-100 dark:border-yellow-900/30",
    indigo:
      "bg-indigo-50 dark:bg-indigo-900/10 border-l border-indigo-100 dark:border-indigo-900/30",
    default:
      "bg-gray-50 dark:bg-gray-800/50 border-l border-gray-100 dark:border-gray-700",
  };

  // Helper to make metadata keys human-readable (e.g., "cpu_spike" -> "Cpu Spike")
  const formatKey = (key: string) =>
    key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          {badge}
          {timestamp && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {timestamp}
            </span>
          )}
        </div>
      </div>

      {/* ── Body (Grid Layout) ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1">
        {/* Left Side: Context & Metadata (8 columns) */}
        <div className="md:col-span-8 p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            {icon && <div className="text-gray-400">{icon}</div>}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          {subtitle && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {subtitle}
            </div>
          )}

          {/* Clean Metadata Table (No more raw JSON strings!) */}
          {metadata && Object.keys(metadata).length > 0 && (
            <div className="mt-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4 border border-gray-100 dark:border-slate-700">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Diagnostic Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {Object.entries(metadata).map(([key, val]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-xs text-gray-500">
                      {formatKey(key)}
                    </span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Financial Metrics (4 columns) */}
        <div
          className={`md:col-span-4 p-5 flex flex-col justify-center ${metricsBgMap[accentColor]}`}
        >
          {metricsContent}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      {footerContent && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/80 px-5 py-3 flex flex-wrap items-center gap-3">
          {footerContent}
        </div>
      )}
    </div>
  );
};

export default InsightCard;
