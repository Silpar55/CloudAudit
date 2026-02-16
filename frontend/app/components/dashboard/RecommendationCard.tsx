import React from "react";
import { TrendingDown, Database, Cloud, Server, Activity } from "lucide-react";

/**
 * RecommendationCard Component
 *
 * Display AI-generated cost optimization recommendations
 *
 * @param {string} title - Recommendation title
 * @param {string} description - Recommendation description
 * @param {string} service - AWS service type (ec2, rds, s3, lambda)
 * @param {string} savings - Estimated monthly savings
 * @param {number} confidence - Confidence score (0-100)
 * @param {string} variant - Card color variant
 * @param {function} onApply - Apply recommendation handler
 * @param {function} onLearnMore - Learn more handler
 * @param {string} className - Additional CSS classes
 */

const RecommendationCard = ({
  title,
  description,
  service = "ec2",
  savings = "",
  confidence = 0,
  variant = "default",
  onApply,
  onLearnMore,
  className = "",
  ...props
}: any) => {
  const variants: any = {
    default: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-900/30",
      iconBg: "bg-green-100 dark:bg-green-900/40",
      iconColor: "text-green-600 dark:text-green-400",
      savingsColor: "text-green-600 dark:text-green-400",
      confidenceBg: "bg-green-100 dark:bg-green-900/40",
      confidenceText: "text-green-700 dark:text-green-300",
      buttonColor: "text-green-600 dark:text-green-400",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-900/30",
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      iconColor: "text-blue-600 dark:text-blue-400",
      savingsColor: "text-blue-600 dark:text-blue-400",
      confidenceBg: "bg-blue-100 dark:bg-blue-900/40",
      confidenceText: "text-blue-700 dark:text-blue-300",
      buttonColor: "text-blue-600 dark:text-blue-400",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-200 dark:border-purple-900/30",
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      iconColor: "text-purple-600 dark:text-purple-400",
      savingsColor: "text-purple-600 dark:text-purple-400",
      confidenceBg: "bg-purple-100 dark:bg-purple-900/40",
      confidenceText: "text-purple-700 dark:text-purple-300",
      buttonColor: "text-purple-600 dark:text-purple-400",
    },
  };

  const serviceIcons: any = {
    ec2: Server,
    rds: Database,
    s3: Cloud,
    lambda: Activity,
  };

  const config = variants[variant];
  const ServiceIcon = serviceIcons[service] || TrendingDown;

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-xl p-4 transition-all hover:shadow-md ${className}`}
      {...props}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-8 h-8 ${config.iconBg} rounded-lg flex items-center justify-center shrink-0`}
        >
          <ServiceIcon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            {title}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {description}
          </p>
          <div className="flex items-center justify-between">
            {savings && (
              <span className={`text-xs font-bold ${config.savingsColor}`}>
                Save ~{savings}
              </span>
            )}
            {confidence > 0 && (
              <span
                className={`px-2 py-1 ${config.confidenceBg} ${config.confidenceText} text-xs font-semibold rounded`}
              >
                {confidence}% Confidence
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onApply && (
          <button
            onClick={onApply}
            className={`text-xs ${config.buttonColor} font-semibold hover:underline`}
          >
            Apply Recommendation →
          </button>
        )}
        {onLearnMore && (
          <button
            onClick={onLearnMore}
            className={`text-xs ${config.buttonColor} font-semibold hover:underline`}
          >
            Learn More →
          </button>
        )}
      </div>
    </div>
  );
};

export default RecommendationCard;
