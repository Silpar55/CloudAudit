import React from "react";
import { Calendar, ChevronDown, RefreshCw, Download } from "lucide-react";

/**
 * Header Component
 *
 * Top header bar for team workspace pages
 *
 * @param {string} title - Page title
 * @param {string} subtitle - Page subtitle/description
 * @param {Array} actions - Action buttons [{label, icon, onClick, variant}]
 * @param {boolean} showDateFilter - Show date range filter
 * @param {string} dateRange - Current date range label
 * @param {function} onDateChange - Date range change handler
 * @param {string} className - Additional CSS classes
 */

const Header = ({
  title = "Dashboard",
  subtitle = "",
  actions = [],
  showDateFilter = false,
  dateRange = "Last 30 Days",
  onDateChange,
  className = "",
  ...props
}: any) => {
  return (
    <header
      className={`bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-8 py-4 ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {showDateFilter && (
            <button
              onClick={onDateChange}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white text-sm font-semibold rounded-lg transition-all"
            >
              <Calendar className="w-4 h-4" />
              {dateRange}
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

          {actions.map((action: any, index: number) => {
            const Icon = action.icon;
            const variant = action.variant || "secondary";

            const variantStyles: any = {
              primary:
                "bg-aws-orange hover:bg-aws-orange-dark text-white shadow-md",
              secondary:
                "bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white",
            };

            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${variantStyles[variant]}`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;
