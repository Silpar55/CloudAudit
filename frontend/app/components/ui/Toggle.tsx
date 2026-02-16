import React from "react";

/**
 * Toggle Component
 *
 * Switch/toggle input with label
 *
 * @param {string} label - Label text
 * @param {boolean} checked - Toggle state
 * @param {function} onChange - Change handler
 * @param {boolean} disabled - Disabled state
 * @param {string} className - Additional CSS classes
 */

const Toggle = ({
  label = "",
  checked = false,
  onChange,
  disabled = false,
  className = "",
  ...props
}: any) => {
  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-aws-orange focus:ring-offset-2 ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${checked ? "bg-aws-orange" : "bg-gray-300 dark:bg-slate-600"}`}
        {...props}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
};

export default Toggle;
