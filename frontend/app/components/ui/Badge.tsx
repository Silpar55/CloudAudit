import React from "react";

/**
 * Badge Component
 *
 * Status badges and tags with different variants
 *
 * @param {string} variant - Badge color variant
 * @param {string} size - Badge size
 * @param {React.ReactNode} children - Badge content
 * @param {React.ReactNode} icon - Optional icon
 * @param {string} className - Additional CSS classes
 */

const Badge = ({
  variant = "default",
  size = "md",
  children,
  icon = null,
  className = "",
  ...props
}: any) => {
  const baseStyles =
    "inline-flex items-center gap-1.5 font-bold rounded-full transition-colors";

  const variants: any = {
    default: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
    primary: "bg-aws-orange/10 text-aws-orange border border-aws-orange/20",
    success:
      "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    warning:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    danger: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    info: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  };

  const sizes: any = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
