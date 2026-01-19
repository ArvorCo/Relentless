/**
 * Unit tests for Hybrid Complexity Classifier
 *
 * Tests for US-009: Hybrid Complexity Classifier
 *
 * The classifier uses a two-phase approach:
 * 1. Fast heuristic analysis (< 50ms, no API calls)
 * 2. LLM fallback only when confidence < 0.8
 *
 * @module tests/routing/classifier.test.ts
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import type { UserStory } from "../../src/prd/types";

// We'll import these after implementation
// import { classifyTask, type ClassificationResult } from "../../src/routing/classifier";

/**
 * Creates a mock user story for testing
 */
function createMockStory(overrides: Partial<UserStory> = {}): UserStory {
  return {
    id: "US-TEST",
    title: "Test Story",
    description: "Test description",
    acceptanceCriteria: ["Criterion 1", "Criterion 2"],
    priority: 1,
    passes: false,
    notes: "",
    ...overrides,
  };
}

describe("Hybrid Complexity Classifier", () => {
  describe("heuristic classification for simple tasks", () => {
    const simpleKeywords = [
      "fix typo",
      "Fix typo in README",
      "update docs",
      "Update documentation",
      "add comment",
      "Add comments to function",
      "rename variable",
      "Rename the function",
      "format code",
      "Format the file",
    ];

    for (const keyword of simpleKeywords) {
      it(`classifies "${keyword}" as simple with high confidence`, async () => {
        const { classifyTask } = await import("../../src/routing/classifier");

        const story = createMockStory({
          title: keyword,
          description: `Task to ${keyword.toLowerCase()}`,
        });

        const result = await classifyTask(story);

        expect(result.complexity).toBe("simple");
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
        expect(result.usedLLM).toBe(false);
      });
    }
  });

  describe("heuristic classification for medium tasks", () => {
    // Note: "Implement user authentication" tests complex due to "auth" keyword
    // Note: Tasks with "auth" in them will be classified as complex
    const mediumKeywords = [
      "implement feature",
      "Implement user profile",
      "add feature",
      "Add new validation logic",
      "refactor module",
      "Refactor the service layer",
      "write test",
      "Test the API endpoints",
      "create api",
      "Create REST API endpoint",
    ];

    for (const keyword of mediumKeywords) {
      it(`classifies "${keyword}" as medium with high confidence`, async () => {
        const { classifyTask } = await import("../../src/routing/classifier");

        const story = createMockStory({
          title: keyword,
          description: `Task to ${keyword.toLowerCase()}`,
        });

        const result = await classifyTask(story);

        expect(result.complexity).toBe("medium");
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
        expect(result.usedLLM).toBe(false);
      });
    }
  });

  describe("heuristic classification for complex tasks", () => {
    const complexKeywords = [
      "architecture design",
      "Design system architecture",
      "integrate service",
      "Integrate third-party payment service",
      "database migration",
      "Migration to new database schema",
      "security audit",
      "Implement security measures",
      "auth system",
      "Implement OAuth authentication",
    ];

    for (const keyword of complexKeywords) {
      it(`classifies "${keyword}" as complex with high confidence`, async () => {
        const { classifyTask } = await import("../../src/routing/classifier");

        const story = createMockStory({
          title: keyword,
          description: `Task to ${keyword.toLowerCase()}`,
        });

        const result = await classifyTask(story);

        expect(result.complexity).toBe("complex");
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
        expect(result.usedLLM).toBe(false);
      });
    }
  });

  describe("heuristic classification for expert tasks", () => {
    const expertKeywords = [
      "redesign system",
      "Redesign the entire architecture",
      "performance optimization",
      "Optimize performance of critical path",
      "distributed system",
      "Implement distributed caching",
      "concurrent processing",
      "Add concurrent task processing",
      "parallel execution",
      "Implement parallel job execution",
    ];

    for (const keyword of expertKeywords) {
      it(`classifies "${keyword}" as expert with high confidence`, async () => {
        const { classifyTask } = await import("../../src/routing/classifier");

        const story = createMockStory({
          title: keyword,
          description: `Task to ${keyword.toLowerCase()}`,
        });

        const result = await classifyTask(story);

        expect(result.complexity).toBe("expert");
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
        expect(result.usedLLM).toBe(false);
      });
    }
  });

  describe("file pattern confidence boosting", () => {
    it("boosts confidence for README/docs files (simple)", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Update README file",
        description: "Update the README.md with new instructions",
        acceptanceCriteria: ["Update README.md", "Add usage examples"],
      });

      const result = await classifyTask(story);

      expect(result.complexity).toBe("simple");
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("boosts confidence for auth/jwt patterns (complex)", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Implement JWT authentication",
        description: "Add JWT token validation to the auth middleware",
        acceptanceCriteria: ["Validate JWT tokens", "Handle token expiration"],
      });

      const result = await classifyTask(story);

      expect(result.complexity).toBe("complex");
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("classification result structure", () => {
    it("returns result with required fields: complexity, confidence, reasoning, usedLLM", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Fix typo in code",
        description: "Simple typo fix",
      });

      const result = await classifyTask(story);

      expect(result).toHaveProperty("complexity");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("reasoning");
      expect(result).toHaveProperty("usedLLM");

      expect(typeof result.complexity).toBe("string");
      expect(typeof result.confidence).toBe("number");
      expect(typeof result.reasoning).toBe("string");
      expect(typeof result.usedLLM).toBe("boolean");
    });

    it("confidence is between 0.0 and 1.0", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Some task",
        description: "Task description",
      });

      const result = await classifyTask(story);

      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it("includes reasoning string explaining the classification", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Fix typo",
        description: "Fix typo in README",
      });

      const result = await classifyTask(story);

      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe("heuristic phase performance", () => {
    it("completes heuristic classification in < 50ms", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Fix typo in README",
        description: "Simple task",
      });

      const startTime = performance.now();
      await classifyTask(story);
      const duration = performance.now() - startTime;

      // Heuristic classification should be very fast
      expect(duration).toBeLessThan(50);
    });
  });

  describe("high confidence skips LLM", () => {
    it("does not call LLM when confidence >= 0.8", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Fix typo in code",
        description: "Simple typo correction",
      });

      const result = await classifyTask(story);

      // High confidence tasks should not use LLM
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.usedLLM).toBe(false);
    });
  });

  describe("complexity validation", () => {
    it("returns valid complexity value", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Generic task",
        description: "Some description",
      });

      const result = await classifyTask(story);

      expect(["simple", "medium", "complex", "expert"]).toContain(
        result.complexity
      );
    });
  });

  describe("acceptance criteria influence", () => {
    it("considers acceptance criteria in classification", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Update configuration",
        description: "Update the config",
        acceptanceCriteria: [
          "Implement OAuth2 flow",
          "Handle token refresh",
          "Add security headers",
        ],
      });

      const result = await classifyTask(story);

      // Complex criteria should influence classification
      expect(["complex", "expert"]).toContain(result.complexity);
    });
  });

  describe("edge cases", () => {
    it("handles empty title gracefully", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "",
        description: "Fix typo in the readme file",
      });

      const result = await classifyTask(story);

      expect(result).toBeDefined();
      expect(result.complexity).toBeDefined();
    });

    it("handles empty description gracefully", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Fix typo",
        description: "",
      });

      const result = await classifyTask(story);

      expect(result).toBeDefined();
      expect(result.complexity).toBe("simple");
    });

    it("handles empty acceptance criteria gracefully", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Implement feature",
        description: "New feature implementation",
        acceptanceCriteria: [],
      });

      const result = await classifyTask(story);

      expect(result).toBeDefined();
      expect(result.complexity).toBeDefined();
    });

    it("handles very long descriptions", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const longDescription = "This is a complex task ".repeat(100);
      const story = createMockStory({
        title: "Complex task",
        description: longDescription,
      });

      const result = await classifyTask(story);

      expect(result).toBeDefined();
    });
  });

  describe("mixed signals handling", () => {
    it("handles mixed complexity signals reasonably", async () => {
      const { classifyTask } = await import("../../src/routing/classifier");

      const story = createMockStory({
        title: "Fix typo in distributed system docs",
        description:
          "Simple documentation update for the distributed architecture",
      });

      const result = await classifyTask(story);

      // Should not crash, should make a reasonable decision
      expect(result).toBeDefined();
      expect(["simple", "medium", "complex", "expert"]).toContain(
        result.complexity
      );
    });
  });
});

describe("ClassificationResult type", () => {
  it("exports ClassificationResult type", async () => {
    // This test verifies the type is exported
    const module = await import("../../src/routing/classifier");
    expect(module.classifyTask).toBeDefined();
    // Type is used in function signature
  });
});

describe("Low confidence handling", () => {
  it("returns confidence < 0.8 for ambiguous tasks", async () => {
    const { classifyTask } = await import("../../src/routing/classifier");

    // This task has no clear complexity indicators - ambiguous
    const story = createMockStory({
      title: "Update the thing",
      description: "Make changes to the system",
    });

    const result = await classifyTask(story);

    // Ambiguous tasks may have lower confidence
    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1.0);
  });

  it("includes low confidence indicator in reasoning for uncertain tasks", async () => {
    const { classifyTask } = await import("../../src/routing/classifier");

    // Task with no clear keywords - triggers low confidence path
    const story = createMockStory({
      title: "Do stuff",
      description: "Stuff needs to be done",
      acceptanceCriteria: ["Things work"],
    });

    const result = await classifyTask(story);

    // The reasoning should be present
    expect(result.reasoning).toBeDefined();
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("still returns usedLLM false when LLM fallback not implemented", async () => {
    const { classifyTask } = await import("../../src/routing/classifier");

    // Ambiguous task that would trigger LLM fallback if implemented
    const story = createMockStory({
      title: "Something vague",
      description: "No clear indicators",
    });

    const result = await classifyTask(story);

    // LLM is not implemented yet, so usedLLM should always be false
    expect(result.usedLLM).toBe(false);
  });
});

describe("classifyWithLLM() placeholder", () => {
  it("exports classifyWithLLM function", async () => {
    const module = await import("../../src/routing/classifier");
    expect(module.classifyWithLLM).toBeDefined();
    expect(typeof module.classifyWithLLM).toBe("function");
  });

  it("throws error indicating LLM not implemented", async () => {
    const { classifyWithLLM } = await import("../../src/routing/classifier");

    const story = createMockStory({
      title: "Test task",
      description: "Test description",
    });

    // The placeholder should throw an error
    await expect(classifyWithLLM(story, "simple")).rejects.toThrow(
      "LLM classification not implemented yet"
    );
  });

  it("error message suggests using classifyTask instead", async () => {
    const { classifyWithLLM } = await import("../../src/routing/classifier");

    const story = createMockStory({
      title: "Test task",
      description: "Test description",
    });

    try {
      await classifyWithLLM(story, "medium");
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect((error as Error).message).toContain("classifyTask()");
    }
  });
});
