import React from "react";

/**
 * MetricCard Component
 *
 * Display key metrics with icon, value, and trend
 *
 * @param {string} title - Metric title
 * @param {string|number} value - Main metric value
 * @param {string} subtitle - Subtitle/description
 * @param {React.ReactNode} icon - Icon component
 * @param {string} trend - Trend indicator (e.g., "+8.2%", "-3%")
 * @param {string} trendType - Trend type (positive, negative, neutral)
 * @param {string} variant - Card variant (default, gradient)
 * @param {string} gradientFrom - Gradient start color (for gradient variant)
 * @param {string} gradientTo - Gradient end color (for gradient variant)
 * @param {string} className - Additional CSS classes
 */

const MetricCard = ({
  title,
  value,
  subtitle = "",
  icon,
  trend = "",
  trendType = "neutral",
  variant = "default",
  gradientFrom = "from-aws-orange",
  gradientTo = "to-brand-coral",
  className = "",
  ...props
}: any) => {
  const trendColors: any = {
    positive:
      "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    negative: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    neutral: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  };

  if (variant === "gradient") {
    return (
      <div
        className={`bg-linear-to-br ${gradientFrom} ${gradientTo} rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform ${className}`}
        {...props}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
            {icon}
          </div>
          {trend && (
            <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full backdrop-blur">
              {trend}
            </span>
          )}
        </div>
        <h3 className="text-3xl font-bold mb-1">{value}</h3>
        <p className="text-white/80 text-sm font-medium">{title}</p>
        {subtitle && <p className="text-white/60 text-xs mt-2">{subtitle}</p>}
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-slate-700 transform hover:scale-105 transition-transform ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full ${trendColors[trendType]}`}
          >
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
        {title}
      </p>
      {subtitle && (
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default MetricCard;
