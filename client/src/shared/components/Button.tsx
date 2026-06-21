
import React from "react";
import { Link } from "react-router-dom";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  fullWidth?: boolean;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  to?: string;
}


/**
 * Button — Reusable button component.
 *
 * Props
 * ─────
 * @param {React.ReactNode} children - Button label / content
 * @param {"primary"|"secondary"|"outline"|"ghost"|"danger"} variant
 * @param {"sm"|"md"|"lg"} size
 * @param {boolean}  loading   - Shows spinner and prevents clicks
 * @param {boolean}  disabled  - Disables the button
 * @param {"button"|"submit"|"reset"} type
 * @param {function} onClick
 * @param {boolean}  fullWidth - Expands to container width
 * @param {string}   className - Extra Tailwind classes
 * @param {React.ReactNode} leftIcon  - Icon before label
 * @param {React.ReactNode} rightIcon - Icon after label
 */

const VARIANT_STYLES = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
  secondary:
    "bg-brand-100 text-brand-700 hover:bg-brand-200 active:bg-brand-300",
  outline:
    "border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 shadow-sm",
  ghost:
    "text-slate-600 hover:bg-slate-100 active:bg-slate-200",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
};

const SIZE_STYLES = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
};

const ICON_SIZE = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

/** Inline SVG spinner */
const Spinner = ({ sizeClass }: { sizeClass: string }) => (
  <svg
    className={`${sizeClass} animate-spin`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  onClick,
  fullWidth = false,
  className = "",
  leftIcon,
  rightIcon,
  to,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const classes = [
    "inline-flex items-center justify-center font-medium",
    "transition-all duration-150 ease-in-out",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
    "select-none whitespace-nowrap",
    VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary,
    SIZE_STYLES[size] ?? SIZE_STYLES.md,
    fullWidth ? "w-full" : "",
    isDisabled
      ? "opacity-50 cursor-not-allowed"
      : "cursor-pointer active:scale-[0.98]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const iconSize = ICON_SIZE[size] ?? ICON_SIZE.md;

  const content = (
    <>
      {loading ? (
        <Spinner sizeClass={iconSize} />
      ) : (
        leftIcon && (
          <span className={`${iconSize} shrink-0`} aria-hidden="true">
            {leftIcon}
          </span>
        )
      )}

      {/* Hide label visually when loading to keep button width stable */}
      <span className={loading ? "sr-only" : ""}>{children}</span>

      {!loading && rightIcon && (
        <span className={`${iconSize} shrink-0`} aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </>
  );

  if (to && !isDisabled) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button
      // @ts-expect-error TODO: Fix pervasive types
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  );
};


export default Button;
