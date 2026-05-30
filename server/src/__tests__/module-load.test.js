import test from "node:test";
import assert from "node:assert/strict";

const criticalModules = [
  "../middleware/errorMiddleware.js",
  "../middleware/authMiddleware.js",
  "../middleware/fileAuthMiddleware.js",
  "../middleware/asyncHandler.js",
  "../utils/AppError.js",
  "../utils/asyncHandler.js",
  "../modules/auth/routes.js",
  "../modules/resumes/routes.js",
  "../modules/jobs/routes.js",
  "../modules/roadmap/routes.js",
  "../modules/matching/routes.js",
  "../modules/dashboard/routes.js",
  "../modules/coverLetters/routes.js",
  "../modules/classrooms/routes.js",
  "../modules/notifications/routes.js",
  "../modules/users/routes.js",
  "../modules/interviews/routes.js",
  "../modules/files/routes.js",
  "../modules/recruiter/routes.js",
  "../modules/analytics/routes.js",
];

test("critical server modules load without missing imports", async () => {
  const results = await Promise.allSettled(
    criticalModules.map(async (modulePath) => {
      await import(modulePath);
      return modulePath;
    }),
  );

  const failures = results
    .map((result, index) => ({ result, modulePath: criticalModules[index] }))
    .filter(({ result }) => result.status === "rejected");

  assert.equal(
    failures.length,
    0,
    failures.map(({ modulePath, result }) => `${modulePath}: ${result.reason?.message ?? result.reason}`).join("\n"),
  );
});