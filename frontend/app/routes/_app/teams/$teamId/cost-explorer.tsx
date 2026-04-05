/**
 * CloudAudit — Authenticated app route: `cost-explorer.tsx`.
 * Requires login; lives under the main app shell (sidebar/header).
 */

import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { Alert, Button, Card, SectionLoader } from "~/components/ui";
import { DateRangePicker, MetricTile } from "~/components/dashboard";
import {
  useCheckCurStatus,
  useGetCachedCostData,
  useSyncCostAndUsage,
} from "~/hooks/useAws";
import { useAwsAccount } from "~/context/AwsAccountContext";
import { daysAgo, fmt, today } from "~/utils/format";
import { Database, RefreshCw, ShieldCheck, CalendarClock } from "lucide-react";

function toDay(v: string) {
  return v.split("T")[0];
}

function dayDiffInclusive(start: string, end: string) {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

export default function CostExplorerPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { account, refreshAccount } = useAwsAccount();
  const accId = account?.id;

  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today());
  const [notice, setNotice] = useState<string | null>(null);

  const {
    data: rows = [],
    isLoading,
    isFetching,
  } = useGetCachedCostData(teamId, accId, startDate, endDate, {
    enabled: !!teamId && !!accId,
  });

  const syncCost = useSyncCostAndUsage(teamId, accId, startDate, endDate);
  const checkCur = useCheckCurStatus();

  const daySet = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(toDay(r.time_period_start)));
    return s;
  }, [rows]);

  const metrics = useMemo(() => {
    const expectedDays = dayDiffInclusive(startDate, endDate);
    const coveredDays = daySet.size;
    const missingDays = Math.max(0, expectedDays - coveredDays);
    const totalCost = rows.reduce(
      (sum, r) => sum + Number(r.unblended_cost),
      0,
    );
    const latestFetch = rows
      .map((r) => new Date(r.retrieved_at).getTime())
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => b - a)[0];

    return {
      expectedDays,
      coveredDays,
      missingDays,
      totalCost,
      latestFetch: latestFetch ? new Date(latestFetch) : null,
    };
  }, [rows, daySet, startDate, endDate]);

  const topServices = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => {
      m[r.service] = (m[r.service] || 0) + Number(r.unblended_cost);
    });
    return Object.entries(m)
      .map(([service, cost]) => ({ service, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8);
  }, [rows]);

  if (!accId || !teamId) {
    return (
      <div className="p-8 mx-auto w-full max-w-7xl">
        <Alert variant="warning" title="AWS Account Required">
          Connect and activate an AWS account to use Cost Explorer diagnostics.
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 mx-auto w-full max-w-7xl">
        <SectionLoader />
      </div>
    );
  }

  return (
    <div className="p-8 mx-auto w-full max-w-7xl space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="w-2/5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Fresh Spend Diagnostics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This page focuses on data freshness and boundary coverage (CUR
            readiness + Cost Explorer cache health), not full analytics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChangeStart={setStartDate}
            onChangeEnd={setEndDate}
          />
          <Button
            variant="outline"
            onClick={() => {
              setNotice(null);
              syncCost.mutate(undefined, {
                onSuccess: (data: any) => {
                  setNotice(`Synced ${data?.rowsAdded ?? 0} new CE rows.`);
                },
              });
            }}
            disabled={syncCost.isPending || isFetching}
          >
            <RefreshCw
              className={`w-4 h-4 ${syncCost.isPending ? "animate-spin" : ""}`}
            />
            {syncCost.isPending ? "Syncing…" : "Sync Cost Explorer"}
          </Button>
          <Button
            onClick={() => {
              setNotice(null);
              checkCur.mutate(
                { teamId, accId },
                {
                  onSuccess: (res) => {
                    if (res?.status === "active") refreshAccount();
                    setNotice(
                      res?.status === "active"
                        ? "CUR is active and ready."
                        : "CUR is still pending in AWS.",
                    );
                  },
                },
              );
            }}
            disabled={checkCur.isPending}
          >
            <ShieldCheck className="w-4 h-4" />
            {checkCur.isPending ? "Checking…" : "Check CUR Status"}
          </Button>
        </div>
      </div>

      {notice && (
        <Alert variant="info" title="Update">
          {notice}
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="CE Cached Cost"
          value={fmt(metrics.totalCost)}
          sub={`${startDate} to ${endDate}`}
          icon={<Database className="w-4 h-4" />}
        />
        <MetricTile
          label="Covered Days"
          value={`${metrics.coveredDays}/${metrics.expectedDays}`}
          sub="Days present in cache"
          icon={<CalendarClock className="w-4 h-4" />}
        />
        <MetricTile
          label="Missing Days"
          value={String(metrics.missingDays)}
          sub="Likely to be backfilled by CUR/next CE sync"
          icon={<RefreshCw className="w-4 h-4" />}
        />
        <MetricTile
          label="CUR Status"
          value={(account.cur_status || "pending").toUpperCase()}
          sub={
            metrics.latestFetch
              ? `Last CE fetch ${metrics.latestFetch.toLocaleString()}`
              : "No CE fetch timestamp yet"
          }
          icon={<ShieldCheck className="w-4 h-4" />}
        />
      </div>

      <Card padding="lg" className="shadow-lg">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          How this data should be interpreted
        </h2>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <li>
            Overview should use CUR as primary when available, then CE for
            uncovered recent days.
          </li>
          <li>
            CE sync gives near-real-time spend, while CUR provides finer-grained
            and higher-fidelity cost records.
          </li>
          <li>
            Missing days here signal freshness gaps, not necessarily API errors.
          </li>
        </ul>
      </Card>

      <Card padding="lg" className="shadow-lg">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Top Services In CE Cache (Current Window)
        </h2>
        {topServices.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No cached Cost Explorer rows for this window. Run a sync to populate
            diagnostics.
          </p>
        ) : (
          <div className="space-y-2">
            {topServices.map((s, idx) => (
              <div
                key={s.service}
                className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2"
              >
                <span className="text-gray-700 dark:text-gray-200 truncate">
                  {idx + 1}. {s.service}
                </span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {fmt(s.cost)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
