import { describe, expect, it } from "vitest";
import reducer, {
  addLiveNotification,
  getNotifications,
  markAllAsRead,
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

  it("preserves rollback data across overlapping markAllAsRead requests", () => {
    const previousState = {
      items: [
        notification({ _id: "n1", isRead: false }),
        notification({ _id: "n2", isRead: false }),
      ],
      unreadCount: 2,
      loading: false,
      socketStatus: "connected",
      pagination: { page: 1, limit: 10, total: 2, pages: 1 },
      error: null,
    };

    // First markAllAsRead dispatch
    const afterFirstPending = reducer(previousState, markAllAsRead.pending("request-1"));
    expect(afterFirstPending._rollbackUnreadIds).toEqual(["n1", "n2"]);
    expect(afterFirstPending.unreadCount).toBe(0);

    // Second markAllAsRead dispatch before the first resolves
    const afterSecondPending = reducer(afterFirstPending, markAllAsRead.pending("request-2"));
    // Rollback data from request 1 must not be overwritten with an empty array
    expect(afterSecondPending._rollbackUnreadIds).toEqual(["n1", "n2"]);

    // First request fails - rollback should restore both items as unread
    const afterRejected = reducer(
      afterSecondPending,
      markAllAsRead.rejected(null, "request-1", undefined, "Server error"),
    );
    expect(afterRejected.items.every((item) => item.isRead === false)).toBe(true);
    expect(afterRejected.unreadCount).toBe(2);
    expect(afterRejected._rollbackUnreadIds).toBe(null);
  });

  it("clears rollback tracking when markAllAsRead succeeds", () => {
    const previousState = {
      items: [notification({ _id: "n1", isRead: false })],
      unreadCount: 1,
      loading: false,
      socketStatus: "connected",
      pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      error: null,
      _rollbackUnreadIds: ["n1"],
    };

    const nextState = reducer(previousState, markAllAsRead.fulfilled(null, "request-1"));
    expect(nextState._rollbackUnreadIds).toBe(null);
  });
});