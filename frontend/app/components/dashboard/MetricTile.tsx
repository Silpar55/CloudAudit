/**
 * CloudAudit — Dashboard UI: `MetricTile.tsx`.
 * Cost, anomalies, recommendations, and team overview widgets.
 */

import React from "react";

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

export default MetricTile;
