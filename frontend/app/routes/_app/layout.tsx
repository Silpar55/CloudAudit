import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
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
  const navigate = useNavigate();

  const { isAuthenticated, isLoading, isChecking } = useAuth();
  const location = useLocation();

  // 1. HYDRATION GUARD:
  // If we are still checking localStorage, render NOTHING.
  // This prevents the "Server vs Client" mismatch error.
  if (isChecking) {
    return null;
  }

  // 2. API LOADING GUARD:
  // Now that we found a token, we are fetching the user. Show Spinner.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-lg font-medium text-gray-600 animate-pulse">
          Loading CloudAudit...
        </div>
      </div>
    );
  }

  // 3. AUTH GUARD:
  // Loading finished, token checked. If still no user, goodbye.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Top Navigation */}
      <Navbar showAuth={true} />

      {/* Child routes (/dashboard, /profile) render here */}
      <Outlet />
    </div>
  );
}
