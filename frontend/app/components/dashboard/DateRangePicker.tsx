/**
 * CloudAudit — Dashboard UI: `DateRangePicker.tsx`.
 * Cost, anomalies, recommendations, and team overview widgets.
 */

import React, { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { daysAgo, today } from "~/utils/format";

type Preset = { label: string; start: string; end: string };

const PRESETS: Preset[] = [
  { label: "Last 7 days", start: daysAgo(7), end: today() },
  { label: "Last 14 days", start: daysAgo(14), end: today() },
  { label: "Last 30 days", start: daysAgo(30), end: today() },
  { label: "Last 90 days", start: daysAgo(90), end: today() },
];

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

export default DateRangePicker;
