import assert from "node:assert/strict";
import test from "node:test";
import { jobPostingSchema, updateJobSchema } from "../jobs.validation.js";

const validJobPayload = {
  title: "Senior Full Stack Engineer",
  description: "We are looking for a senior full stack developer with experience in React and Node.js to join our core team.",
  location: {
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    remote: true,
  },
  salary: {
    min: 800000,
    max: 1500000,
    currency: "INR",
    isNegotiable: true,
  },
  skills: ["React", "Node.js", "Express", "MongoDB"],
  experienceRequired: 5,
  jobLevel: "Mid-Senior Level",
  status: "open",
};

test("jobPostingSchema accepts a valid payload", () => {
  const result = jobPostingSchema.safeParse(validJobPayload);
  assert.equal(result.success, true);
  assert.equal(result.data.title, "Senior Full Stack Engineer");
  assert.equal(result.data.skills[0], "react"); // lowercased
});

test("jobPostingSchema trims and enforces length constraints on title", () => {
  // Too short
  const shortResult = jobPostingSchema.safeParse({
    ...validJobPayload,
    title: "  QA  ",
  });
  assert.equal(shortResult.success, false);
  assert.equal(shortResult.error.issues[0].path.join("."), "title");
  assert.equal(shortResult.error.issues[0].message, "Job title must be at least 5 characters");

  // Too long
  const longResult = jobPostingSchema.safeParse({
    ...validJobPayload,
    title: "a".repeat(101),
  });
  assert.equal(longResult.success, false);
  assert.equal(longResult.error.issues[0].path.join("."), "title");
  assert.equal(longResult.error.issues[0].message, "Job title cannot exceed 100 characters");
});

test("jobPostingSchema sanitizes HTML and checks length on description", () => {
  // Sanitizes and checks length (should fail if length falls below 20 after sanitizing)
  const htmlPayload = {
    ...validJobPayload,
    description: "<script>alert('xss')</script><b>Short</b>",
  };
  const result = jobPostingSchema.safeParse(htmlPayload);
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].path.join("."), "description");
  assert.equal(result.error.issues[0].message, "Description must be at least 20 characters");

  // Valid length after sanitization
  const validHtmlPayload = {
    ...validJobPayload,
    description: "<div>This is a very long description that contains some HTML divs but remains long enough.</div>",
  };
  const validResult = jobPostingSchema.safeParse(validHtmlPayload);
  assert.equal(validResult.success, true);
  assert.equal(validResult.data.description, "This is a very long description that contains some HTML divs but remains long enough.");
});

test("jobPostingSchema enforces non-negative salary and max >= min", () => {
  // Negative min
  const negMin = jobPostingSchema.safeParse({
    ...validJobPayload,
    salary: { min: -10, max: 100 },
  });
  assert.equal(negMin.success, false);
  assert.equal(negMin.error.issues[0].path.join("."), "salary.min");

  // max < min
  const invalidRange = jobPostingSchema.safeParse({
    ...validJobPayload,
    salary: { min: 500, max: 400 },
  });
  assert.equal(invalidRange.success, false);
  assert.equal(invalidRange.error.issues[0].path.join("."), "salary.max");
  assert.equal(invalidRange.error.issues[0].message, "Maximum salary must be greater than or equal to minimum salary");
});

test("jobPostingSchema requires city and state", () => {
  const missingCity = jobPostingSchema.safeParse({
    ...validJobPayload,
    location: { state: "Maharashtra" },
  });
  assert.equal(missingCity.success, false);
  assert.equal(missingCity.error.issues[0].path.join("."), "location.city");
});

test("jobPostingSchema normalizes skills to lowercase and trims them", () => {
  const result = jobPostingSchema.safeParse({
    ...validJobPayload,
    skills: ["  React JS  ", "NodeJS", ""],
  });
  assert.equal(result.success, true);
  assert.deepEqual(result.data.skills, ["react js", "nodejs"]);
});

test("updateJobSchema allows partial updates", () => {
  const result = updateJobSchema.safeParse({
    title: "New Title",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.title, "New Title");
  assert.equal(result.data.description, undefined);
});
