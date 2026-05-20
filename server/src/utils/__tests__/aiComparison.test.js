import assert from "node:assert/strict";
import test from "node:test";
import { generateComparisonInsights } from "../aiComparison.js";

test("generateComparisonInsights - generates accurate score difference insights", async () => {
  const v1 = { score: 70, skills: [], missingSkills: [] };
  
  // Test case 1: Significant improvement > 10
  const v2Improvement = { score: 85, skills: [], missingSkills: [] };
  const insights1 = await generateComparisonInsights(v1, v2Improvement);
  assert.ok(insights1.includes("score improved significantly by 15%"));

  // Test case 2: Small progress > 0
  const v2Progress = { score: 75, skills: [], missingSkills: [] };
  const insights2 = await generateComparisonInsights(v1, v2Progress);
  assert.ok(insights2.includes("score increased by 5%"));

  // Test case 3: Decline < 0
  const v2Decline = { score: 65, skills: [], missingSkills: [] };
  const insights3 = await generateComparisonInsights(v1, v2Decline);
  assert.ok(insights3.includes("latest score is slightly lower (-5%)"));
});

test("generateComparisonInsights - details skills competency changes", async () => {
  const v1 = { score: 70, skills: ["React", "CSS"], missingSkills: ["Docker", "Kubernetes"] };
  
  // Add multiple skills and resolve missing gaps
  const v2 = { 
    score: 85, 
    skills: ["React", "CSS", "Node.js", "TypeScript", "Python"], 
    missingSkills: ["Kubernetes"] 
  };

  const insights = await generateComparisonInsights(v1, v2);

  // Added skills: Node.js, TypeScript, Python (3 skills added)
  assert.ok(insights.includes("successfully integrated 3 new technical competencies"));
  
  // Resolved gap: Docker
  assert.ok(insights.includes("resolving 1 critical skill gaps"));

  // Recommendation for remaining gaps (Kubernetes)
  assert.ok(insights.includes("focus on mastering Kubernetes"));
});

test("generateComparisonInsights - returns default string when there is no change", async () => {
  const v1 = { score: 70, skills: ["React"], missingSkills: [] };
  const v2 = { score: 70, skills: ["React"], missingSkills: [] };

  const insights = await generateComparisonInsights(v1, v2);
  assert.equal(insights, "Your resume remains stable. Focus on adding new projects to boost your score.");
});
