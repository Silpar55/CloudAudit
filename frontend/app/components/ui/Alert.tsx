import React from "react";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";

/**
 * Alert Component
 *
 * Alert boxes for different message types
 *
 * @param {string} variant - Alert type (info, success, warning, danger)
 * @param {string} title - Alert title
 * @param {React.ReactNode} children - Alert message content
 * @param {boolean} dismissible - Show close button
 * @param {function} onDismiss - Dismiss handler
 * @param {string} className - Additional CSS classes
 */

const Alert = ({
  variant = "info",
  title = "",
  children,
  dismissible = false,
  onDismiss,
  className = "",
  ...props
}: any) => {
  const variants: any = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-900/30",
      icon: Info,
      iconColor: "text-blue-600 dark:text-blue-400",
      titleColor: "text-blue-900 dark:text-blue-100",
      textColor: "text-blue-700 dark:text-blue-300",
    },
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-900/30",
      icon: CheckCircle,
      iconColor: "text-green-600 dark:text-green-400",
      titleColor: "text-green-900 dark:text-green-100",
      textColor: "text-green-700 dark:text-green-300",
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-900/30",
      icon: AlertTriangle,
      iconColor: "text-yellow-600 dark:text-yellow-400",
      titleColor: "text-yellow-900 dark:text-yellow-100",
      textColor: "text-yellow-700 dark:text-yellow-300",
    },
    danger: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-900/30",
      icon: XCircle,
      iconColor: "text-red-600 dark:text-red-400",
      titleColor: "text-red-900 dark:text-red-100",
      textColor: "text-red-700 dark:text-red-300",
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-xl p-4 ${className}`}
      role="alert"
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1">
          {title && (
            <h4 className={`text-sm font-bold ${config.titleColor} mb-1`}>
              {title}
            </h4>
          )}
          <div className={`text-sm ${config.textColor}`}>{children}</div>
        </div>

        {dismissible && (
          <button
            onClick={onDismiss}
            className={`shrink-0 ${config.iconColor} hover:opacity-70 transition-opacity`}
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
