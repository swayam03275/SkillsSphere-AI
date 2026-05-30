import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResetPassword from "../ResetPassword";
import OAuthCallback from "../OAuthCallback";
import { reportError } from "../../../utils/errorReporter";

const toast = {
  success: vi.fn(),
  error: vi.fn(),
};

const navigate = vi.fn();
const dispatch = vi.fn();
let locationSearch = "";

vi.mock("../../../utils/errorReporter", () => ({
  reportError: vi.fn(),
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

const fillResetPasswordForm = () => {
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/otp/i), {
    target: { value: "123456" },
  });
  fireEvent.change(screen.getByLabelText(/^new password/i), {
    target: { value: "Password123!" },
  });
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { value: "Password123!" },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  reportError.mockResolvedValue({ success: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  locationSearch = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("auth sensitive logging", () => {
  it("shows a sanitized reset password failure message and reports safely", async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        message: "Invalid token reset-token-123 for user@example.com",
      }),
    });

    renderWithRouter(<ResetPassword />);

    fillResetPasswordForm();
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Unable to reset password. Please try again or request a new reset link.",
      );
    });
    expect(toast.error).toHaveBeenCalledWith(
      "Unable to reset password. Please try again or request a new reset link.",
    );
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining("reset-token-123"));
    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: "auth",
        feature: "reset-password",
        status: 400,
      }),
    );
    expect(reportError.mock.calls[0][0].message).not.toContain("reset-token-123");
    expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining("reset-token-123"));
  });

  it("preserves reset password success flow", async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    renderWithRouter(<ResetPassword />);

    fillResetPasswordForm();
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/password reset successful/i)).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("Password reset successfully!");
    expect(reportError).not.toHaveBeenCalled();
  });

  it("shows sanitized OAuth failure message without logging raw token details", async () => {
    locationSearch = "?code=oauth-secret-code";
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        message: "OAuth exchange failed for accessToken=secret-access-token",
      }),
    });

    renderWithRouter(<OAuthCallback />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Authentication failed. Please try signing in again.");
    });

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: "auth",
        feature: "oauth-callback",
      }),
    );
    expect(reportError.mock.calls[0][0].message).not.toContain("secret-access-token");
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining("secret-access-token"));
    expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining("secret-access-token"));
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("preserves OAuth success flow", async () => {
    locationSearch = "?code=oauth-code";
    sessionStorage.setItem("oauth_redirect", "/dashboard");
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        token: "oauth-token",
        user: { _id: "user-1", name: "Asha", email: "asha@example.com" },
      }),
    });

    renderWithRouter(<OAuthCallback />);

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Welcome Asha!");
      expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });

    expect(reportError).not.toHaveBeenCalled();
  });
});
