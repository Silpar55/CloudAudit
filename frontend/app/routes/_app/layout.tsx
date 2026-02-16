import { Outlet, useNavigate } from "react-router";
import { Cloud, Bell } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-linear-to-br from-aws-orange to-brand-coral rounded-xl flex items-center justify-center">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold font-display text-gray-900 dark:text-white">
                Cloud<span className="text-aws-orange">Audit</span>
              </span>
            </button>

            {/* Right Side - Notifications & User */}
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors relative">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-slate-700 hover:opacity-80 transition-opacity"
              >
                <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  AS
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Alejandro Silva
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    View Profile
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Child routes (/dashboard, /profile) render here */}
      <Outlet />
    </div>
  );
}
