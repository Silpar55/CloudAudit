import {
  Activity,
  AlertTriangle,
  Clock3,
  Database,
  Gauge,
  Workflow,
} from "lucide-react";
import { MetricCard } from "~/components/dashboard";
import { useMonitoringSnapshot } from "~/hooks/useMonitoringSnapshot";

const statusClass = (status: string) =>
  status === "healthy"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

export default function MonitoringPage() {
  const { data, isLoading } = useMonitoringSnapshot();

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white">
            Monitoring
          </h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400">
            Loading monitoring snapshot...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white">
              Monitoring
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Last updated: {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statusClass(
              data.status,
            )}`}
          >
            API {data.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <MetricCard
            title="Requests (1 min)"
            value={data.metrics.requests.lastMinute}
            subtitle={`Total: ${data.metrics.requests.total}`}
            icon={<Activity className="w-5 h-5 text-aws-orange" />}
          />
          <MetricCard
            title="Error Rate"
            value={`${data.metrics.errors.lastMinuteErrorRatePct}%`}
            subtitle={`Total errors: ${data.metrics.errors.total}`}
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            trend={`${data.metrics.errors.errorRatePct}% total`}
            trendType={
              data.metrics.errors.lastMinuteErrorRatePct > 3 ? "negative" : "positive"
            }
          />
          <MetricCard
            title="Avg Latency"
            value={`${data.metrics.latency.avgMs}ms`}
            subtitle={`P95: ${data.metrics.latency.p95Ms}ms`}
            icon={<Clock3 className="w-5 h-5 text-blue-500" />}
          />
          <MetricCard
            title="Uptime"
            value={`${Math.floor(data.metrics.uptimeSec / 60)} min`}
            subtitle="Since process start"
            icon={<Gauge className="w-5 h-5 text-emerald-500" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Dependencies
            </h2>
            <div className="space-y-3">
              <DependencyRow label="Database" status={data.dependencies.database} />
              <DependencyRow
                label="AWS Credentials"
                status={data.dependencies.awsCredentials}
              />
              <DependencyRow label="ML Service" status={data.dependencies.mlService} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Throughput
            </h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p className="flex justify-between">
                <span>Requests (last 1 min)</span>
                <span className="font-semibold">{data.metrics.requests.lastMinute}</span>
              </p>
              <p className="flex justify-between">
                <span>Errors (last 1 min)</span>
                <span className="font-semibold">{data.metrics.errors.lastMinute}</span>
              </p>
              <p className="flex justify-between">
                <span>Total requests</span>
                <span className="font-semibold">{data.metrics.requests.total}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Workflow className="w-5 h-5 text-aws-orange" />
            Top routes
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                  <th className="py-2 pr-4">Route</th>
                  <th className="py-2 pr-4">Requests</th>
                  <th className="py-2 pr-4">Avg Latency</th>
                  <th className="py-2">Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.metrics.topRoutes.map((route) => (
                  <tr
                    key={route.route}
                    className="border-b border-gray-100 dark:border-slate-700/60 text-gray-700 dark:text-gray-200"
                  >
                    <td className="py-2 pr-4 font-mono text-xs">{route.route}</td>
                    <td className="py-2 pr-4">{route.requests}</td>
                    <td className="py-2 pr-4">{route.avgLatencyMs}ms</td>
                    <td className="py-2">{route.errorRatePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function DependencyRow({ label, status }: { label: string; status: string }) {
  const healthy = status === "healthy";
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
        <Database className="w-4 h-4 text-aws-orange" />
        {label}
      </div>
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          healthy
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

