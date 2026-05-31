import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationsPage from "./NotificationsPage";
import useNotifications from "../hooks/useNotifications";

vi.mock("../../../modules/landing/components/Navbar", () => ({
  default: () => <nav data-testid="navbar" />,
}));

vi.mock("../../../hooks/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock("../hooks/useNotifications", () => ({
  default: vi.fn(),
}));

vi.mock("react-redux", async () => {
  const actual = await vi.importActual("react-redux");
  return {
    ...actual,
    useSelector: (selector) =>
      selector({
        auth: {
          user: { _id: "user-1", name: "Asha" },
        },
      }),
  };
});

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

const baseHookState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  },
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  deleteAllNotifications: vi.fn(),
  loadMore: vi.fn(),
  hasMore: false,
  socketStatus: "connected",
};

const notification = (overrides = {}) => ({
  _id: overrides._id || "notification-1",
  title: overrides.title || "Application update",
  message: overrides.message || "Your application moved forward.",
  type: overrides.type || "application-status-updated",
  isRead: overrides.isRead ?? false,
  createdAt: overrides.createdAt || new Date().toISOString(),
});

const renderPage = (hookState = {}) => {
  useNotifications.mockReturnValue({
    ...baseHookState,
    ...hookState,
  });

  return render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>,
  );
};

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an all-notifications empty state", () => {
    renderPage();

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    expect(
      screen.getByText(/applications, matches, or system alerts/i),
    ).toBeInTheDocument();
  });

  it("shows the unread empty state after switching filters", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /filter/i }));
    fireEvent.click(screen.getByRole("button", { name: /^unread$/i }));

    expect(screen.getByText("No unread notifications")).toBeInTheDocument();
    expect(useNotifications).toHaveBeenLastCalledWith({
      filter: "unread",
      limit: 10,
    });
  });

  it("shows the read empty state after switching filters", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /filter/i }));
    fireEvent.click(screen.getByRole("button", { name: /^read$/i }));

    expect(screen.getByText("No read notifications")).toBeInTheDocument();
    expect(useNotifications).toHaveBeenLastCalledWith({
      filter: "read",
      limit: 10,
    });
  });

  it("hides pagination when fewer notifications than the page size are loaded", () => {
    renderPage({
      notifications: [
        notification({ _id: "1", title: "One" }),
        notification({ _id: "2", title: "Two", isRead: true }),
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
      },
      hasMore: false,
    });

    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("clears selected notifications when changing filters", () => {
    renderPage({
      notifications: [notification({ _id: "1", title: "Unread item" })],
    });

    fireEvent.click(screen.getByLabelText(/select unread item/i));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /filter/i }));
    fireEvent.click(screen.getByRole("button", { name: /^read$/i }));

    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
    expect(screen.getByText("No read notifications")).toBeInTheDocument();
  });

  it("shows notification skeletons while the first page is loading", () => {
    renderPage({
      loading: true,
      notifications: [],
    });

    expect(screen.getByLabelText("Loading notifications")).toBeInTheDocument();
    expect(screen.getAllByTestId("notification-skeleton")).toHaveLength(5);
  });

  it("shows a reconnecting status message", () => {
    renderPage({
      socketStatus: "reconnecting",
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Reconnecting notification updates...",
    );
  });
});
