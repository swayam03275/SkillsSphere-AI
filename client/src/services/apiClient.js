import { API_URL } from "../config/env";

const getApiBaseUrl = () => {
  return API_URL;
};

const toUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return path;
  if (typeof path !== "string") return path;
  if (!path.startsWith("/")) return path;
  return `${baseUrl}${path}`;
};

const isPlainObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const MAX_EXTRACT_DEPTH = 10;

const extractApiMessage = (value, depth = 0) => {
  if (depth >= MAX_EXTRACT_DEPTH) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractApiMessage(item, depth + 1);
      if (message) {
        return message;
      }
    }
    return null;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  return (
    extractApiMessage(value.message, depth + 1) ||
    extractApiMessage(value.msg, depth + 1) ||
    extractApiMessage(value.detail, depth + 1) ||
    extractApiMessage(value.error, depth + 1) ||
    extractApiMessage(value.details, depth + 1)
  );
};

const getValidationFieldName = (location) => {
  if (typeof location === "string") {
    return location;
  }

  if (!Array.isArray(location)) {
    return null;
  }

  const segments = location.filter(
    (segment) =>
      typeof segment === "string" && !["body", "query", "path", "header"].includes(segment),
  );

  return segments.length > 0 ? segments.join(".") : null;
};

const normalizeValidationErrors = (value) => {
  if (!Array.isArray(value)) {
    return {};
  }

  return value.reduce((accumulator, item) => {
    if (!isPlainObject(item)) {
      return accumulator;
    }

    const fieldName =
      getValidationFieldName(item.loc) ||
      getValidationFieldName(item.location) ||
      getValidationFieldName(item.field) ||
      getValidationFieldName(item.path) ||
      getValidationFieldName(item.param);

    const message =
      extractApiMessage(item.msg) ||
      extractApiMessage(item.message) ||
      extractApiMessage(item.detail) ||
      extractApiMessage(item.error);

    if (fieldName && message) {
      accumulator[fieldName] = message;
    }

    return accumulator;
  }, {});
};

const isFieldErrorObject = (value) => {
  if (!isPlainObject(value)) {
    return false;
  }

  return Object.keys(value).some(
    (key) => !["message", "detail", "details", "error", "errors", "status", "code"].includes(key),
  );
};

const extractApiErrors = (value) => {
  if (!isPlainObject(value)) {
    if (Array.isArray(value)) {
      return normalizeValidationErrors(value);
    }

    return {};
  }

  const candidates = [value.errors, value.details, value.error, value.detail];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const normalizedErrors = normalizeValidationErrors(candidate);
      if (Object.keys(normalizedErrors).length > 0) {
        return normalizedErrors;
      }
    }

    if (isFieldErrorObject(candidate)) {
      return candidate;
    }

    if (isPlainObject(candidate)) {
      const nestedErrors = extractApiErrors(candidate);
      if (Object.keys(nestedErrors).length > 0) {
        return nestedErrors;
      }
    }
  }

  return {};
};

export const apiRequest = async (path, options = {}) => {
  const { method = "GET", body, token, headers = {}, signal, keepalive, responseType } = options;

  const url = toUrl(path);

  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const init = {
    method,
    headers: requestHeaders,
    signal,
    ...(keepalive !== undefined && { keepalive }),
  };

  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      requestHeaders["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    const networkError = new Error("Network error");
    networkError.status = 0;
    networkError.cause = cause;
    networkError.url = url;
    networkError.method = method;
    throw networkError;
  }

  const contentType = response.headers.get("content-type") || "";

  let data = null;
  if (response.status !== 204) {
    if (responseType === "blob") {
      try {
        data = await response.blob();
      } catch {
        data = null;
      }
    } else if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      try {
        const text = await response.text();
        data = text ? { message: text } : null;
      } catch {
        data = null;
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    const message =
      (data &&
        typeof data === "object" &&
        typeof data.message === "string" &&
        data.message) ||
      response.statusText ||
      "Request failed";

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    error.errors =
      (data &&
        typeof data === "object" &&
        (data.errors || data.error || data.details)) ||
      undefined;
    error.url = url;
    error.method = method;

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("api:error", { detail: { message: error.message, status: error.status } }));
    }

    throw error;
  }

  return data ?? {};
};

export const normalizeApiError = (error) => {
  if (!error) {
    return {
      status: 500,
      message: "Something went wrong",
      errors: {},
      data: null,
    };
  }

  const status =
    (typeof error.status === "number" && error.status) ||
    (typeof error.response?.status === "number" && error.response.status) ||
    500;

  const data = error.data ?? error.response?.data ?? null;

  const message =
    extractApiMessage(data) ||
    (typeof error.message === "string" && error.message) ||
    "Something went wrong";

  const errors =
    extractApiErrors(data) ||
    (isFieldErrorObject(error.errors) && error.errors) ||
    {};

  return {
    status,
    message,
    errors,
    data,
  };
};
