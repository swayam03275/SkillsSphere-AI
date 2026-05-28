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

export const apiRequest = async (path, options = {}) => {
  const { method = "GET", body, token, headers = {}, signal } = options;

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
    if (contentType.includes("application/json")) {
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
    (data &&
      typeof data === "object" &&
      typeof data.message === "string" &&
      data.message) ||
    (typeof error.message === "string" && error.message) ||
    "Something went wrong";

  const errors =
    (data &&
      typeof data === "object" &&
      typeof data.errors === "object" &&
      data.errors) ||
    (typeof error.errors === "object" && error.errors) ||
    {};

  return {
    status,
    message,
    errors,
    data,
  };
};
