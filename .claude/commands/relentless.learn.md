---
description: Distill learnings from completed feature and propose amendments to constitution.md or prompt.md.
---

Load the learn skill (`[skills_path]/learn/SKILL.md`) and follow its workflow.

**Usage:** `/relentless.learn [feature-name]`

**Context:** $ARGUMENTS

The learn skill will guide you through:

1. **Extract Learnings** - Run CLI scripts to extract patterns, costs, failures, errors
2. **Classify** - Categorize as Constitutional (governance) or Tactical (tech-specific)
3. **Generate Proposals** - Create max 5 constitutional + 5 tactical proposals
4. **Human Approval** - Present proposals for user review
5. **Apply Amendments** - Update constitution.md or prompt.md with approved changes
6. **Update Stats** - Regenerate aggregate stats

## Quick Start

1. Complete a feature (all stories `passes: true`)
2. Run `/relentless.learn <feature-name>` to capture learnings
3. Review and approve/modify/reject proposals
4. Approved amendments are applied automatically

## What Gets Updated

After approval:
- `constitution.md` - New MUST/SHOULD rules (version bumped)
- `prompt.md` - New patterns or tips
- `relentless/features/<feature>/learnings.md` - Learning log
- `relentless/stats.md` - Aggregate statistics

## Prerequisites

- Feature must be complete (all stories done or skipped)
- `progress.txt` must exist with iteration learnings
- `constitution.md` and/or `prompt.md` must exist

## Version Bumping

| Rule Type | Version Bump |
|-----------|--------------|
| MUST rule | MINOR (e.g., 2.0.0 → 2.1.0) |
| SHOULD rule | PATCH (e.g., 2.0.0 → 2.0.1) |

## See Also

- `/relentless.constitution` - Create or update project governance
- `/relentless.implement` - Implement feature stories
- `relentless/stats.md` - View aggregate statistics
