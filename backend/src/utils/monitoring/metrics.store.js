const WINDOW_MS = 15 * 60 * 1000;
const RECENT_MS = 60 * 1000;

const state = {
  startedAt: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  recentRequests: [],
  recentErrors: [],
  recentLatenciesMs: [],
  routeStats: new Map(),
};

const prune = (nowTs) => {
  state.recentRequests = state.recentRequests.filter((ts) => nowTs - ts <= WINDOW_MS);
  state.recentErrors = state.recentErrors.filter((ts) => nowTs - ts <= WINDOW_MS);
  state.recentLatenciesMs = state.recentLatenciesMs.filter(
    (entry) => nowTs - entry.ts <= WINDOW_MS,
  );
};

const percentile = (values, p) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
};

export const recordRequestMetric = ({
  method,
  path,
  statusCode,
  durationMs,
}) => {
  const nowTs = Date.now();
  prune(nowTs);

  state.totalRequests += 1;
  state.recentRequests.push(nowTs);
  state.recentLatenciesMs.push({ ts: nowTs, value: durationMs });

  if (statusCode >= 500) {
    state.totalErrors += 1;
    state.recentErrors.push(nowTs);
  }

  const routeKey = `${method} ${path}`;
  const prev = state.routeStats.get(routeKey) || {
    count: 0,
    errors: 0,
    totalLatencyMs: 0,
  };

  prev.count += 1;
  prev.totalLatencyMs += durationMs;
  if (statusCode >= 500) prev.errors += 1;

  state.routeStats.set(routeKey, prev);
};

export const getMonitoringMetricsSnapshot = () => {
  const nowTs = Date.now();
  prune(nowTs);

  const recentReq = state.recentRequests.filter((ts) => nowTs - ts <= RECENT_MS).length;
  const recentErr = state.recentErrors.filter((ts) => nowTs - ts <= RECENT_MS).length;
  const latencies = state.recentLatenciesMs.map((entry) => entry.value);
  const avgLatencyMs =
    latencies.length > 0
      ? Number((latencies.reduce((sum, n) => sum + n, 0) / latencies.length).toFixed(1))
      : 0;

  const p95LatencyMs = Number(percentile(latencies, 95).toFixed(1));
  const totalErrorRatePct =
    state.totalRequests > 0
      ? Number(((state.totalErrors / state.totalRequests) * 100).toFixed(2))
      : 0;
  const recentErrorRatePct = recentReq > 0 ? Number(((recentErr / recentReq) * 100).toFixed(2)) : 0;

  const topRoutes = [...state.routeStats.entries()]
    .map(([route, val]) => ({
      route,
      requests: val.count,
      errorRatePct: val.count > 0 ? Number(((val.errors / val.count) * 100).toFixed(2)) : 0,
      avgLatencyMs: val.count > 0 ? Number((val.totalLatencyMs / val.count).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 8);

  return {
    uptimeSec: Number(process.uptime().toFixed(1)),
    startedAt: state.startedAt,
    requests: {
      total: state.totalRequests,
      lastMinute: recentReq,
    },
    errors: {
      total: state.totalErrors,
      errorRatePct: totalErrorRatePct,
      lastMinute: recentErr,
      lastMinuteErrorRatePct: recentErrorRatePct,
    },
    latency: {
      avgMs: avgLatencyMs,
      p95Ms: p95LatencyMs,
    },
    topRoutes,
  };
};

