import React from "react";

/**
 * Textarea Component
 *
 * Multi-line text input with consistent styling
 *
 * @param {string} label - Label text
 * @param {string} placeholder - Placeholder text
 * @param {string} value - Textarea value
 * @param {function} onChange - Change handler
 * @param {number} rows - Number of rows
 * @param {boolean} disabled - Disabled state
 * @param {boolean} error - Error state
 * @param {string} errorMessage - Error message
 * @param {boolean} resize - Allow resize (default: false)
 * @param {string} className - Additional CSS classes
 */

const Textarea = ({
  label = "",
  placeholder = "",
  value = "",
  onChange,
  rows = 4,
  disabled = false,
  error = false,
  errorMessage = "",
  resize = false,
  className = "",
  ...props
}: any) => {
  const baseStyles =
    "w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2";

  const normalBorder =
    "border-gray-300 dark:border-slate-600 focus:ring-aws-orange focus:border-transparent";
  const errorBorder = "border-red-500 focus:ring-red-500 focus:border-red-500";
  const disabledStyles =
    "disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
  const resizeStyles = resize ? "resize-y" : "resize-none";

  const borderStyles = error ? errorBorder : normalBorder;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`${baseStyles} ${borderStyles} ${disabledStyles} ${resizeStyles}`}
        {...props}
      />

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

export default Textarea;
