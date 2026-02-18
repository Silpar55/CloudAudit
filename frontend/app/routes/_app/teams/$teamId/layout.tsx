import {
  Outlet,
  useNavigate,
  useParams,
  useLocation,
  Navigate,
} from "react-router";
import { Sidebar, Header } from "~/components/layout";
import { RefreshCw, Download } from "lucide-react";
import { useAuth } from "~/context/AuthContext";

/**
 * TeamLayout Component
 *
 * Layout wrapper for team workspace pages (/teams/:teamId/*)
 * Includes sidebar navigation and top header bar
 * All team routes (index, members, anomalies, etc.) render in the main content area
 *
 * Route: routes/_app/teams/$teamId/layout.tsx
 */

export default function TeamLayout() {
  const navigate = useNavigate();
  const { teamId } = useParams();

  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Pass the current location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Mock data - Replace with real data from your API/state management
  const team = {
    name: "DevOps Team",
    initials: "DT",
    memberCount: 5,
    avatarColor: "from-purple-500 to-purple-600",
  };

  const user = {
    name: "Alejandro Silva",
    initials: "AS",
    role: "Admin",
    avatarColor: "from-blue-500 to-blue-600",
  };

  const counts = {
    anomalies: 2,
    recommendations: 8,
  };

  // Determine active route for sidebar highlighting
  const getActiveRoute = () => {
    const path = location.pathname;
    if (path.includes("/anomalies")) return "/anomalies";
    if (path.includes("/recommendations")) return "/recommendations";
    if (path.includes("/members")) return "/members";
    if (path.includes("/audit-logs")) return "/audit-logs";
    if (path.includes("/settings")) return "/settings";
    if (path.includes("/aws")) return "/aws";
    if (path.includes("/resources/ec2")) return "/resources/ec2";
    if (path.includes("/resources/rds")) return "/resources/rds";
    if (path.includes("/resources/s3")) return "/resources/s3";
    if (path.includes("/resources/lambda")) return "/resources/lambda";
    return "/";
  };

  // Handle navigation from sidebar
  const handleNavigate = (path: string) => {
    if (path === "/") {
      navigate(`/teams/${teamId}`);
    } else {
      navigate(`/teams/${teamId}${path}`);
    }
  };

  // Header actions (these will be the same across all team pages)
  const headerActions = [
    {
      label: "Sync",
      icon: RefreshCw,
      onClick: () => console.log("Sync data"),
      variant: "secondary",
    },
    {
      label: "Export",
      icon: Download,
      onClick: () => console.log("Export report"),
      variant: "primary",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
      {/* Sidebar - Same for all team pages */}
      <Sidebar
        team={team}
        user={user}
        counts={counts}
        activeRoute={getActiveRoute()}
        onNavigate={handleNavigate}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Same for all team pages, but title/subtitle can be customized */}
        <Header
          title="Cost Overview"
          subtitle={`AWS Account: 123456789012 • Team: ${team.name}`}
          actions={headerActions}
          showDateFilter={true}
          dateRange="Last 30 Days"
          onDateChange={() => console.log("Change date range")}
        />

        {/* Child routes render here - This is where your page content goes */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
