import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  getNotifications,
  getUnreadCount,
  createNotification,
  getNotification,
  isSafeNotificationActionUrl,
  markAsRead,
  markAllAsRead,
  sanitizeNotificationMetadata,
  deleteNotificationById,
  deleteAllNotificationsForUser,
} from "../controller.js";
import Notification from "../../../database/models/Notification.js";
import AppError from "../../../utils/AppError.js";

const flush = () => new Promise(r => setTimeout(r, 0));

describe("Notification Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { _id: "user123" },
    };
    res = {
      status: mock.fn(() => res),
      json: mock.fn(),
    };
    next = mock.fn();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe("getNotifications", () => {
    it("should respond with 200 and paginated notifications", async () => {
      const mockNotifications = [{ _id: "n1", title: "Test" }];
      mock.method(Notification, "find", () => ({
        sort: () => ({ skip: () => ({ limit: () => ({ populate: () => mockNotifications }) }) }),
      }));
      mock.method(Notification, "countDocuments", () => 1);

      req.query = { page: "1", limit: "20" };
      getNotifications(req, res, next);
      await flush();

      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      assert.equal(res.json.mock.calls[0].arguments[0].success, true);
      assert.deepEqual(
        res.json.mock.calls[0].arguments[0].data,
        mockNotifications,
      );
    });

    it("sanitizes unsafe actionUrl metadata before returning notifications", async () => {
      const mockNotifications = [
        {
          _id: "n1",
          title: "Unsafe",
          metadata: {
            actionUrl: "https://evil.com",
            relatedModel: "JobPosting",
          },
        },
        {
          _id: "n2",
          title: "Safe",
          metadata: {
            actionUrl: "/dashboard",
          },
        },
      ];
      mock.method(Notification, "find", () => ({
        sort: () => ({ skip: () => ({ limit: () => ({ populate: () => mockNotifications }) }) }),
      }));
      mock.method(Notification, "countDocuments", () => 2);

      getNotifications(req, res, next);
      await flush();

      const data = res.json.mock.calls[0].arguments[0].data;
      assert.equal("actionUrl" in data[0].metadata, false);
      assert.equal(data[0].metadata.relatedModel, "JobPosting");
      assert.equal(data[1].metadata.actionUrl, "/dashboard");
    });

    it("should throw AppError(400) when type filter is invalid", async () => {
      req.query = { type: "invalid-category" };
      getNotifications(req, res, next);
      await flush();

      assert.equal(next.mock.calls.length, 1);
      assert.ok(next.mock.calls[0].arguments[0] instanceof AppError);
      assert.equal(next.mock.calls[0].arguments[0].statusCode, 400);
    });

    it("should throw AppError(400) when type filter is too long", async () => {
      req.query = { type: "a".repeat(51) };
      getNotifications(req, res, next);
      await flush();

      assert.equal(next.mock.calls.length, 1);
      assert.ok(next.mock.calls[0].arguments[0] instanceof AppError);
      assert.equal(next.mock.calls[0].arguments[0].statusCode, 400);
    });

    it("should respond with 200 when a valid type filter is provided", async () => {
      const mockNotifications = [{ _id: "n1", title: "Test", type: "job-update" }];
      mock.method(Notification, "find", () => ({
        sort: () => ({ skip: () => ({ limit: () => ({ populate: () => mockNotifications }) }) }),
      }));
      mock.method(Notification, "countDocuments", () => 1);

      req.query = { type: "jobs" };
      getNotifications(req, res, next);
      await flush();

      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      assert.equal(res.json.mock.calls[0].arguments[0].success, true);
    });
  });

  describe("getUnreadCount", () => {
    it("should respond with 200 and unread count", async () => {
      mock.method(Notification, "countDocuments", () => 5);

      getUnreadCount(req, res, next);
      await flush();

      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      assert.equal(
        res.json.mock.calls[0].arguments[0].data.unreadCount,
        5,
      );
    });
  });

  describe("createNotification", () => {
    const validBody = () => ({
      userId: "targetUser",
      title: "Test Title",
      message: "Test Message",
      type: "info",
    });

    it("should respond with 201 and created notification", async () => {
      const body = { ...validBody(), userId: req.user._id };
      req.body = body;
      const mockCreated = { _id: "n1", ...body };
      mock.method(Notification, "create", () => ({
        populate: () => mockCreated,
      }));

      createNotification(req, res, next);
      await flush();

      assert.equal(res.status.mock.calls[0].arguments[0], 201);
      assert.equal(res.json.mock.calls[0].arguments[0].success, true);
      assert.deepEqual(res.json.mock.calls[0].arguments[0].data, mockCreated);
    });

    it("should throw AppError(403) when userId does not match authenticated user", async () => {
      req.body = { ...validBody(), userId: "someOtherUser" };

      createNotification(req, res, next);
      await flush();

      assert.equal(next.mock.calls.length, 1);
      assert.ok(next.mock.calls[0].arguments[0] instanceof AppError);
      assert.equal(next.mock.calls[0].arguments[0].statusCode, 403);
    });

    it("should throw AppError(400) when userId is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.userId;

      createNotification(req, res, next);
      await flush();

      assert.equal(next.mock.calls.length, 1);
      assert.ok(next.mock.calls[0].arguments[0] instanceof AppError);
      assert.equal(next.mock.calls[0].arguments[0].statusCode, 400);
      assert.ok(next.mock.calls[0].arguments[0].errors.userId);
    });

    it("should throw AppError(400) when title is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.title;

      createNotification(req, res, next);
      await flush();

      assert.equal(next.mock.calls.length, 1);
      assert.ok(next.mock.calls[0].arguments[0] instanceof AppError);
      assert.equal(next.mock.calls[0].arguments[0].statusCode, 400);
      assert.ok(next.mock.calls[0].arguments[0].errors.title);
    });

    it("should throw AppError(400) when message is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.message;

      createNotification(req, res, next);
      await flush();

      assert.equal(next.mock.calls.length, 1);
      assert.ok(next.mock.calls[0].arguments[0] instanceof AppError);
      assert.equal(next.mock.calls[0].arguments[0].statusCode, 400);
      assert.ok(next.mock.calls[0].arguments[0].errors.message);
    });

    it("should throw AppError(400) when type is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.type;

      createNotification(req, res, next);
      await flush();

      assert.equal(next.mock.calls.length, 1);
      assert.ok(next.mock.calls[0].arguments[0] instanceof AppError);
      assert.equal(next.mock.calls[0].arguments[0].statusCode, 400);
      assert.ok(next.mock.calls[0].arguments[0].errors.type);
    });

    it("should throw AppError(400) when type is invalid", async () => {
      req.body = { ...validBody(), type: "invalid-type" };

      createNotification(req, res, next);
      await flush();

      assert.equal(next.mock.calls.length, 1);
      assert.ok(next.mock.calls[0].arguments[0] instanceof AppError);
      assert.equal(next.mock.calls[0].arguments[0].statusCode, 400);
      assert.ok(next.mock.calls[0].arguments[0].errors.type);
    });

    it("preserves safe internal actionUrl metadata when creating notifications", async () => {
      req.body = {
        ...validBody(),
        userId: req.user._id,
        metadata: {
          actionUrl: "/jobs/123",
          relatedModel: "JobPosting",
        },
      };
      let persistedData;

      mock.method(Notification, "create", (data) => {
        persistedData = data;
        return {
          ...data,
          _id: "n1",
          populate: () => ({ ...data, _id: "n1" }),
        };
      });

      createNotification(req, res, next);
      await flush();

      assert.equal(persistedData.metadata.actionUrl, "/jobs/123");
      assert.equal(
        res.json.mock.calls[0].arguments[0].data.metadata.actionUrl,
        "/jobs/123",
      );
    });

    it("sanitizes malicious external actionUrl metadata before persistence", async () => {
      req.body = {
        ...validBody(),
        userId: req.user._id,
        metadata: {
          actionUrl: "https://evil.com",
          relatedModel: "JobPosting",
        },
      };
      let persistedData;

      mock.method(Notification, "create", (data) => {
        persistedData = data;
        return {
          ...data,
          _id: "n1",
          populate: () => ({ ...data, _id: "n1" }),
        };
      });

      createNotification(req, res, next);
      await flush();

      assert.equal("actionUrl" in persistedData.metadata, false);
      assert.equal(
        "actionUrl" in res.json.mock.calls[0].arguments[0].data.metadata,
        false,
      );
      assert.equal(persistedData.metadata.relatedModel, "JobPosting");
    });

    it("sanitizes encoded malicious actionUrl metadata before persistence", async () => {
      req.body = {
        ...validBody(),
        userId: req.user._id,
        metadata: {
          actionUrl: "%2F%2Fevil.com",
          relatedId: null,
        },
      };
      let persistedData;

      mock.method(Notification, "create", (data) => {
        persistedData = data;
        return {
          ...data,
          _id: "n1",
          populate: () => ({ ...data, _id: "n1" }),
        };
      });

      createNotification(req, res, next);
      await flush();

      assert.equal("actionUrl" in persistedData.metadata, false);
      assert.equal(persistedData.metadata.relatedId, null);
    });
  });

  describe("notification actionUrl safety", () => {
    it("accepts safe internal notification paths", () => {
      for (const actionUrl of ["/dashboard", "/profile", "/jobs/123"]) {
        assert.equal(isSafeNotificationActionUrl(actionUrl), true);
        assert.equal(sanitizeNotificationMetadata({ actionUrl }).actionUrl, actionUrl);
      }
    });

    it("rejects unsafe notification action URLs", () => {
      const unsafeActionUrls = [
        "https://evil.com",
        "http://evil.com",
        "//evil.com",
        "javascript:alert(1)",
        "%2F%2Fevil.com",
        "https%3A%2F%2Fevil.com",
        "%",
        "/\\evil.com",
      ];

      for (const actionUrl of unsafeActionUrls) {
        assert.equal(isSafeNotificationActionUrl(actionUrl), false);
        assert.equal("actionUrl" in sanitizeNotificationMetadata({ actionUrl }), false);
      }
    });
  });

  describe("getNotification", () => {
    it("should respond with 200 and the notification", async () => {
      const mockNotification = { _id: "n1", title: "Test", userId: { _id: "user123" } };
      mockNotification.populate = () => mockNotification;
      mock.method(Notification, "findById", () => mockNotification);

      req.params = { id: "n1" };
      getNotification(req, res, next);
      await flush();

      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      assert.equal(res.json.mock.calls[0].arguments[0].success, true);
    });
  });

  describe("markAsRead", () => {
    it("should respond with 200", async () => {
      const notification = {
        _id: "n1",
        userId: "user123",
        isRead: false,
        save: () => {},
        populate: () => notification,
      };
      mock.method(Notification, "findById", () => notification);

      req.params = { id: "n1" };
      markAsRead(req, res, next);
      await flush();

      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      assert.equal(res.json.mock.calls[0].arguments[0].success, true);
      assert.ok(notification.isRead);
    });
  });

  describe("markAllAsRead", () => {
    it("should respond with 200", async () => {
      mock.method(Notification, "updateMany", () => ({}));

      markAllAsRead(req, res, next);
      await flush();

      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      assert.equal(res.json.mock.calls[0].arguments[0].success, true);
    });
  });

  describe("deleteNotificationById", () => {
    it("should respond with 200", async () => {
      const doc = { _id: "n1", userId: "user123" };
      mock.method(Notification, "findById", () => doc);
      mock.method(Notification, "findByIdAndDelete", () => ({}));

      req.params = { id: "n1" };
      deleteNotificationById(req, res, next);
      await flush();

      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      assert.equal(res.json.mock.calls[0].arguments[0].success, true);
    });
  });

  describe("deleteAllNotificationsForUser", () => {
    it("should respond with 200 and deleted count", async () => {
      mock.method(Notification, "deleteMany", () => ({ deletedCount: 3 }));

      deleteAllNotificationsForUser(req, res, next);
      await flush();

      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      assert.equal(res.json.mock.calls[0].arguments[0].success, true);
      assert.equal(
        res.json.mock.calls[0].arguments[0].data.deletedCount,
        3,
      );
    });
  });
});
