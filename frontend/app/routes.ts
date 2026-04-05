/**
 * CloudAudit — React Router 7 route configuration.
 *
 * Declares the file-based route tree (public marketing, auth flows, authenticated app,
 * team workspaces, invite acceptance). Changing paths here updates URLs site-wide.
 */
import {
  type RouteConfig,
  index,
  route,
  layout,
  prefix,
} from "@react-router/dev/routes";

export default [
  // Public Area
  layout("routes/_public/layout.tsx", [
    index("routes/_public/index.tsx"),
    route("login", "routes/_public/login.tsx"),
    route("signup", "routes/_public/signup.tsx"),
    route("forgot-password", "routes/_public/forgot-password.tsx"),
    route("reset-password", "routes/_public/reset-password.tsx"),
  ]),

  // Auth/Account routes
  layout("routes/_auth/layout.tsx", [
    route("verify-email", "routes/_auth/verify-email.tsx"),
  ]),

  layout("routes/invite/layout.tsx", [
    route("invite/accept", "routes/invite/accept.tsx"),
  ]),

  // Protected App Area
  layout("routes/_app/layout.tsx", [
    route("dashboard", "routes/_app/dashboard.tsx"),
    route("monitoring", "routes/_app/monitoring.tsx"),
    route("profile", "routes/_app/profile.tsx"),
  ]),

  // Team Routes
  ...prefix("teams/:teamId", [
    layout("routes/_app/teams/$teamId/layout.tsx", [
      index("routes/_app/teams/$teamId/index.tsx"),
      route("members", "routes/_app/teams/$teamId/members.tsx"),
      route("audit-logs", "routes/_app/teams/$teamId/audit-logs.tsx"),
      route("recommendations", "routes/_app/teams/$teamId/recommendations.tsx"),
      route("anomalies", "routes/_app/teams/$teamId/anomalies.tsx"),
      route("aws", "routes/_app/teams/$teamId/aws/index.tsx"),
      route("aws/link", "routes/_app/teams/$teamId/aws/link.tsx"),
      route("settings", "routes/_app/teams/$teamId/settings.tsx"),
      route("cost-explorer", "routes/_app/teams/$teamId/cost-explorer.tsx"),
      route(
        "resources/:slug",
        "routes/_app/teams/$teamId/resources/$slug.tsx",
      ),
    ]),
  ]),
] satisfies RouteConfig;
