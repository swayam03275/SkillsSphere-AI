# Contributing to SkillSphere AI

Thanks for your interest in contributing to SkillSphere AI.

## Before You Start

- Read the project overview in `README.md`.
- Search existing issues before creating a new one.
- For major changes, open an issue first to discuss scope.

## Local Setup (Planned Monorepo Structure)

The repository is organized as:

- `client/` for frontend (React)
- `server/` for backend (Node.js + Express)
- `ai-ml/` for AI/ML workflows
- `docs/` for project documentation

When package scaffolding is added, setup steps will be updated here.

## Branch and Commit Guidelines

- Branch naming:
  - `feat/<short-description>`
  - `fix/<short-description>`
  - `docs/<short-description>`
  - `chore/<short-description>`
- Keep commits small and focused.
- Write clear commit messages in imperative tense.

Example:

`feat: add resume analyzer upload component skeleton`

## Pull Request Checklist

Before opening a PR, ensure:

- Changes are linked to an issue (if applicable).
- Code is readable and follows existing project structure.
- Documentation is updated when behavior changes.
- No sensitive data, tokens, or secrets are committed.

## Dependency Update Automation

Dependabot is configured in `.github/dependabot.yml` to check the root
workspace, `client/`, `server/`, `ai-ml/`, and GitHub Actions every Monday
morning in the Asia/Kolkata timezone.

Minor and patch updates are grouped per workspace so maintainers get useful
dependency coverage without a flood of small pull requests. Major version
updates remain separate for easier review and testing.

## What to Contribute

- Feature scaffolding aligned with modules in `README.md`
- Documentation in `docs/`
- Bug fixes with reproducible steps
- Test coverage and quality improvements

## Code of Conduct

By participating, you agree to follow `CODE_OF_CONDUCT.md`.
