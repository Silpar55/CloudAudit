/**
 * CloudAudit — React Router framework configuration.
 *
 * SSR is enabled by default for production Docker builds; set `ssr: false` for pure SPA if needed.
 */
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
} satisfies Config;
