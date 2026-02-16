import React from "react";

/**
 * Button Component
 *
 * Variants: primary, secondary, outline, danger, ghost
 * Sizes: sm, md, lg
 *
 * @param {string} variant - Button style variant
 * @param {string} size - Button size
 * @param {boolean} disabled - Disabled state
 * @param {boolean} fullWidth - Full width button
 * @param {React.ReactNode} icon - Optional icon (Lucide React component)
 * @param {React.ReactNode} children - Button content
 * @param {function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 */

const Button = ({
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  icon = null,
  children,
  onClick,
  className = "",
  ...props
}: any) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants: any = {
    primary:
      "bg-aws-orange hover:bg-aws-orange-dark text-white shadow-md hover:shadow-lg focus:ring-aws-orange disabled:bg-gray-300 disabled:cursor-not-allowed",
    secondary:
      "bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white focus:ring-gray-300",
    outline:
      "border-2 border-aws-orange text-aws-orange hover:bg-aws-orange hover:text-white focus:ring-aws-orange",
    danger:
      "bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg focus:ring-red-500",
    ghost:
      "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:ring-gray-300",
  };

  const sizes: any = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-lg",
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
