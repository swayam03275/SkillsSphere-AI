import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OAuthCallback, { sanitizeOAuthRedirect } from "../OAuthCallback";

const toast = {
  success: vi.fn(),
  error: vi.fn(),
};

const navigate = vi.fn();
const dispatch = vi.fn();
let locationSearch = "";

vi.mock("../../../utils/errorReporter", () => ({
  reportError: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("../../../hooks/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock("../../../shared/components", async () => {
  const actual = await vi.importActual("../../../shared/components");
  return {
    ...actual,
    useToast: () => toast,
  };
});

vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useDispatch: () => dispatch,
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
    useLocation: () => ({ search: locationSearch }),
  };
});

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

const mockSuccessfulExchange = () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      token: "oauth-token",
      user: { _id: "user-1", name: "Asha", email: "asha@example.com" },
    }),
  });
};

const completeOAuthWithStoredRedirect = async (redirectValue) => {
  locationSearch = "?code=oauth-code";
  sessionStorage.clear();
  navigate.mockClear();
  dispatch.mockClear();
  toast.success.mockClear();
  toast.error.mockClear();
  mockSuccessfulExchange();

  if (redirectValue !== undefined) {
    sessionStorage.setItem("oauth_redirect", redirectValue);
  }

  renderWithRouter(<OAuthCallback />);

  await waitFor(() => {
    expect(dispatch).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Welcome Asha!");
    expect(navigate).toHaveBeenCalled();
  });

  return navigate.mock.calls.at(-1);
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  locationSearch = "";
  mockSuccessfulExchange();
});

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("sanitizeOAuthRedirect", () => {
  it.each([
    "/dashboard",
    "/profile",
    "/settings",
    "/jobs/123",
  ])("allows safe internal redirect %s", (redirectValue) => {
    expect(sanitizeOAuthRedirect(redirectValue)).toBe(redirectValue);
  });

  it.each([
    "https://evil.com",
    "http://evil.com",
    "https://phishing-site.example",
    "//evil.com",
    "///evil.com",
    "javascript:alert(1)",
    "javascript:void(0)",
    "JAVASCRIPT:alert(1)",
    "",
    "   ",
    "%",
    "/%E0%A4%A",
    "/\\evil.com",
    "\\evil.com",
    "/safe\\..\\evil",
    "not-a-path",
    "://",
  ])("falls back for unsafe redirect %s", (redirectValue) => {
    expect(sanitizeOAuthRedirect(redirectValue)).toBe("/dashboard");
  });
});

describe("OAuthCallback redirect handling", () => {
  it.each([
    "/dashboard",
    "/profile",
    "/settings",
    "/jobs/123",
  ])("navigates to safe internal redirect %s after OAuth completion", async (redirectValue) => {
    const navigateCall = await completeOAuthWithStoredRedirect(redirectValue);

    expect(navigateCall).toEqual([redirectValue, { replace: true }]);
    expect(sessionStorage.getItem("oauth_redirect")).toBeNull();
  });

  it.each([
    "https://evil.com",
    "http://evil.com",
    "https://phishing-site.example",
  ])("replaces external redirect %s with safe fallback", async (redirectValue) => {
    const navigateCall = await completeOAuthWithStoredRedirect(redirectValue);

    expect(navigateCall).toEqual(["/dashboard", { replace: true }]);
    expect(navigate).not.toHaveBeenCalledWith(redirectValue, expect.anything());
  });

  it.each([
    "//evil.com",
    "///evil.com",
  ])("rejects protocol-relative redirect %s", async (redirectValue) => {
    const navigateCall = await completeOAuthWithStoredRedirect(redirectValue);

    expect(navigateCall).toEqual(["/dashboard", { replace: true }]);
    expect(navigate).not.toHaveBeenCalledWith(redirectValue, expect.anything());
  });

  it.each([
    "javascript:alert(1)",
    "javascript:void(0)",
    "JAVASCRIPT:alert(1)",
  ])("rejects javascript redirect %s", async (redirectValue) => {
    const navigateCall = await completeOAuthWithStoredRedirect(redirectValue);

    expect(navigateCall).toEqual(["/dashboard", { replace: true }]);
    expect(navigate).not.toHaveBeenCalledWith(redirectValue, expect.anything());
  });

  it.each([
    "",
    "   ",
    "%",
    "/%E0%A4%A",
    "/\\evil.com",
    "\\evil.com",
    "/safe\\..\\evil",
    "not-a-path",
    "://",
  ])("falls back for malformed redirect value %s", async (redirectValue) => {
    const navigateCall = await completeOAuthWithStoredRedirect(redirectValue);

    expect(navigateCall).toEqual(["/dashboard", { replace: true }]);
    expect(navigate).not.toHaveBeenCalledWith(redirectValue, expect.anything());
  });

  it("falls back safely when no redirect value was stored", async () => {
    const navigateCall = await completeOAuthWithStoredRedirect(undefined);

    expect(navigateCall).toEqual(["/dashboard", { replace: true }]);
  });
});
