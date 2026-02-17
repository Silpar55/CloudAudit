import React, { useState } from "react";
import PhoneInput, { parsePhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css"; // Import default styles for the country select
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for cleaner tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Input Component
 *
 * Supports: text, email, password, number, search, phone
 * Features: label, error state, icon, disabled, password toggle, phone formatting
 */

const Input = ({
  type = "text",
  label = "",
  placeholder = "",
  value,
  onChange,
  onBlur,
  disabled = false,
  error = false,
  errorMessage = "",
  required = false,
  icon = null,
  className = "",
  ...props
}: any) => {
  const [showPassword, setShowPassword] = useState(false);

  // Dynamic input type for password toggling
  const inputType = type === "password" && showPassword ? "text" : type;

  // Base styles matching your original design
  const baseInputStyles =
    "w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2";

  const normalBorder =
    "border-gray-300 dark:border-slate-600 focus:ring-aws-orange focus:border-transparent";
  const errorBorder = "border-red-500 focus:ring-red-500 focus:border-red-500";
  const disabledStyles =
    "disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

  const borderStyles = error ? errorBorder : normalBorder;

  // Padding adjustment if an icon is present (not applied to phone type usually)
  const iconPadding = icon ? "pl-11" : "";

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Left Icon (Standard Inputs) */}
        {icon && type !== "phone" && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10">
            {icon}
          </div>
        )}

        {/* --- PHONE INPUT VARIANT --- */}
        {type === "phone" ? (
          <>
            <PhoneInput
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              disabled={disabled}
              defaultCountry="CA"
              className={cn(
                "[&>.PhoneInputInput]:bg-transparent [&>.PhoneInputInput]:outline-none",
                "[&>.PhoneInputCountry]:mr-2",
                baseInputStyles,
                borderStyles,
                disabledStyles,
              )}
            />

            {(() => {
              const phone = value;
              const parsed = phone ? parsePhoneNumber(phone) : undefined;

              return (
                <>
                  <input
                    type="hidden"
                    name="phone"
                    value={parsed?.nationalNumber || ""}
                    required={required}
                  />
                  <input
                    type="hidden"
                    name="countryCode"
                    value={parsed?.country || ""}
                    required={required}
                  />
                </>
              );
            })()}
          </>
        ) : (
          /* --- STANDARD INPUT VARIANT --- */
          <input
            type={inputType}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              baseInputStyles,
              borderStyles,
              disabledStyles,
              iconPadding,
              type === "password" ? "pr-12" : "", // Extra padding for password eye
            )}
            required={required}
            {...props}
          />
        )}

        {/* Password Toggle Button */}
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
          >
            {showPassword ? (
              // Eye Off Icon
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              // Eye Icon
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
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
