import React, { useState } from "react";
import PropTypes from "prop-types";
import { Eye, EyeOff } from "lucide-react";

/**
 * Input — Reusable text input component.
 *
 * Props
 * ─────
 * @param {string}   id          - Unique id (required for a11y label association)
 * @param {string}   label       - Visible label text
 * @param {string}   type        - HTML input type (default: "text")
 * @param {string}   placeholder - Placeholder text
 * @param {string|number} value  - Controlled value
 * @param {function} onChange    - Change handler
 * @param {string}   error       - Error message (shows red border + message)
 * @param {string}   helperText  - Subtle hint shown below input when no error
 * @param {boolean}  disabled    - Disables the input
 * @param {boolean}  required    - Marks field as required
 * @param {string}   className   - Extra Tailwind classes for the wrapper
 * @param {React.ReactNode} leftIcon  - Icon element rendered inside left edge
 * @param {React.ReactNode} rightIcon - Icon element rendered inside right edge
 */
const Input = ({
  id,
  label,
  type = "text",
  placeholder = "",
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  className = "",
  leftIcon,
  rightIcon,
  ...rest
}) => {
  const hasError = Boolean(error);
  const [showPassword, setShowPassword] = useState(false);
  
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  const baseInput = [
    "w-full rounded-lg border bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white caret-gray-900 dark:caret-white",
    "placeholder:text-gray-500 transition-all duration-150",
    "focus:outline-none focus:ring-2 focus:ring-offset-0",
    "autofill-fix",
    leftIcon ? "pl-10" : "",
    (rightIcon || isPassword) ? "pr-10" : "",
    hasError
      ? "border-red-400 focus:ring-red-400 focus:border-red-400"
      : "border-gray-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500",
    disabled
      ? "cursor-not-allowed bg-gray-100 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-700"
      : "hover:border-gray-400 dark:hover:border-slate-500",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 flex items-center text-slate-400">
            {leftIcon}
          </span>
        )}

        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined
          }
          className={baseInput}
          {...rest}
        />

        {isPassword && !rightIcon ? (
          <button
            type="button"
            className="absolute right-3 flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors bg-transparent border-none p-0 cursor-pointer"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : rightIcon ? (
          <span className="pointer-events-none absolute right-3 flex items-center text-slate-400">
            {rightIcon}
          </span>
        ) : null}
      </div>

      {/* Error or helper text */}
      {hasError ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-xs text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

Input.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  error: PropTypes.string,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
};

export default Input;
