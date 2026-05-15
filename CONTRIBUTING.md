# Contributing to SkillSphere AI

Thanks for your interest in contributing to SkillSphere AI.

## Before You Start

- Read the project overview in `README.md`.
- Search existing issues before creating a new one.
- For major changes, open an issue first to discuss scope.

## Local Setup

The repository is organized as:

- `client/` — Frontend (React)
- `server/` — Backend (Node.js + Express)
- `ai-ml/` — AI/ML workflows
- `docs/` — Project documentation

When package scaffolding is added, setup steps will be updated here.

## Branch and Commit Guidelines

- Branch naming:
  - `feat/<short-description>`
  - `fix/<short-description>`
  - `docs/<short-description>`
  - `chore/<short-description>`
- Keep commits small and focused.
- Write clear commit messages in imperative tense.

## What to Contribute

- Feature scaffolding aligned with modules in `README.md`
- Documentation in `docs/`
- Bug fixes with reproducible steps
- Test coverage and quality improvements

---

## Submitting a Pull Request

### PR Title

Write your PR title like this:

```
type: short description of what you did
```

Pick a `type` from this list:

| Type | Use when... |
|---|---|
| `feat` | You added something new |
| `fix` | You fixed a bug |
| `docs` | You updated documentation |
| `refactor` | You cleaned up code (no new feature) |
| `chore` | Dependency update, config change, etc. |
| `test` | You added or fixed tests |
| `security` | Security-related change |

### PR Label

Add **one label** that matches your type (same words as above: `feat`, `fix`, `docs`, etc.).

Need a version bump bigger than a patch?
- Add label `minor` → bumps `0.1.x → 0.2.0`
- Add label `major` → bumps `0.x.y → 1.0.0`

### PR Body (optional)

Add bullet points for anything notable. They'll appear as sub-items in the changelog automatically.

### You don't need to touch `docs/CHANGELOG.md`

When your PR is merged, a bot commits a new changelog entry for you. That's it.

### Example

**PR Title:**
```
feat: add OTP retry countdown timer on verify screen
```

**Label:** `feat`

**PR Body:**
```
- Shows 60-second countdown before resend button appears
- Disables resend button during cooldown
- Resets timer on each new OTP request
```

**What gets added to `docs/CHANGELOG.md` automatically:**
```markdown
## [0.1.2] - 2025-05-16

### Added

- Add OTP retry countdown timer on verify screen (#42) — @contributor
  - Shows 60-second countdown before resend button appears
  - Disables resend button during cooldown
  - Resets timer on each new OTP request
```

### PR Checklist

Before opening a PR, ensure:

- [ ] Changes are linked to an issue (if applicable)
- [ ] Code is readable and follows existing project structure
- [ ] Documentation is updated when behaviour changes
- [ ] No sensitive data, tokens, or secrets are committed

---

## Rules

- Do not submit PRs that are unrelated to an open issue without prior discussion.
- Do not modify `docs/CHANGELOG.md` manually — it is maintained automatically.
- Do not commit directly to `main`. All changes go through PRs.
- Keep PRs focused — one feature or fix per PR. Avoid bundling unrelated changes.
- Respect existing code style and folder structure.
- All contributions must pass the automated PR quality checks before review.

---

## Code of Conduct

By participating, you agree to follow [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

- Be respectful and inclusive in all interactions.
- Constructive feedback only — critique the code, not the person.
- Harassment, discrimination, or hostile behaviour of any kind will not be tolerated.
- If you witness or experience a violation, report it to the maintainers.