import React from "react";

/**
 * Card Component
 *
 * Basic card container with consistent styling
 *
 * @param {React.ReactNode} children - Card content
 * @param {boolean} hover - Enable hover effect
 * @param {boolean} clickable - Add cursor pointer
 * @param {function} onClick - Click handler
 * @param {string} padding - Padding size (sm, md, lg, none)
 * @param {string} className - Additional CSS classes
 */

const Card = ({
  children,
  hover = false,
  clickable = false,
  onClick,
  padding = "md",
  className = "",
  ...props
}: any) => {
  const baseStyles =
    "bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 transition-all duration-200";

  const hoverStyles = hover
    ? "hover:shadow-xl hover:border-aws-orange/30 transform hover:-translate-y-0.5"
    : "";
  const cursorStyles = clickable || onClick ? "cursor-pointer" : "";

  const paddingStyles: any = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${hoverStyles} ${cursorStyles} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
