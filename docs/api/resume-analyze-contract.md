# Resume Analyze API Contract Snapshot

Snapshot date: 2026-04-23

Endpoint: `POST /api/resume/analyze`

Route middleware order:

1. `protect`
2. `authorizeRoles("student")`
3. `uploadResumeMiddleware`
4. `analyzeResume`

Pre-refactor controller flow captured as the baseline safety reference:

1. Rejects when `req.file` is missing.
2. Rejects when the uploaded original filename extension is not `.pdf`.
3. Parses the uploaded PDF with `parseResume(req.file.path)`.
4. Normalizes optional `req.body.jobSkills`.
5. Runs `skillEvaluator` only when parsed resume skills and normalized job skills are both present; otherwise `skillMatch` is `{}`.
6. Reads and trims optional `req.body.jobDescription`.
7. Runs `keywordEvaluator` only when a trimmed job description and parsed resume text are both present; otherwise `keywordMatch` is `{}`.
8. Builds candidate experience text from parsed experience lines, falling back to full resume text.
9. Runs `experienceEvaluator`; current behavior returns an object even when no required experience is detected.
10. Builds response and persistence file metadata from `req.file`.
11. Removes `resumeText` from parsed data before saving and responding.
12. Saves a `Resume` MongoDB record with parsed fields, job inputs, evaluator outputs, and file metadata.
13. Builds a success message from evaluator outputs.
14. Responds with HTTP `200`.

Success response JSON shape to preserve:

```json
{
  "success": true,
  "message": "Resume parsed, skill match and keyword relevance and experience fit evaluated, and saved successfully",
  "resumeId": "<MongoDB ObjectId>",
  "data": {
    "name": "Candidate Name or Unknown",
    "email": "candidate@example.com or null",
    "phone": "phone string or null",
    "skills": ["JavaScript", "React"],
    "education": ["education line"],
    "experience": ["experience line"],
    "projects": ["project line"],
    "certifications": ["certification line"],
    "linkedin": "https://www.linkedin.com/in/example or null",
    "github": "https://github.com/example or null",
    "portfolio": "https://example.dev or null",
    "keywords": ["JavaScript", "React"],
    "extractedTextLength": 1234
  },
  "skillMatch": {
    "score": 100,
    "weight": 1,
    "feedback": ["Great! 2/2 job skills match."],
    "matchedSkills": ["javascript", "react"],
    "missingSkills": [],
    "extraSkills": []
  },
  "keywordMatch": {
    "score": 100,
    "weight": 0.2,
    "feedback": ["Resume contains most important job description keywords"],
    "matchedKeywords": ["JavaScript", "React"],
    "missingKeywords": []
  },
  "experienceMatch": {
    "score": 100,
    "weight": 0.2,
    "feedback": [
      "Candidate experience meets or exceeds job requirements",
      "Required experience: 2 years",
      "Candidate experience: 3 years"
    ],
    "candidateExperience": 3,
    "requiredExperience": 2,
    "experienceGap": 0
  },
  "file": {
    "originalName": "resume.pdf",
    "storedName": "generated-upload-name.pdf",
    "path": "/uploads/generated-upload-name.pdf",
    "size": "12.34 KB",
    "mimeType": "application/pdf"
  },
  "evaluatorBreakdown": [
    {
      "key": "skillMatch",
      "label": "Skill Match",
      "score": 100,
      "weight": 1,
      "weightedScore": 100,
      "summary": "Great! 2/2 job skills match.",
      "details": {
        "feedback": ["Great! 2/2 job skills match."],
        "matchedSkills": ["javascript", "react"],
        "missingSkills": [],
        "extraSkills": []
      },
      "meta": {}
    }
  ],
  "overallScore": 100
}
```

Notes for contract tests:

- `data` intentionally excludes `resumeText`.
- `skillMatch` may be `{}` when no valid `jobSkills` are supplied or the parsed resume has no skills.
- `keywordMatch` may be `{}` when no non-empty `jobDescription` is supplied or parsed resume text is unavailable.
- `experienceMatch` is currently always an object from `experienceEvaluator`.
- `evaluatorBreakdown` and `overallScore` are additive pipeline fields from the refactor; existing top-level fields remain unchanged for backward compatibility.
- If `jobSkills` is invalid JSON or not an array, the request returns `400` with this message:

```json
{
  "message": "jobSkills must be a valid JSON array"
}
```
