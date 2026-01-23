---
description: Convert user stories to GitHub issues.
---

Load the taskstoissues skill (`[skills_path]/taskstoissues/SKILL.md`) and create GitHub issues from user stories.

**Context:** $ARGUMENTS

The taskstoissues skill will:
1. Read tasks.md
2. Parse user stories
3. Generate GitHub issues with `gh` CLI
4. Link dependencies

Note: The actual implementation uses the CLI command `relentless issues --feature <name>`
