
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../../services/apiClient";
import {
  clearDashboardCache,
  getCachedDashboardResponse,
  getAnalysisHistory,
  getRoleAnalytics,
  getSkillTrends,
  handleDashboardServiceError,
  setCachedDashboardResponse,
  transformAnalysisHistoryResponse,
  transformRoleAnalyticsResponse,
  transformTalentDensity,
} from "../dashboardService";

vi.mock("../../../../services/apiClient", () => ({
  apiRequest: vi.fn(),
  normalizeApiError: vi.fn((error) => ({
    status: error?.status ?? 500,
    message: error?.message || "Something went wrong",
    errors: error?.errors || {},
    data: error?.data || null,
  })),
}));

describe("dashboardService", () => {
  const token = "dashboard-test-token";

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    // @ts-expect-error TODO: Fix pervasive types
    clearDashboardCache();
  });

  describe("getAnalysisHistory", () => {
    it("returns normalized analysis history for successful API responses", async () => {
      // @ts-expect-error TODO: Fix pervasive types
      apiRequest.mockResolvedValue({
        success: true,
        message: "ok",
        data: [
          {
            _id: "history-1",
            score: "86",
            classification: "Advanced",
            skills: ["React"],
            missingSkills: "Node",
            suggestions: null,
          },
        ],
      });

      const result = await getAnalysisHistory(token);

      expect(apiRequest).toHaveBeenCalledWith(
        "/api/dashboard/history",
        expect.objectContaining({
          method: "GET",
          token,
        }),
      );
      expect(result).toMatchObject({
        success: true,
        data: [
          expect.objectContaining({
            score: 86,
            skills: ["React"],
            missingSkills: [],
            suggestions: [],
          }),
        ],
      });
    });

    it("falls back to an empty history array when validation fails", async () => {
      // @ts-expect-error TODO: Fix pervasive types
      apiRequest.mockResolvedValue({ success: true, data: null });

      const result = await getAnalysisHistory(token);

      expect(result).toMatchObject({
        success: true,
        data: [],
        isFallback: true,
        message: "Dashboard data was incomplete. Showing safe fallback values.",
      });
    });
  });

  describe("getSkillTrends", () => {
    it("caches successful responses for 60 seconds", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-25T00:00:00.000Z"));

      // @ts-expect-error TODO: Fix pervasive types
      apiRequest.mockResolvedValue({
        success: true,
        trends: [{ skill: "React", count: "12" }],
      });

      const first = await getSkillTrends(token);
      const second = await getSkillTrends(token);

      expect(apiRequest).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
      expect(second.trends[0].count).toBe(12);
    });

    it("refreshes the cache after the TTL expires", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-25T00:00:00.000Z"));

      apiRequest
        // @ts-expect-error TODO: Fix pervasive types
        .mockResolvedValueOnce({
          success: true,
          trends: [{ skill: "React", count: 1 }],
        })
        .mockResolvedValueOnce({
          success: true,
          trends: [{ skill: "Node", count: 2 }],
        });

      const first = await getSkillTrends(token);
      vi.setSystemTime(new Date("2026-05-25T00:01:01.000Z"));
      const second = await getSkillTrends(token);

      expect(apiRequest).toHaveBeenCalledTimes(2);
      expect(first.trends[0].skill).toBe("React");
      expect(second.trends[0].skill).toBe("Node");
    });
  });

  describe("cache utilities", () => {
    it("stores cache entries until their TTL expires", () => {
      const value = { success: true, trends: [] };

      setCachedDashboardResponse("skills:test-token", value, 60_000, 1000);

      expect(getCachedDashboardResponse("skills:test-token", 59_999)).toBe(value);
      expect(getCachedDashboardResponse("skills:test-token", 61_001)).toBeNull();
      expect(getCachedDashboardResponse("skills:test-token", 61_002)).toBeNull();
    });
  });

  describe("getRoleAnalytics", () => {
    it("normalizes student, tutor, and recruiter analytics fields into one safe shape", async () => {
      // @ts-expect-error TODO: Fix pervasive types
      apiRequest.mockResolvedValue({
        success: true,
        role: "recruiter",
        data: {
          roadmapProgress: "120",
          averageInterviewScore: "74.6",
          completedTopics: "3",
          averagePlatformScore: "84",
          activeStudents: "15",
          talentDensity: [
            { topic: "React", skilledCandidates: "4" },
            { topic: "", skilledCandidates: "not-a-number" },
          ],
        },
      });

      const result = await getRoleAnalytics(token);

      expect(result).toMatchObject({
        success: true,
        data: {
          role: "recruiter",
          roadmapProgress: 100,
          averageInterviewScore: 75,
          completedTopics: 3,
          averagePlatformScore: 84,
          activeStudents: 15,
          totalEliteCandidates: 4,
          talentDensity: [
            { topic: "React", skilledCandidates: 4 },
            { topic: "Unknown", skilledCandidates: 0 },
          ],
        },
      });
    });

    it("returns fallback analytics for network failures", async () => {
      const networkError = new Error("Network error");
      // @ts-expect-error TODO: Fix pervasive types
      networkError.status = 0;
      // @ts-expect-error TODO: Fix pervasive types
      apiRequest.mockRejectedValue(networkError);

      const result = await getRoleAnalytics(token);

      expect(result).toMatchObject({
        success: true,
        isFallback: true,
        data: expect.objectContaining({
          roadmapProgress: 0,
          averageInterviewScore: 0,
          talentDensity: [],
        }),
        message: "Unable to reach the server. Showing the latest safe dashboard values.",
      });
    });

    it("returns timeout fallback analytics for apiClient-wrapped abort errors", async () => {
      const timeoutError = new Error("Network error");
      // @ts-expect-error TODO: Fix pervasive types
      timeoutError.status = 0;
      // @ts-expect-error TODO: Fix pervasive types
      timeoutError.cause = new DOMException("The operation was aborted", "AbortError");
      // @ts-expect-error TODO: Fix pervasive types
      apiRequest.mockRejectedValue(timeoutError);

      const result = await getRoleAnalytics(token);

      expect(result).toMatchObject({
        success: true,
        isFallback: true,
        message: "Dashboard data took too long to load. Showing the latest safe values.",
        error: {
          status: 408,
        },
      });
    });

    it("returns fallback analytics for invalid role analytics responses", async () => {
      // @ts-expect-error TODO: Fix pervasive types
      apiRequest.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await getRoleAnalytics(token);

      expect(result).toMatchObject({
        success: true,
        isFallback: true,
        data: expect.objectContaining({
          totalEliteCandidates: 0,
          talentDensity: [],
        }),
      });
    });
  });

  describe("transformers and validators", () => {
    it("throws a validation error when a required response payload is missing", () => {
      expect(() =>
        transformAnalysisHistoryResponse({ success: true }),
      ).toThrow("missing data");
    });

    it("normalizes talent density arrays and ignores invalid rows", () => {
      expect(
        transformTalentDensity([
          { topic: " AI ", skilledCandidates: "7" },
          null,
          { topic: "", skilledCandidates: undefined },
        ]),
      ).toEqual([
        { topic: "AI", skilledCandidates: 7 },
        { topic: "Unknown", skilledCandidates: 0 },
      ]);
    });

    it("handles empty datasets without marking them as invalid", () => {
      expect(
        transformRoleAnalyticsResponse({
          success: true,
          data: {
            talentDensity: [],
          },
        }),
      ).toMatchObject({
        success: true,
        data: {
          talentDensity: [],
          totalEliteCandidates: 0,
        },
      });
    });

    it("maps timeout errors to a user-friendly message", () => {
      const error = new DOMException("The operation was aborted", "AbortError");

      expect(handleDashboardServiceError(error)).toMatchObject({
        status: 408,
        message: "Dashboard data took too long to load. Showing the latest safe values.",
      });
    });
  });
});
