import React from "react";
import PropTypes from "prop-types";

/**
 * Select — Reusable dropdown/select component.
 *
 * Props
 * ─────
 * @param {string}   id          - Unique id (required for a11y label association)
 * @param {string}   label       - Visible label text
 * @param {Array<{value: string|number, label: string}>} options
 * @param {string|number} value  - Controlled value
 * @param {function} onChange    - Change handler
 * @param {string}   placeholder - Default blank option text (default: "Select an option")
 * @param {string}   error       - Error message
 * @param {string}   helperText  - Hint shown below when no error
 * @param {boolean}  disabled    - Disables the select
 * @param {boolean}  required    - Marks field as required
 * @param {string}   className   - Extra Tailwind classes for wrapper
 */
const Select = ({
  id,
  label,
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  error,
  helperText,
  disabled = false,
  required = false,
  className = "",
  ...rest
}) => {
  const hasError = Boolean(error);

  const selectClasses = [
    "w-full appearance-none rounded-lg border bg-gray-100 dark:bg-slate-800 px-3.5 py-2.5 pr-9",
    "text-sm transition-all duration-150 cursor-pointer",
    "focus:outline-none focus:ring-2 focus:ring-offset-0",
    hasError
      ? "border-red-400 text-white focus:ring-red-400 focus:border-red-400"
      : "border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 dark:hover:border-slate-500",
    disabled
      ? "cursor-not-allowed bg-gray-200 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500 border-gray-300 dark:border-slate-700"
      : "",
    !value ? "text-gray-400 dark:text-slate-400" : "text-gray-900 dark:text-white",
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

      {/* Select wrapper (position-relative for custom caret) */}
      <div className="relative flex items-center">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined
          }
          className={selectClasses}
          {...rest}
        >
          {/* Blank placeholder option */}
          <option value="" disabled hidden>
            {placeholder}
          </option>

          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom chevron icon */}
        <span
          className={`pointer-events-none absolute right-3 flex items-center ${
            disabled ? "text-slate-300" : "text-slate-500"
          }`}
          aria-hidden="true"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>

      {/* Error or helper text */}
      {hasError ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-red-500 flex items-center gap-1"
        >
          <svg
            className="w-3.5 h-3.5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
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

Select.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
};

export default Select;
