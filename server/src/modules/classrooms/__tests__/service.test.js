import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import * as classroomService from "../service.js";
import ClassroomSession from "../../../database/models/ClassroomSession.js";

describe("Classroom Service - Active Sessions", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe("getActiveSessions", () => {
    it("should fetch all active classroom sessions with populated host and proper sort", async () => {
      const mockActiveSessions = [
        {
          roomId: "room-1",
          title: "Introduction to React",
          subject: "Web Development",
          status: "active",
          host: {
            _id: "host-1",
            name: "John Doe",
            profilePic: "avatar.png",
            role: "tutor"
          },
          createdAt: new Date("2026-05-22T10:00:00Z")
        },
        {
          roomId: "room-2",
          title: "Advanced Data Structures",
          subject: "Computer Science",
          status: "active",
          host: {
            _id: "host-2",
            name: "Jane Smith",
            profilePic: "avatar2.png",
            role: "tutor"
          },
          createdAt: new Date("2026-05-22T09:00:00Z")
        }
      ];

      // Define mocked chain functions
      const mockLean = mock.fn(async () => mockActiveSessions);
      const mockLimit = mock.fn(() => ({ lean: mockLean }));
      const mockSort = mock.fn(() => ({ limit: mockLimit }));
      const mockPopulate = mock.fn(() => ({ sort: mockSort }));
      
      mock.method(ClassroomSession, "find", () => ({
        populate: mockPopulate
      }));

      const result = await classroomService.getActiveSessions();

      // Assert ClassroomSession.find was called with status: "active"
      assert.equal(ClassroomSession.find.mock.calls.length, 1);
      assert.deepEqual(ClassroomSession.find.mock.calls[0].arguments[0], { status: "active" });

      // Assert populate was called with host details fields
      assert.equal(mockPopulate.mock.calls.length, 1);
      assert.deepEqual(mockPopulate.mock.calls[0].arguments, ["host", "name profilePic role"]);

      // Assert sort was called with createdAt: -1
      assert.equal(mockSort.mock.calls.length, 1);
      assert.deepEqual(mockSort.mock.calls[0].arguments[0], { createdAt: -1 });

      // Assert limit was called with 20
      assert.equal(mockLimit.mock.calls.length, 1);
      assert.deepEqual(mockLimit.mock.calls[0].arguments[0], 20);

      // Assert final results match the mock data
      assert.deepEqual(result, mockActiveSessions);
    });
  });
});
