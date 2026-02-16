import React from "react";
import { ChevronDown } from "lucide-react";

/**
 * Select Component
 *
 * Dropdown select input with consistent styling
 *
 * @param {string} label - Label text
 * @param {string} value - Selected value
 * @param {function} onChange - Change handler
 * @param {Array} options - Array of {value, label} objects
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Disabled state
 * @param {boolean} error - Error state
 * @param {string} errorMessage - Error message
 * @param {string} className - Additional CSS classes
 */

const Select = ({
  label = "",
  value = "",
  onChange,
  options = [],
  placeholder = "Select an option",
  disabled = false,
  error = false,
  errorMessage = "",
  className = "",
  ...props
}: any) => {
  const baseStyles =
    "w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border rounded-lg text-gray-900 dark:text-white transition-all duration-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer";

  const normalBorder =
    "border-gray-300 dark:border-slate-600 focus:ring-aws-orange focus:border-transparent";
  const errorBorder = "border-red-500 focus:ring-red-500 focus:border-red-500";
  const disabledStyles =
    "disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

  const borderStyles = error ? errorBorder : normalBorder;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`${baseStyles} ${borderStyles} ${disabledStyles}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option: any) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
          <ChevronDown className="w-5 h-5" />
        </div>
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

export default Select;
