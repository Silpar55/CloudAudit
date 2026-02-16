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
  ]),

  // Protected App Area
  layout("routes/_app/layout.tsx", [
    route("dashboard", "routes/_app/dashboard.tsx"),
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
    ]),
  ]),
] satisfies RouteConfig;
