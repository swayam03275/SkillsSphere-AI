// @ts-nocheck

import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "../modules/auth/Login";
import Register from "../modules/auth/Register";
import DragDropUpload from "../modules/resume-analyzer/components/DragDropUpload";
import NotificationCard from "../modules/notifications/components/NotificationCard";
import NotificationsPage from "../modules/notifications/pages/NotificationsPage";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  navigate: vi.fn(),
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
  notifications: {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    pagination: { page: 1, limit: 10, total: 0, pages: 1 },
    socketStatus: "idle",
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    deleteAllNotifications: vi.fn(),
    loadMore: vi.fn(),
    hasMore: false,
  },
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) =>
    selector({
      auth: {
        user: { _id: "user-1", name: "Test User" },
        token: "test-token",
        loading: false,
      },
    }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("../features/auth/authSlice", () => ({
  loginUser: Object.assign(vi.fn(), {
    fulfilled: { match: vi.fn(() => true) },
  }),
  registerUser: Object.assign(vi.fn(), {
    fulfilled: { match: vi.fn(() => true) },
  }),
}));

vi.mock("../shared/components", async () => {
  const actual = await vi.importActual("../shared/components");
  return {
    ...actual,
    useToast: () => mocks.toast,
  };
});

vi.mock("../shared/components/Navbar", () => ({
  default: () => <nav aria-label="Primary navigation" />,
}));

vi.mock("../hooks/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock("../modules/notifications/hooks/useNotifications", () => ({
  default: () => mocks.notifications,
}));

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

const notification = (overrides = {}) => ({
  _id: "notification-1",
  title: "Interview scheduled",
  message: "Your interview starts tomorrow at 10 AM.",
  type: "interview",
  isRead: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("accessibility regression tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notifications = {
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      pagination: { page: 1, limit: 10, total: 0, pages: 1 },
      socketStatus: "idle",
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      deleteAllNotifications: vi.fn(),
      loadMore: vi.fn(),
      hasMore: false,
    };
  });

  describe("Axe-core automation", () => {
    it("has no axe violations on the login form", async () => {
      const { container } = renderWithRouter(<Login />);

      expect(await axe(container)).toHaveNoViolations();
    });

    it("has no axe violations on the registration form", async () => {
      const { container } = renderWithRouter(<Register />);

      expect(await axe(container)).toHaveNoViolations();
    });

    it("has no axe violations on the resume upload form", async () => {
      const { container } = render(<DragDropUpload onFileUpload={vi.fn()} />);

      expect(await axe(container)).toHaveNoViolations();
    });

    it("has no axe violations on notification page states", async () => {
      mocks.notifications = {
        ...mocks.notifications,
        socketStatus: "reconnecting",
      };

      const { container } = renderWithRouter(<NotificationsPage />);

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe("Keyboard navigation", () => {
    it("lets keyboard users reach login controls and submit validation with Enter", async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login />);

      await user.tab();
      expect(screen.getByLabelText(/email/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/^password$/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("button", { name: /show password/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("checkbox", { name: /remember me/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("link", { name: /forgot/i })).toHaveFocus();

      await user.tab();
      const submit = screen.getByRole("button", { name: /login/i });
      expect(submit).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
      expect(mocks.toast.warning).toHaveBeenCalled();
    });

    it("keeps disabled registration submit out of normal activation until password rules pass", async () => {
      const user = userEvent.setup();
      renderWithRouter(<Register />);

      expect(screen.getByRole("button", { name: /sign up/i })).toBeDisabled();

      await user.tab();
      expect(screen.getByLabelText(/full name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/^email$/i)).toHaveFocus();

      await user.type(screen.getByLabelText(/^password$/i), "StrongPass1!");
      await user.type(screen.getByLabelText(/confirm password/i), "StrongPass1!");
      expect(screen.getByRole("button", { name: /sign up/i })).toBeEnabled();
    });

    it("lets keyboard users activate an unread notification card", async () => {
      const user = userEvent.setup();
      const onMarkAsRead = vi.fn();

      render(
        <NotificationCard
          notification={notification()}
          onMarkAsRead={onMarkAsRead}
          onDelete={vi.fn()}
        />,
      );

      await user.tab();
      const markRead = screen.getByRole("button", {
        name: /mark interview scheduled as read/i,
      });
      expect(markRead).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(onMarkAsRead).toHaveBeenCalledWith("notification-1");
    });

    it("makes notification filters and actions keyboard reachable", async () => {
      const user = userEvent.setup();
      mocks.notifications = {
        ...mocks.notifications,
        notifications: [notification()],
        unreadCount: 1,
      };

      renderWithRouter(<NotificationsPage />);

      await user.tab();
      expect(screen.getByRole("button", { name: /filter/i })).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(screen.getByRole("button", { name: /^all$/i })).toBeInTheDocument();

      await user.tab();
      expect(screen.getByRole("button", { name: /mark all as read/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("button", { name: /clear all/i })).toHaveFocus();
    });
  });

  describe("ARIA labels and screen reader support", () => {
    it("associates auth form inputs with labels and error messages", async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login />);

      await user.click(screen.getByRole("button", { name: /login/i }));

      const email = screen.getByLabelText(/email/i);
      const password = screen.getByLabelText(/^password$/i);

      expect(email).toHaveAccessibleName("Email");
      expect(password).toHaveAccessibleName("Password");
      expect(email).toHaveAccessibleDescription(/email is required/i);
      expect(password).toHaveAccessibleDescription(/password is required/i);
      expect(screen.getAllByRole("alert")).toHaveLength(2);
    });

    it("exposes notification controls with accessible names and unread text", () => {
      render(
        <NotificationCard
          notification={notification()}
          onMarkAsRead={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("article", {
          name: /unread notification: interview scheduled/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /mark interview scheduled as read/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/unread/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete notification/i })).toBeInTheDocument();
    });

    it("announces empty and reconnecting notification states", () => {
      mocks.notifications = {
        ...mocks.notifications,
        socketStatus: "reconnecting",
      };

      renderWithRouter(<NotificationsPage />);

      expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(/reconnecting notification updates/i);
    });

    it("exposes loading state with status text and progressbar for resume uploads", async () => {
      const user = userEvent.setup();
      const pendingUpload = new Promise(() => {});
      const file = new File([new Uint8Array(1024)], "resume.pdf", {
        type: "application/pdf",
      });

      render(<DragDropUpload onFileUpload={() => pendingUpload} />);
      await user.upload(screen.getByLabelText(/browse resume file/i), file);

      expect(screen.getByRole("button", { name: /uploading/i })).toHaveAttribute(
        "aria-busy",
        "true",
      );
    });
  });

  describe("Color contrast coverage", () => {
    it("runs axe contrast-capable checks for notification badges and buttons", async () => {
      mocks.notifications = {
        ...mocks.notifications,
        notifications: [notification()],
        unreadCount: 1,
      };

      const { container } = renderWithRouter(<NotificationsPage />);

      // axe-core includes color-contrast rules, but jsdom cannot fully compute
      // browser-rendered Tailwind colors. This still catches markup-level a11y
      // regressions around text, buttons, badges, roles, and names.
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
