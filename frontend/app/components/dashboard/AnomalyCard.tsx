import React from "react";
import { Server, HardDrive, Database, Cloud } from "lucide-react";

/**
 * AnomalyCard Component
 *
 * Display detected cost anomalies with details
 *
 * @param {string} title - Anomaly title
 * @param {string} resource - Resource identifier
 * @param {string} service - AWS service type (ec2, rds, s3, lambda)
 * @param {string} severity - Severity level (critical, warning, medium, low)
 * @param {string} description - Anomaly description
 * @param {string} expectedCost - Expected cost value
 * @param {string} actualCost - Actual cost value
 * @param {string} deviation - Deviation percentage
 * @param {function} onClick - Click handler for details
 * @param {string} className - Additional CSS classes
 */

const AnomalyCard = ({
  title,
  resource,
  service = "ec2",
  severity = "warning",
  description,
  expectedCost = "",
  actualCost = "",
  deviation = "",
  onClick,
  className = "",
  ...props
}: any) => {
  const severityConfig: any = {
    critical: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-900/30",
      badge: "bg-red-600 text-white",
      iconBg: "bg-red-100 dark:bg-red-900/40",
      iconColor: "text-red-600 dark:text-red-400",
      textColor: "text-red-600 dark:text-red-400",
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-900/30",
      badge: "bg-yellow-600 text-white",
      iconBg: "bg-yellow-100 dark:bg-yellow-900/40",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      textColor: "text-yellow-600 dark:text-yellow-400",
    },
    medium: {
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-200 dark:border-orange-900/30",
      badge: "bg-orange-600 text-white",
      iconBg: "bg-orange-100 dark:bg-orange-900/40",
      iconColor: "text-orange-600 dark:text-orange-400",
      textColor: "text-orange-600 dark:text-orange-400",
    },
    low: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-900/30",
      badge: "bg-blue-600 text-white",
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      iconColor: "text-blue-600 dark:text-blue-400",
      textColor: "text-blue-600 dark:text-blue-400",
    },
  };

  const serviceIcons: any = {
    ec2: Server,
    rds: HardDrive,
    s3: Database,
    lambda: Cloud,
  };

  const config = severityConfig[severity];
  const ServiceIcon = serviceIcons[service] || Server;

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-xl p-4 transition-all hover:shadow-md ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 ${config.iconBg} rounded-lg flex items-center justify-center`}
          >
            <ServiceIcon className={`w-4 h-4 ${config.iconColor}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {title}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {resource}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-1 ${config.badge} text-xs font-bold rounded uppercase`}
        >
          {severity}
        </span>
      </div>

      <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
        {description}
      </p>

      {(expectedCost || actualCost) && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          Expected: <span className="font-semibold">{expectedCost}</span>
          {actualCost && (
            <>
              {" "}
              • Actual: <span className="font-semibold">{actualCost}</span>
            </>
          )}
          {deviation && (
            <>
              {" "}
              •{" "}
              <span className={`font-bold ${config.textColor}`}>
                {deviation}
              </span>
            </>
          )}
        </p>
      )}

      {onClick && (
        <button
          className={`text-xs ${config.textColor} font-semibold hover:underline`}
        >
          View Details →
        </button>
      )}
    </div>
  );
};

export default AnomalyCard;
