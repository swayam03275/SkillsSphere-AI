import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NotificationsBell from "../NotificationsBell";
import useNotifications from "../../../modules/notifications/hooks/useNotifications";

vi.mock("../../../modules/notifications/hooks/useNotifications", () => ({
  default: vi.fn(),
}));

describe("NotificationsBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotifications.mockReturnValue({
      notifications: [
        {
          _id: "notification-1",
          title: "Interview scheduled",
          message: "Your mock interview starts soon.",
          type: "interview",
          isRead: false,
          createdAt: new Date("2026-05-26T10:00:00.000Z").toISOString(),
        },
      ],
      unreadCount: 2,
      loading: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      deleteAllNotifications: vi.fn(),
    });
  });

  it("renders the existing accessible notification bell and dropdown", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NotificationsBell />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", { name: /notifications/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.getByText("2")).toBeInTheDocument();

    await act(async () => {
      await user.click(button);
    });

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("dialog", { name: /notifications dropdown/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Interview scheduled")).toBeInTheDocument();
  });
});
