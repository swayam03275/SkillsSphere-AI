export type DateStyle = "short" | "medium" | "long" | "iso";

export const DATE_STYLES = {
  SHORT: "short",
  MEDIUM: "medium",
  LONG: "long",
  ISO: "iso",
} as const;

const getDateTimeFormat = (locale: string) => {
  return new Intl.DateTimeFormat(locale);
};

const formatShort = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
};

const formatMedium = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatLong = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const formatIso = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const toDate = (input: Date | string | number): Date => {
  if (input instanceof Date) return input;
  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) return new Date();
  return parsed;
};

const DEFAULT_LOCALE = "en-US";

export const cleanDate = (
  input: Date | string | number,
  options?: {
    style?: DateStyle;
    locale?: string;
  },
): string => {
  const { style = "medium", locale = DEFAULT_LOCALE } = options || {};
  const date = toDate(input);

  switch (style) {
    case "short":
      return formatShort(date, locale);
    case "medium":
      return formatMedium(date, locale);
    case "long":
      return formatLong(date, locale);
    case "iso":
      return formatIso(date);
    default:
      return formatMedium(date, locale);
  }
};

export default cleanDate;