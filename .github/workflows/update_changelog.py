#!/usr/bin/env python3
"""
update_changelog.py
───────────────────
Automatically prepends a new versioned section to CHANGELOG.md whenever a PR
is merged into main.

Versioning scheme (requested):
  - Default increment: patch  →  0.1.0 → 0.1.1 → 0.1.2 … 0.1.9
  - After patch reaches 9, next increment rolls to a new minor:
      0.1.9 → 0.2.0  (NOT 0.1.10)
  - Label "minor" on a PR forces an immediate minor bump regardless.
  - Label "major" on a PR forces an immediate major bump.

Change categorisation (driven by PR labels, with title-prefix fallback):
  Label            → Changelog section
  ─────────────────────────────────────
  feat / feature   → Added
  fix / bugfix     → Fixed
  docs             → Documentation
  refactor         → Changed
  perf             → Performance
  test / tests     → Tests
  chore            → Maintenance
  security         → Security
  deprecated       → Deprecated
  removed          → Removed
  (anything else)  → Changed
"""

import os
import re
import sys
from datetime import datetime, timezone

# ── Constants ────────────────────────────────────────────────────────────────

CHANGELOG_PATH = "docs/CHANGELOG.md"
PATCH_ROLLOVER  = 10   # 0.x.9 → 0.(x+1).0  at the 10th patch

# Label → changelog section mapping (checked in order; first match wins)
LABEL_SECTION_MAP = [
    ({"feat", "feature"},          "Added"),
    ({"fix", "bugfix", "hotfix"},  "Fixed"),
    ({"docs", "documentation"},    "Documentation"),
    ({"refactor"},                 "Changed"),
    ({"perf", "performance"},      "Performance"),
    ({"test", "tests"},            "Tests"),
    ({"chore", "maintenance"},     "Maintenance"),
    ({"security"},                 "Security"),
    ({"deprecated"},               "Deprecated"),
    ({"removed", "remove"},        "Removed"),
]

# Conventional-commit prefixes → section (fallback when no label matches)
PREFIX_SECTION_MAP = [
    (r"^feat",       "Added"),
    (r"^fix",        "Fixed"),
    (r"^docs",       "Documentation"),
    (r"^refactor",   "Changed"),
    (r"^perf",       "Performance"),
    (r"^test",       "Tests"),
    (r"^chore",      "Maintenance"),
    (r"^security",   "Security"),
    (r"^deprecate",  "Deprecated"),
    (r"^remove|^revert", "Removed"),
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def env(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


def parse_labels(raw: str) -> set:
    """Split comma-separated label string into a lower-cased set."""
    return {lbl.strip().lower() for lbl in raw.split(",") if lbl.strip()}


def detect_bump(labels: set) -> str:
    """Return 'major', 'minor', or 'patch' based on PR labels."""
    if "major" in labels or "breaking" in labels:
        return "major"
    if "minor" in labels:
        return "minor"
    return "patch"


def detect_section(labels: set, title: str) -> str:
    """Determine which changelog section this PR belongs to."""
    for label_set, section in LABEL_SECTION_MAP:
        if labels & label_set:
            return section
    title_lower = title.lower()
    for pattern, section in PREFIX_SECTION_MAP:
        if re.match(pattern, title_lower):
            return section
    return "Changed"


def parse_current_version(changelog: str) -> tuple[int, int, int]:
    """
    Find the highest existing released version in CHANGELOG.md.
    Returns (major, minor, patch) tuple. Defaults to (0, 1, 0) if none found.
    """
    # Match lines like: ## [0.1.3] - 2025-05-15
    pattern = re.compile(r"^## \[(\d+)\.(\d+)\.(\d+)\]", re.MULTILINE)
    matches = pattern.findall(changelog)
    if not matches:
        # No versioned release yet; the file only has [Unreleased] + [0.1.0]
        # We treat 0.1.0 as the base.
        return (0, 1, 0)
    versions = [(int(ma), int(mi), int(pa)) for ma, mi, pa in matches]
    return max(versions)


def next_version(current: tuple[int, int, int], bump: str) -> tuple[int, int, int]:
    """Compute the next version given bump type and the rollover rule."""
    ma, mi, pa = current
    if bump == "major":
        return (ma + 1, 0, 0)
    if bump == "minor":
        return (ma, mi + 1, 0)
    # patch bump with rollover
    if pa + 1 >= PATCH_ROLLOVER:
        return (ma, mi + 1, 0)
    return (ma, mi, pa + 1)


def version_str(v: tuple[int, int, int]) -> str:
    return f"{v[0]}.{v[1]}.{v[2]}"


def build_new_section(ver: str, date: str, section: str,
                      pr_title: str, pr_number: str, pr_url: str,
                      pr_author: str, pr_body: str) -> str:
    """Construct the markdown block for the new changelog entry."""

    # Clean up PR title (strip conventional-commit prefix for readability)
    clean_title = re.sub(
        r"^(feat|fix|docs|refactor|perf|test|chore|security|deprecate|remove|revert)"
        r"(\([^)]+\))?!?:\s*",
        "",
        pr_title,
        flags=re.IGNORECASE,
    ).strip()
    if not clean_title:
        clean_title = pr_title

    # Capitalise first letter
    clean_title = clean_title[0].upper() + clean_title[1:]

    # Extract bullet points from PR body (lines starting with - or *)
    extra_bullets = []
    if pr_body:
        for line in pr_body.splitlines():
            stripped = line.strip()
            if stripped.startswith(("- ", "* ", "• ")):
                bullet_text = stripped[2:].strip()
                if bullet_text and len(bullet_text) > 3:
                    extra_bullets.append(f"  - {bullet_text}")

    bullets = [f"- {clean_title} ([#{pr_number}]({pr_url})) — @{pr_author}"]
    bullets.extend(extra_bullets[:5])   # cap at 5 extra bullets from body

    bullets_str = "\n".join(bullets)

    return (
        f"## [{ver}] - {date}\n\n"
        f"### {section}\n\n"
        f"{bullets_str}\n"
    )


def build_comparison_link(ver: str, prev_ver: str, repo_url: str) -> str:
    return f"[{ver}]: {repo_url}/compare/v{prev_ver}...v{ver}"


def update_unreleased_link(repo_url: str, latest_ver: str) -> str:
    return f"[Unreleased]: {repo_url}/compare/v{latest_ver}...HEAD"


def inject_into_changelog(changelog: str, new_section: str,
                           new_ver: str, prev_ver: str,
                           repo_url: str) -> str:
    """
    Insert the new section after the [Unreleased] block and update footer links.
    """
    # ── 1. Find insertion point: right after the [Unreleased] block ──────────
    #    The [Unreleased] block ends where the next ## [ line starts,
    #    or at the footer link definitions.
    unreleased_end = re.search(
        r"(\n---\n|\n## \[0|\n\[Unreleased\]:|\Z)",
        changelog,
    )
    insert_at = unreleased_end.start() if unreleased_end else len(changelog)

    before = changelog[:insert_at].rstrip()
    after  = changelog[insert_at:]

    # ── 2. Update / add footer comparison links ───────────────────────────────
    # Remove stale [Unreleased] and the link for the version we're about to add
    after = re.sub(r"\[Unreleased\]:.*\n?", "", after)
    after = re.sub(rf"\[{re.escape(new_ver)}\]:.*\n?", "", after)

    new_unreleased_link = update_unreleased_link(repo_url, new_ver)
    new_version_link    = build_comparison_link(new_ver, prev_ver, repo_url)

    # Find where the link block starts (lines beginning with '[')
    link_block_match = re.search(r"\n(\[)", after)
    if link_block_match:
        link_insert = link_block_match.start() + 1   # after the \n
        after = (
            after[:link_insert]
            + new_unreleased_link + "\n"
            + new_version_link    + "\n"
            + after[link_insert:]
        )
    else:
        # No existing link block — append at the end
        after = after.rstrip() + "\n\n" + new_unreleased_link + "\n" + new_version_link + "\n"

    divider = "\n\n---\n\n"
    return before + divider + new_section + after


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    pr_number = env("PR_NUMBER", "0")
    pr_title  = env("PR_TITLE",  "Untitled PR")
    pr_body   = env("PR_BODY",   "")
    pr_labels = parse_labels(env("PR_LABELS", ""))
    pr_author = env("PR_AUTHOR", "unknown")
    pr_url    = env("PR_URL",    "")
    merged_at = env("MERGED_AT", "")

    # Derive the repo base URL from the PR URL  e.g. https://github.com/org/repo
    repo_url_match = re.match(r"(https://github\.com/[^/]+/[^/]+)", pr_url)
    repo_url = repo_url_match.group(1) if repo_url_match else "https://github.com/swayam03275/SkillsSphere-AI"

    # Date to stamp on the release (use merge date from GitHub, fall back to today)
    if merged_at:
        try:
            date = datetime.fromisoformat(merged_at.replace("Z", "+00:00")).strftime("%Y-%m-%d")
        except ValueError:
            date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    else:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Read existing changelog
    if not os.path.exists(CHANGELOG_PATH):
        print(f"ERROR: {CHANGELOG_PATH} not found. Aborting.", file=sys.stderr)
        sys.exit(1)

    with open(CHANGELOG_PATH, "r", encoding="utf-8") as f:
        changelog = f.read()

    # Compute versions
    current_ver = parse_current_version(changelog)
    bump        = detect_bump(pr_labels)
    new_ver_t   = next_version(current_ver, bump)
    new_ver     = version_str(new_ver_t)
    prev_ver    = version_str(current_ver)

    # Detect section
    section = detect_section(pr_labels, pr_title)

    print(f"PR #{pr_number}: '{pr_title}'")
    print(f"Labels: {pr_labels or '(none)'}")
    print(f"Bump type: {bump}  |  {prev_ver} → {new_ver}  |  Section: {section}")

    # Build and inject
    new_section = build_new_section(
        ver=new_ver, date=date, section=section,
        pr_title=pr_title, pr_number=pr_number, pr_url=pr_url,
        pr_author=pr_author, pr_body=pr_body,
    )

    updated = inject_into_changelog(
        changelog=changelog,
        new_section=new_section,
        new_ver=new_ver,
        prev_ver=prev_ver,
        repo_url=repo_url,
    )

    with open(CHANGELOG_PATH, "w", encoding="utf-8") as f:
        f.write(updated)

    print(f"CHANGELOG.md updated → [{new_ver}]")


if __name__ == "__main__":
    main()
