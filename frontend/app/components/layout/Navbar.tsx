import React from "react";
import { Cloud } from "lucide-react";

/**
 * Navbar Component
 *
 * Top navigation bar for public pages (landing, login, signup)
 *
 * @param {Array} links - Navigation links [{label, href}]
 * @param {boolean} showAuth - Show auth buttons
 * @param {string} className - Additional CSS classes
 */

const Navbar = ({ links = [], showAuth = true, className = "", ...props }) => {
  return (
    <nav
      className={`bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40 ${className}`}
      {...props}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-linear-to-br from-aws-orange to-brand-coral rounded-xl flex items-center justify-center">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold font-display text-gray-900 dark:text-white">
              Cloud<span className="text-aws-orange">Audit</span>
            </span>
          </a>

          {/* Navigation Links & Auth */}
          <div className="flex items-center gap-6">
            {links.map(
              (link: { href: string; label: string }, index: number) => (
                <a
                  key={index}
                  href={link.href}
                  className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ),
            )}

            {showAuth && (
              <>
                <a
                  href="/login"
                  className="px-5 py-2 text-sm font-semibold text-aws-orange hover:text-aws-orange-dark transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="/signup"
                  className="px-5 py-2 bg-aws-orange hover:bg-aws-orange-dark text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  Get Started Free
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
