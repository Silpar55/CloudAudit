import React from "react";
import { Cloud, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "~/context/AuthContext";
import { Link, useNavigate } from "react-router";

/**
 * Navbar Component
 *
 * Top navigation bar for public pages (landing, login, signup)
 *
 * @param {Array} links - Navigation links [{label, to}]
 * @param {boolean} showAuth - Show auth buttons
 * @param {string} className - Additional CSS classes
 */

const Navbar = ({ links = [], showAuth = true, className = "", ...props }) => {
  const { logout, isAuthenticated, user } = useAuth();

  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const firstName = user?.first_name || "User";
  const lastName = user?.last_name || "";
  const initials = (firstName[0] || "") + (lastName[0] || "");

  return (
    <nav
      className={`bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40 ${className}`}
      {...props}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-linear-to-br from-aws-orange to-brand-coral rounded-xl flex items-center justify-center">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold font-display text-gray-900 dark:text-white">
              Cloud<span className="text-aws-orange">Audit</span>
            </span>
          </Link>

          {/* Navigation Links & Auth */}
          <div className="flex items-center gap-6">
            {links.map((link: { to: string; label: string }, index: number) => (
              <Link
                key={index}
                to={link.to}
                className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {showAuth && (
              <>
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => navigate("/profile")}
                      className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-slate-700 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {`${firstName} ${lastName.split(" ")[0]}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          View Profile
                        </p>
                      </div>
                    </button>

                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-white text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-semibold transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="px-5 py-2 text-sm font-semibold text-aws-orange hover:text-aws-orange-dark transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className="px-5 py-2 bg-aws-orange hover:bg-aws-orange-dark text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                    >
                      Get Started Free
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
