import { describe, expect, it } from "vitest";
import reducer, {
  addLiveNotification,
  getNotifications,
  setSocketStatus,
} from "./notificationsSlice";

const notification = (overrides = {}) => ({
  _id: overrides._id || "notification-1",
  title: overrides.title || "Notification",
  message: overrides.message || "Message",
  isRead: overrides.isRead ?? false,
  createdAt: overrides.createdAt || new Date().toISOString(),
});

describe("notificationsSlice", () => {
  it("deduplicates live notifications after reconnects", () => {
    const firstState = reducer(undefined, addLiveNotification(notification()));
    const nextState = reducer(firstState, addLiveNotification(notification()));

    expect(nextState.items).toHaveLength(1);
    expect(nextState.unreadCount).toBe(1);
    expect(nextState.pagination.total).toBe(1);
  });

  it("resets stale items when fetching the first page for a filter", () => {
    const previousState = {
      items: [notification({ _id: "old-notification" })],
      unreadCount: 1,
      loading: false,
      socketStatus: "connected",
      pagination: {
        page: 3,
        limit: 10,
        total: 25,
        pages: 3,
      },
      error: null,
    };

    const nextState = reducer(
      previousState,
      getNotifications.pending("request-1", { page: 1, limit: 10, isRead: true }),
    );

    expect(nextState.loading).toBe(true);
    expect(nextState.items).toEqual([]);
    expect(nextState.pagination.page).toBe(1);
    expect(nextState.pagination.pages).toBe(1);
  });

  it("normalizes invalid pagination totals to a single page", () => {
    const nextState = reducer(
      undefined,
      getNotifications.fulfilled(
        {
          data: [],
          pagination: {
            page: 0,
            limit: 0,
            total: -10,
            pages: 0,
          },
        },
        "request-1",
        { page: 1, limit: 10 },
      ),
    );

    expect(nextState.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      pages: 1,
    });
  });

  it("stores socket reconnect status for the page banner", () => {
    const nextState = reducer(undefined, setSocketStatus("reconnecting"));

    expect(nextState.socketStatus).toBe("reconnecting");
  });
});
