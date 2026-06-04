import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationItem, { isSafeNotificationActionUrl } from "./NotificationItem";

const dispatch = vi.fn();
const navigate = vi.fn();

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
  };
});

vi.mock("../../features/notifications/notificationsSlice", () => ({
  markAsRead: (id) => ({ type: "notifications/markAsRead", payload: id }),
  deleteNotificationById: (id) => ({
    type: "notifications/deleteNotificationById",
    payload: id,
  }),
}));

const notification = (actionUrl) => ({
  _id: "notification-1",
  title: "Profile updated",
  message: "View the latest notification details.",
  type: "info",
  isRead: false,
  createdAt: new Date("2026-06-03T10:00:00.000Z").toISOString(),
  metadata: { actionUrl },
});

const renderNotification = (actionUrl) => {
  const onCloseDropdown = vi.fn();

  render(
    <NotificationItem
      notification={notification(actionUrl)}
      onCloseDropdown={onCloseDropdown}
    />,
  );

  return { onCloseDropdown };
};

describe("NotificationItem actionUrl safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("allows safe internal actionUrl navigation from the action link", async () => {
    const user = userEvent.setup();
    const { onCloseDropdown } = renderNotification("/jobs/123");

    await user.click(screen.getByText(/view details/i));

    expect(navigate).toHaveBeenCalledWith("/jobs/123");
    expect(onCloseDropdown).toHaveBeenCalledTimes(1);
  });

  it("allows safe internal actionUrl navigation from the notification row", async () => {
    const user = userEvent.setup();
    const { onCloseDropdown } = renderNotification("/profile");

    await user.click(screen.getByText("Profile updated"));

    expect(navigate).toHaveBeenCalledWith("/profile");
    expect(onCloseDropdown).toHaveBeenCalledTimes(1);
  });

  const unsafeActionUrls = [
    ["malicious external actionUrl", "https://evil.com"],
    ["http external actionUrl", "http://evil.com"],
    ["protocol-relative actionUrl", "//evil.com"],
    ["javascript actionUrl", "javascript:alert(1)"],
    ["encoded external actionUrl", "https%3A%2F%2Fevil.com"],
    ["encoded protocol-relative actionUrl", "%2F%2Fevil.com"],
    ["malformed actionUrl", "%"],
    ["backslash redirect trick", "/\\evil.com"],
  ];

  for (const [name, actionUrl] of unsafeActionUrls) {
    it(`blocks ${name}`, async () => {
      const user = userEvent.setup();
      const originalHref = window.location.href;
      const { onCloseDropdown } = renderNotification(actionUrl);

      expect(screen.queryByText(/view details/i)).not.toBeInTheDocument();

      await user.click(screen.getByText("Profile updated"));

      expect(navigate).not.toHaveBeenCalled();
      expect(onCloseDropdown).not.toHaveBeenCalled();
      expect(window.location.href).toBe(originalHref);
    });
  }

  it("validates notification actionUrl values without direct external navigation", () => {
    expect(isSafeNotificationActionUrl("/dashboard")).toBe(true);
    expect(isSafeNotificationActionUrl("/profile")).toBe(true);
    expect(isSafeNotificationActionUrl("/jobs/123")).toBe(true);
    expect(isSafeNotificationActionUrl("https://evil.com")).toBe(false);
    expect(isSafeNotificationActionUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeNotificationActionUrl("%2F%2Fevil.com")).toBe(false);
  });
});
