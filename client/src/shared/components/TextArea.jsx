import PropTypes from "prop-types";

/**
 * TextArea — Reusable multi-line text input component.
 */
const TextArea = ({
  id,
  label,
  placeholder = "",
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  className = "",
  rows = 4,
  ...rest
}) => {
  const hasError = Boolean(error);

  const baseTextArea = [
    "w-full rounded-xl border bg-white dark:bg-slate-800/50 px-4 py-3 text-sm text-gray-900 dark:text-white caret-primary transition-all duration-200 outline-none",
    "placeholder:text-gray-500 focus:ring-2",
    hasError
      ? "border-red-400 focus:ring-red-400/20 focus:border-red-400"
      : "border-gray-300 dark:border-slate-700 focus:ring-primary/20 focus:border-primary",
    disabled
      ? "opacity-50 cursor-not-allowed"
      : "hover:border-gray-400 dark:hover:border-slate-600",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-semibold text-gray-300 flex items-center gap-1"
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        rows={rows}
        className={baseTextArea}
        {...rest}
      />

      {hasError ? (
        <p id={`${id}-error`} className="text-xs text-red-400 mt-1">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-xs text-slate-500 mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

TextArea.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.string,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  rows: PropTypes.number,
};

export default TextArea;
