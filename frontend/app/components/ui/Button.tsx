/**
 * CloudAudit — Shared UI primitive: `Button.tsx`.
 * Reusable across features; keep presentation-agnostic where possible.
 */

import React from "react";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Button = ({
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  icon = null,
  children,
  className = "",
  ...props
}: ButtonProps) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants: Record<Variant, string> = {
    primary:
      "bg-aws-orange text-white shadow-md hover:bg-aws-orange-dark hover:shadow-lg focus:ring-aws-orange",
    secondary:
      "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600 focus:ring-gray-300",
    outline:
      "border-2 border-aws-orange text-aws-orange hover:bg-aws-orange hover:text-white focus:ring-aws-orange",
    danger:
      "bg-red-500 text-white shadow-md hover:bg-red-600 hover:shadow-lg focus:ring-red-500",
    ghost:
      "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:ring-gray-300",
  };

  const sizes: Record<Size, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-lg",
  };

  const widthClass = fullWidth ? "w-full" : "";

  const disabledStyles = disabled
    ? "opacity-50 cursor-not-allowed pointer-events-none shadow-none hover:bg-none"
    : "";

  return (
    <button
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${disabledStyles} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
