import React from "react";

/**
 * Input Component
 *
 * Supports: text, email, password, number, search
 * Features: label, error state, icon, disabled
 *
 * @param {string} type - Input type
 * @param {string} label - Label text
 * @param {string} placeholder - Placeholder text
 * @param {string} value - Input value
 * @param {function} onChange - Change handler
 * @param {boolean} disabled - Disabled state
 * @param {boolean} error - Error state
 * @param {string} errorMessage - Error message text
 * @param {React.ReactNode} icon - Optional icon (left side)
 * @param {string} className - Additional CSS classes
 */

const Input = ({
  type = "text",
  label = "",
  placeholder = "",
  value = "",
  onChange,
  disabled = false,
  error = false,
  errorMessage = "",
  icon = null,
  className = "",
  ...props
}: any) => {
  const baseInputStyles =
    "w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2";

  const normalBorder =
    "border-gray-300 dark:border-slate-600 focus:ring-aws-orange focus:border-transparent";
  const errorBorder = "border-red-500 focus:ring-red-500 focus:border-red-500";
  const disabledStyles =
    "disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

  const borderStyles = error ? errorBorder : normalBorder;
  const iconPadding = icon ? "pl-11" : "";

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {icon}
          </div>
        )}

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`${baseInputStyles} ${borderStyles} ${disabledStyles} ${iconPadding}`}
          {...props}
        />
      </div>

      {error && errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default Input;
