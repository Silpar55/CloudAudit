/**
 * CloudAudit — Authenticated app route: `anomalies.tsx`.
 * Requires login; lives under the main app shell (sidebar/header).
 */

import { AnomalyDashboard } from "~/components/dashboard";

export default function AnomaliesRoute() {
  return <AnomalyDashboard />;
}
