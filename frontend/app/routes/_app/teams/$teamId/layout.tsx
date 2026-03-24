import {
  Outlet,
  useNavigate,
  useParams,
  useLocation,
  Navigate,
} from "react-router";
import { Sidebar, Header } from "~/components/layout";
import { useAuth } from "~/context/AuthContext";
import { PageLoader } from "~/components/ui";
import { useWorkspaceTeamData } from "~/hooks/useWorkspaceTeamData";
import { AwsAccountProvider } from "~/context/AwsAccountContext";
import { getServiceMetaForSlug } from "~/utils/awsServiceCatalog";

/**
 * TeamLayout Component
 *
 * Layout wrapper for team workspace pages (/teams/:teamId/*)
 * Includes sidebar navigation and top header bar.
 * All team routes (index, members, anomalies, etc.) render in the main content area.
 *
 * Route: routes/_app/teams/$teamId/layout.tsx
 */

// ─── Route meta ───────────────────────────────────────────────────────────────
// Single source of truth for both sidebar active-route highlighting and the
// Header title. Entries are matched in order; first hit wins.
//
// The /resources/ catch-all at the end handles any dynamic service slug
// (e.g. /resources/rds, /resources/cloudfront) without needing hardcoded entries.

interface RouteMeta {
  /** Substring to match against location.pathname */
  match: string;
  /** Canonical path string returned to the Sidebar for highlighting */
  path: string;
  /** Human-readable title shown in the Header */
  title: string;
}

const ROUTE_META: RouteMeta[] = [
  { match: "/anomalies", path: "/anomalies", title: "Detected Anomalies" },
  {
    match: "/recommendations",
    path: "/recommendations",
    title: "AI Recommendations",
  },
  { match: "/members", path: "/members", title: "Team Members" },
  { match: "/audit-logs", path: "/audit-logs", title: "Audit Logs" },
  { match: "/settings", path: "/settings", title: "Settings" },
  { match: "/cost-explorer", path: "/cost-explorer", title: "Cost Explorer" },
  // Catch-all for any /resources/:slug — title is derived from the slug itself
  { match: "/resources/", path: "/resources/", title: "__resource__" },
];

/**
 * Given the current pathname, return { path, title } for the active route.
 * For resource pages the title is derived from the slug (e.g. "rds" -> "RDS Resources").
 */
const resolveRoute = (pathname: string): { path: string; title: string } => {
  for (const meta of ROUTE_META) {
    if (pathname.includes(meta.match)) {
      if (meta.title === "__resource__") {
        const slug = pathname.split("/resources/")[1]?.split("/")[0] ?? "";
        const label = getServiceMetaForSlug(slug).label;
        return {
          path: `/resources/${slug}`,
          title: `${label} — cost & insights`,
        };
      }
      return { path: meta.path, title: meta.title };
    }
  }
  return { path: "/", title: "Cost Overview" };
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TeamLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const navigate = useNavigate();
  const location = useLocation();

  const { teamId } = useParams<{ teamId: string }>();
  const { data, isLoading } = useWorkspaceTeamData(teamId!);

  if (isLoading) return <PageLoader />;

  const { user, team, teamMember } = data!;

  // Resolve active route path + page title from the current URL
  const { path: activeRoute, title: pageTitle } = resolveRoute(
    location.pathname,
  );

  // Handle navigation from sidebar
  const handleNavigate = (path: string) => {
    if (path === "/") {
      return `/teams/${teamId}`;
    } else {
      return `/teams/${teamId}${path}`;
    }
  };

  return (
    // AwsAccountProvider fetches aws_accounts once for the whole workspace.
    // Sidebar, Header (real AWS account ID in subtitle), and all child pages
    // read from it via useAwsAccount() — no prop threading.
    <AwsAccountProvider teamId={teamId!} teamStatus={team.status}>
      <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
        <Sidebar
          currentTeam={team}
          role={teamMember.role}
          user={user}
          activeRoute={activeRoute}
          onNavigate={handleNavigate}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/*
           * title  — derived from ROUTE_META, changes per page automatically.
           * teamName — passed so Header can compose the subtitle without
           *            needing access to the full team object.
           * The real aws_account_id is read inside Header via useAwsAccount().
           */}
          <Header title={pageTitle} teamName={team.name} />

          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </AwsAccountProvider>
  );
}
