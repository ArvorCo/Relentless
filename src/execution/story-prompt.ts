/**
 * Story-Specific Prompt Builder
 *
 * Generates story-specific instructions for agents, including:
 * - Per-story acceptance criteria
 * - Relevant checklist items
 * - Instructions to update tasks.md and checklist.md
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { UserStory } from "../prd/types";

/**
 * Extract checklist items relevant to a specific story
 */
export async function getRelevantChecklistItems(
  checklistPath: string,
  storyId: string
): Promise<string[]> {
  if (!existsSync(checklistPath)) {
    return [];
  }

  const content = await Bun.file(checklistPath).text();
  const lines = content.split("\n");
  const relevantItems: string[] = [];

  for (const line of lines) {
    // Match checklist items that reference this story
    // Format: - [ ] CHK-XXX [US-001] Description
    // Or: - [ ] CHK-XXX [Constitution] Description (always relevant)
    const trimmed = line.trim();
    if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]")) {
      if (
        trimmed.includes(`[${storyId}]`) ||
        trimmed.includes("[Constitution]") ||
        trimmed.includes("[Edge Case]")
      ) {
        relevantItems.push(trimmed);
      }
    }
  }

  return relevantItems;
}

/**
 * Build the per-story workflow instructions
 */
export function buildStoryWorkflowInstructions(
  story: UserStory,
  checklistItems: string[],
  tasksPath: string
): string {
  const instructions = `

## Current Story: ${story.id} - ${story.title}

**Description:** ${story.description}

**Phase:** ${story.phase || "Implementation"}
**Priority:** ${story.priority}
${story.dependencies?.length ? `**Dependencies:** ${story.dependencies.join(", ")}` : ""}
${story.research ? "**Research Required:** Yes - research phase needed before implementation" : ""}

---

## Acceptance Criteria for ${story.id}

You MUST complete ALL of the following criteria before marking this story as done:

${story.acceptanceCriteria.map((c, i) => `${i + 1}. [ ] ${c}`).join("\n")}

---

## Per-Story Workflow (MANDATORY)

Follow this exact workflow for ${story.id}:

### Step 1: Read & Understand
1. Read the acceptance criteria above carefully
2. Review any existing code related to this story
3. Check if research findings exist in \`research/${story.id}.md\`

### Step 2: TDD - Write Tests First (RED phase)
\`\`\`bash
# Write failing tests that validate each acceptance criterion
bun test  # Tests MUST fail initially
\`\`\`

### Step 3: Implement (GREEN phase)
\`\`\`bash
# Write minimum code to pass tests
bun test  # Tests MUST pass
\`\`\`

### Step 4: Refactor
\`\`\`bash
# Clean up while keeping tests green
bun test  # Tests MUST still pass
\`\`\`

### Step 5: Quality Checks
\`\`\`bash
bun run typecheck  # 0 errors
bun run lint       # 0 warnings
bun test           # All pass
\`\`\`

### Step 6: Update Tasks & Checklist
**IMPORTANT:** After implementing each criterion:

1. **Update tasks.md** - Check off completed items:
   - File: \`${tasksPath}\`
   - Find the section for ${story.id}
   - Change \`- [ ]\` to \`- [x]\` for completed criteria

2. **Update checklist.md** - Mark verified items:
   - Find items tagged with [${story.id}]
   - Change \`- [ ]\` to \`- [x]\` for verified items

### Step 7: Commit
\`\`\`bash
git add -A
git commit -m "feat: ${story.id} - ${story.title}"
\`\`\`

### Step 8: Mark Story Complete
Update \`prd.json\` to set \`passes: true\` for ${story.id}

---

${checklistItems.length > 0 ? `## Relevant Checklist Items for ${story.id}

Verify these items as you implement:

${checklistItems.join("\n")}

After verifying each item, update checklist.md to mark it as checked.

---` : ""}

## DO NOT Forget

1. **Update tasks.md** - Check off criteria as you complete them
2. **Update checklist.md** - Mark items as verified
3. **Run ALL quality checks** before marking story complete
4. **Write tests FIRST** - No exceptions to TDD
5. **Commit with proper message format**: \`feat: ${story.id} - ${story.title}\`

`;

  return instructions;
}

/**
 * Build complete story-specific prompt addition
 */
export async function buildStoryPromptAddition(
  story: UserStory,
  featureDir: string
): Promise<string> {
  const checklistPath = join(featureDir, "checklist.md");
  const tasksPath = join(featureDir, "tasks.md");

  const checklistItems = await getRelevantChecklistItems(checklistPath, story.id);

  return buildStoryWorkflowInstructions(story, checklistItems, tasksPath);
}
