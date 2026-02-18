import { Navigate, Outlet } from "react-router";
import { useAuth } from "~/context/AuthContext";

import { Navbar } from "~/components/layout";

/**
 * AppLayout Component
 *
 * Layout wrapper for app pages (/dashboard, /profile)
 * Includes top navigation with logo, notifications, and user profile
 * Does NOT include sidebar - this is for team selection and profile pages
 *
 * Route: routes/_app/layout.tsx
 */

export default function AppLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Top Navigation */}
      <Navbar showAuth={true} />

      {/* Child routes (/dashboard, /profile) render here */}
      <Outlet />
    </div>
  );
}
