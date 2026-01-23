/**
 * PRD Validator Tests
 *
 * Tests for the tasks.md validation module.
 */

import { describe, it, expect } from "bun:test";
import {
  validateCriterion,
  parseStoryId,
  parseDependencies,
  validateTasksMarkdown,
  formatValidationResult,
} from "../../src/prd/validator";

// ============================================================================
// validateCriterion Tests
// ============================================================================

describe("validateCriterion", () => {
  it("should accept valid acceptance criteria", () => {
    const validCriteria = [
      "POST /api/register endpoint exists",
      "Email validation works correctly",
      "User can log in with valid credentials",
      "Typecheck passes",
      "Unit tests pass",
      "`src/queue/types.ts` contains Zod schemas",
      "`src/file.ts` is updated with the new handler",
    ];

    for (const criterion of validCriteria) {
      const result = validateCriterion(criterion);
      expect(result.valid).toBe(true);
    }
  });

  it("should reject standalone file paths", () => {
    const filePathCriteria = [
      "`src/file.ts`",
      "`src/queue/types.ts`",
      "`package.json`",
      "`README.md`",
      "`styles.css`",
    ];

    for (const criterion of filePathCriteria) {
      const result = validateCriterion(criterion);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("file path");
      expect(result.suggestion).toBeDefined();
    }
  });

  it("should accept file paths with context", () => {
    const validFilePaths = [
      "`src/file.ts` contains the handler",
      "`src/queue/types.ts` exports the QueueItem interface",
      "The file `src/config.ts` is updated",
      "Update `package.json` with new dependency",
    ];

    for (const criterion of validFilePaths) {
      const result = validateCriterion(criterion);
      expect(result.valid).toBe(true);
    }
  });

  it("should reject pure section markers", () => {
    const sectionMarkers = [
      "**Files:**",
      "**Note:**",
      "**Technical:**",
    ];

    for (const marker of sectionMarkers) {
      const result = validateCriterion(marker);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Section marker");
    }
  });

  it("should accept labeled criteria starting with bold", () => {
    const labeledCriteria = [
      "**Important:** User can log in successfully",
      "**Required:** All tests pass",
    ];

    for (const criterion of labeledCriteria) {
      const result = validateCriterion(criterion);
      expect(result.valid).toBe(true);
    }
  });

  it("should reject empty or very short text", () => {
    const shortTexts = ["", "a", "ab"];

    for (const text of shortTexts) {
      const result = validateCriterion(text);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("too short");
    }
  });

  it("should reject line dividers", () => {
    const dividers = ["---", "===", "----", "====="];

    for (const divider of dividers) {
      const result = validateCriterion(divider);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("divider");
    }
  });
});

// ============================================================================
// parseStoryId Tests
// ============================================================================

describe("parseStoryId", () => {
  it("should parse standard US-XXX format", () => {
    const result = parseStoryId("### US-001: Create User Registration");
    expect(result.id).toBe("US-001");
    expect(result.format).toBe("standard");
  });

  it("should parse Story X format", () => {
    const result = parseStoryId("### Story 1: Create User Registration");
    expect(result.id).toBe("US-001");
    expect(result.format).toBe("story");
  });

  it("should parse numbered format", () => {
    const result = parseStoryId("### 1. Create User Registration");
    expect(result.id).toBe("US-001");
    expect(result.format).toBe("numbered");
  });

  it("should handle multi-digit story numbers", () => {
    expect(parseStoryId("### US-123: Title").id).toBe("US-123");
    expect(parseStoryId("### Story 42: Title").id).toBe("US-042");
    expect(parseStoryId("### 99. Title").id).toBe("US-099");
  });

  it("should return null for non-story lines", () => {
    const nonStoryLines = [
      "## Section Header",
      "# Title",
      "Some regular text",
      "- [ ] Checkbox item",
    ];

    for (const line of nonStoryLines) {
      const result = parseStoryId(line);
      expect(result.id).toBeNull();
      expect(result.format).toBeNull();
    }
  });
});

// ============================================================================
// parseDependencies Tests
// ============================================================================

describe("parseDependencies", () => {
  it("should parse comma-separated dependencies", () => {
    const result = parseDependencies("**Dependencies:** US-001, US-002, US-003");
    expect(result.ids).toEqual(["US-001", "US-002", "US-003"]);
    expect(result.issues).toHaveLength(0);
  });

  it("should normalize story ID padding", () => {
    const result = parseDependencies("**Dependencies:** US-1, US-02, US-003");
    expect(result.ids).toEqual(["US-001", "US-002", "US-003"]);
  });

  it("should detect underscore format and warn", () => {
    const result = parseDependencies("**Dependencies:** US_001, US_002");
    expect(result.ids).toEqual(["US-001", "US-002"]);
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].code).toBe("DEPENDENCY_FORMAT");
    expect(result.issues[0].message).toContain("underscore");
  });

  it("should handle mixed formats", () => {
    const result = parseDependencies("**Dependencies:** US-001, US_002");
    expect(result.ids).toEqual(["US-001", "US-002"]);
    expect(result.issues).toHaveLength(1);
  });

  it("should extract IDs from complex text", () => {
    const result = parseDependencies("**Dependencies:** US-001 (authentication), US-002 (database setup)");
    expect(result.ids).toEqual(["US-001", "US-002"]);
  });

  it("should return empty array for no dependencies", () => {
    const result = parseDependencies("**Dependencies:** None");
    expect(result.ids).toEqual([]);
  });
});

// ============================================================================
// validateTasksMarkdown Tests
// ============================================================================

describe("validateTasksMarkdown", () => {
  it("should validate a well-formed tasks.md", () => {
    const content = `# PRD: Test Feature

## User Stories

### US-001: Create Registration

**Description:** User can register.

**Acceptance Criteria:**
- [ ] POST /api/register works
- [ ] Email validation works
- [ ] Unit tests pass

**Dependencies:** None
**Phase:** Foundation

---

### US-002: Create Login

**Description:** User can log in.

**Acceptance Criteria:**
- [ ] POST /api/login works
- [ ] Token is returned
- [ ] Unit tests pass

**Dependencies:** US-001
**Phase:** Stories
`;

    const result = validateTasksMarkdown(content);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.totalStories).toBe(2);
    expect(result.summary.totalCriteria).toBe(6);
  });

  it("should detect duplicate story IDs", () => {
    const content = `# PRD: Test

### US-001: First Story

**Acceptance Criteria:**
- [ ] Works

### US-001: Duplicate Story

**Acceptance Criteria:**
- [ ] Also works
`;

    const result = validateTasksMarkdown(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DUPLICATE_STORY_ID")).toBe(true);
  });

  it("should detect missing dependencies", () => {
    const content = `# PRD: Test

### US-001: First Story

**Acceptance Criteria:**
- [ ] Works

**Dependencies:** US-999
`;

    const result = validateTasksMarkdown(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MISSING_DEPENDENCY")).toBe(true);
    expect(result.errors.find((e) => e.code === "MISSING_DEPENDENCY")?.message).toContain("US-999");
  });

  it("should detect circular dependencies", () => {
    const content = `# PRD: Test

### US-001: First Story

**Acceptance Criteria:**
- [ ] Works

**Dependencies:** US-002

---

### US-002: Second Story

**Acceptance Criteria:**
- [ ] Works

**Dependencies:** US-001
`;

    const result = validateTasksMarkdown(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "CIRCULAR_DEPENDENCY")).toBe(true);
  });

  it("should track filtered criteria", () => {
    const content = `# PRD: Test

### US-001: Story with file paths

**Acceptance Criteria:**
- [ ] Valid criterion here
- [ ] \`src/file.ts\`
- [ ] Another valid one
`;

    const result = validateTasksMarkdown(content);

    expect(result.filteredCriteria).toHaveLength(1);
    expect(result.filteredCriteria[0].text).toBe("`src/file.ts`");
    expect(result.filteredCriteria[0].storyId).toBe("US-001");
    expect(result.summary.filteredCriteriaCount).toBe(1);
  });

  it("should warn about stories with no valid criteria after filtering", () => {
    const content = `# PRD: Test

### US-001: Story with only file paths

**Acceptance Criteria:**
- [ ] \`src/file.ts\`
- [ ] \`src/other.ts\`
`;

    const result = validateTasksMarkdown(content);

    expect(result.summary.storiesWithNoCriteria).toContain("US-001");
    expect(result.warnings.some((w) => w.code === "NO_CRITERIA")).toBe(true);
  });

  it("should normalize Story X format with info message", () => {
    const content = `# PRD: Test

### Story 1: First Story

**Acceptance Criteria:**
- [ ] Works
`;

    const result = validateTasksMarkdown(content);

    expect(result.info.some((i) => i.code === "STORY_FORMAT")).toBe(true);
    expect(result.info.find((i) => i.code === "STORY_FORMAT")?.message).toContain("US-001");
  });

  it("should warn about underscore dependencies", () => {
    const content = `# PRD: Test

### US-001: First Story

**Acceptance Criteria:**
- [ ] Works

---

### US-002: Second Story

**Acceptance Criteria:**
- [ ] Works

**Dependencies:** US_001
`;

    const result = validateTasksMarkdown(content);

    expect(result.warnings.some((w) => w.code === "DEPENDENCY_FORMAT")).toBe(true);
  });

  it("should handle empty content", () => {
    const result = validateTasksMarkdown("");

    expect(result.valid).toBe(true);
    expect(result.summary.totalStories).toBe(0);
    expect(result.summary.totalCriteria).toBe(0);
  });
});

// ============================================================================
// formatValidationResult Tests
// ============================================================================

describe("formatValidationResult", () => {
  it("should format passing validation", () => {
    const result = validateTasksMarkdown(`# PRD: Test
### US-001: Story
**Acceptance Criteria:**
- [ ] Works fine
`);

    const formatted = formatValidationResult(result);

    expect(formatted).toContain("✅ Validation passed");
    expect(formatted).toContain("Stories: 1");
  });

  it("should format failing validation with errors", () => {
    const result = validateTasksMarkdown(`# PRD: Test
### US-001: Story
**Acceptance Criteria:**
- [ ] Works
**Dependencies:** US-999
`);

    const formatted = formatValidationResult(result);

    expect(formatted).toContain("❌ Validation failed");
    expect(formatted).toContain("ERRORS");
    expect(formatted).toContain("MISSING_DEPENDENCY");
  });

  it("should format warnings", () => {
    const result = validateTasksMarkdown(`# PRD: Test
### US-001: Story
**Acceptance Criteria:**
- [ ] Works
- [ ] \`src/file.ts\`
`);

    const formatted = formatValidationResult(result);

    expect(formatted).toContain("WARNINGS");
    expect(formatted).toContain("FILTERED_CRITERIA");
  });

  it("should include suggestions when available", () => {
    const result = validateTasksMarkdown(`# PRD: Test
### US-001: Story
**Acceptance Criteria:**
- [ ] \`src/file.ts\`
`);

    const formatted = formatValidationResult(result);

    expect(formatted).toContain("💡");
  });
});
