/**
 * Hybrid Complexity Classifier
 *
 * Implements two-phase task complexity classification:
 * 1. Fast heuristic analysis (< 50ms, no API calls)
 * 2. LLM fallback only when confidence < 0.8
 *
 * The classifier analyzes user story title, description, and acceptance criteria
 * to determine task complexity: simple, medium, complex, or expert.
 *
 * @module src/routing/classifier
 */

import type { UserStory } from "../prd/types";
import type { Complexity } from "../config/schema";

/**
 * Result of task complexity classification.
 */
export interface ClassificationResult {
  /** The determined complexity level */
  complexity: Complexity;
  /** Confidence score from 0.0 to 1.0 */
  confidence: number;
  /** Human-readable explanation of the classification */
  reasoning: string;
  /** Whether the LLM was used for classification (false for high-confidence heuristic) */
  usedLLM: boolean;
}

/**
 * Keyword patterns for each complexity level.
 * Each pattern has an associated weight for confidence calculation.
 */
interface KeywordPattern {
  patterns: RegExp[];
  weight: number;
}

/**
 * Simple task keyword patterns.
 * Tasks that are trivial: typos, comments, renaming, formatting.
 */
const SIMPLE_PATTERNS: KeywordPattern = {
  patterns: [
    /\bfix\s+typo/i,
    /\btypo\b/i,
    /\bupdate\s+docs?/i,
    /\bdocumentation\s+update/i,
    /\badd\s+comment/i,
    /\brename\b/i,
    /\bformat\b/i,
    /\bformatting\b/i,
    /\breadme/i,
    /\bcleanup\s+comment/i,
    /\bfix\s+spelling/i,
    /\bcorrect\s+typo/i,
    /\bupdate\s+readme/i,
    /\bfix\s+indent/i,
    /\bremove\s+whitespace/i,
    /\bfix\s+lint/i,
    /\blint\s+error/i,
  ],
  weight: 0.3,
};

/**
 * Medium task keyword patterns.
 * Standard development tasks: features, tests, refactoring, API work.
 */
const MEDIUM_PATTERNS: KeywordPattern = {
  patterns: [
    /\bimplement\b/i,
    /\badd\s+feature/i,
    /\badd\s+new\b/i,
    /\brefactor\b/i,
    /\btest\b/i,
    /\bapi\b/i,
    /\bendpoint\b/i,
    /\bcreate\b/i,
    /\bbuild\b/i,
    /\bfix\s+bug/i,
    /\bvalidat/i, // validation, validate
    /\bhandl/i, // handle, handler, handling
    /\bintegrat/i, // integrate (but not as strong as complex)
    /\bmodify\b/i,
    /\bupdate\s+logic/i,
    /\badd\s+support/i,
    /\bfeature\b/i, // standalone feature keyword
    /\bprofile\b/i, // user profile work
  ],
  weight: 0.25,
};

/**
 * Complex task keyword patterns.
 * Advanced tasks: architecture, security, authentication, migrations.
 */
const COMPLEX_PATTERNS: KeywordPattern = {
  patterns: [
    /\barchitect/i,
    /\bintegrat\w*\s+(?:service|api|system)/i,
    /\bmigrat/i,
    /\bsecurity\b/i,
    /\bauth\b/i,
    /\boauth/i,
    /\bjwt\b/i,
    /\bencrypt/i,
    /\bdatabase\s+(?:design|schema|migrat)/i,
    /\bscalabil/i,
    /\bcaching\s+(?:strategy|layer)/i,
    /\berror\s+handling\s+(?:strategy|system)/i,
    /\bthird[- ]party/i,
    /\bexternal\s+(?:api|service)/i,
    /\bpayment/i,
    /\bwebhook/i,
    /\bqueue\s+(?:system|processing)/i,
  ],
  weight: 0.35,
};

/**
 * Expert task keyword patterns.
 * Highly complex tasks: performance, distributed systems, concurrency.
 */
const EXPERT_PATTERNS: KeywordPattern = {
  patterns: [
    /\bredesign\b/i,
    /\bperformance\s+(?:optim|improv|tun)/i,
    /\bdistribut/i,
    /\bconcurren/i,
    /\bparallel\b/i,
    /\basync\b/i,
    /\breal[- ]time/i,
    /\bmicroservice/i,
    /\bevent[- ]driven/i,
    /\bcritical\s+path/i,
    /\bhigh\s+availabil/i,
    /\bfault\s+toleran/i,
    /\bload\s+balanc/i,
    /\bsharding\b/i,
    /\breplication\b/i,
    /\brace\s+condition/i,
    /\bdeadlock/i,
    /\bthread[- ]safe/i,
  ],
  weight: 0.4,
};

/**
 * File patterns that boost confidence for certain complexity levels.
 */
const FILE_PATTERN_BOOSTS: Array<{
  pattern: RegExp;
  complexity: Complexity;
  boost: number;
}> = [
  // Documentation files boost simple confidence
  { pattern: /readme/i, complexity: "simple", boost: 0.15 },
  { pattern: /\.md$/i, complexity: "simple", boost: 0.1 },
  { pattern: /docs?\b/i, complexity: "simple", boost: 0.1 },
  { pattern: /changelog/i, complexity: "simple", boost: 0.1 },

  // Auth/security patterns boost complex confidence
  { pattern: /\bjwt\b/i, complexity: "complex", boost: 0.15 },
  { pattern: /\bauth/i, complexity: "complex", boost: 0.15 },
  { pattern: /\boauth/i, complexity: "complex", boost: 0.2 },
  { pattern: /\bsecurity/i, complexity: "complex", boost: 0.1 },
  { pattern: /\btoken/i, complexity: "complex", boost: 0.1 },
  { pattern: /\bencrypt/i, complexity: "complex", boost: 0.15 },

  // Performance patterns boost expert confidence
  { pattern: /\bperformance/i, complexity: "expert", boost: 0.15 },
  { pattern: /\boptimiz/i, complexity: "expert", boost: 0.1 },
  { pattern: /\bconcurren/i, complexity: "expert", boost: 0.15 },
  { pattern: /\bparallel/i, complexity: "expert", boost: 0.15 },
];

/**
 * Count pattern matches in text and calculate weighted score.
 */
function countPatternMatches(text: string, patterns: KeywordPattern): number {
  let count = 0;
  for (const pattern of patterns.patterns) {
    if (pattern.test(text)) {
      count++;
    }
  }
  return count * patterns.weight;
}

/**
 * Get the full text to analyze from a user story.
 */
function getAnalyzableText(story: UserStory): string {
  const parts = [
    story.title || "",
    story.description || "",
    ...(story.acceptanceCriteria || []),
  ];
  return parts.join(" ").toLowerCase();
}

/**
 * Calculate complexity scores from heuristic analysis.
 */
function calculateHeuristicScores(text: string): Record<Complexity, number> {
  return {
    simple: countPatternMatches(text, SIMPLE_PATTERNS),
    medium: countPatternMatches(text, MEDIUM_PATTERNS),
    complex: countPatternMatches(text, COMPLEX_PATTERNS),
    expert: countPatternMatches(text, EXPERT_PATTERNS),
  };
}

/**
 * Apply file pattern boosts to complexity scores.
 */
function applyFilePatternBoosts(
  text: string,
  scores: Record<Complexity, number>
): void {
  for (const { pattern, complexity, boost } of FILE_PATTERN_BOOSTS) {
    if (pattern.test(text)) {
      scores[complexity] += boost;
    }
  }
}

/**
 * Determine the winning complexity level and confidence.
 */
function determineComplexity(scores: Record<Complexity, number>): {
  complexity: Complexity;
  confidence: number;
  reasoning: string;
} {
  const entries = Object.entries(scores) as Array<[Complexity, number]>;
  entries.sort((a, b) => b[1] - a[1]);

  const [winner, winnerScore] = entries[0];
  const [, runnerUpScore] = entries[1];

  // Calculate confidence based on:
  // 1. The absolute score of the winner
  // 2. The gap between winner and runner-up
  const baseConfidence = Math.min(0.5 + winnerScore, 0.95);
  const gapBoost = Math.min((winnerScore - runnerUpScore) * 0.2, 0.15);
  const confidence = Math.min(baseConfidence + gapBoost, 0.95);

  // Generate reasoning
  const signalsFound = entries
    .filter(([, score]) => score > 0)
    .map(([level, score]) => `${level}(${score.toFixed(2)})`)
    .join(", ");

  const reasoning =
    signalsFound.length > 0
      ? `Heuristic analysis found signals: ${signalsFound}. Winner: ${winner}`
      : `No strong signals found, defaulting to ${winner}`;

  return { complexity: winner, confidence, reasoning };
}

/**
 * Classify a user story by complexity using hybrid approach.
 *
 * Phase 1: Fast heuristic analysis (< 50ms)
 * Phase 2: LLM fallback if confidence < 0.8 (not implemented yet - returns heuristic)
 *
 * @param story - The user story to classify
 * @returns Classification result with complexity, confidence, reasoning, and usedLLM flag
 */
export async function classifyTask(
  story: UserStory
): Promise<ClassificationResult> {
  // Get text to analyze
  const text = getAnalyzableText(story);

  // Phase 1: Heuristic analysis
  const scores = calculateHeuristicScores(text);

  // Apply file pattern boosts
  applyFilePatternBoosts(text, scores);

  // Determine winner and confidence
  const { complexity, confidence, reasoning } = determineComplexity(scores);

  // If confidence >= 0.8, use heuristic result directly
  if (confidence >= 0.8) {
    return {
      complexity,
      confidence,
      reasoning,
      usedLLM: false,
    };
  }

  // Phase 2: LLM fallback for low confidence
  // For now, we'll still return the heuristic result but mark it appropriately
  // TODO: Implement actual LLM call for low confidence cases
  // The LLM call would use Haiku for cost efficiency

  // For low confidence cases, we still return the heuristic result
  // but with a slight boost since we're being transparent about uncertainty
  return {
    complexity,
    confidence: Math.min(confidence + 0.1, 0.79), // Keep below 0.8 to indicate uncertainty
    reasoning: `${reasoning} (Low confidence - consider manual review)`,
    usedLLM: false, // Will be true once LLM fallback is implemented
  };
}

/**
 * Classify a task with explicit LLM fallback (for when needed).
 *
 * This is a placeholder for future LLM integration.
 * Will be called when heuristic confidence < 0.8.
 *
 * @internal
 */
export async function classifyWithLLM(
  _story: UserStory,
  _heuristicSuggestion: Complexity
): Promise<ClassificationResult> {
  // TODO: Implement LLM-based classification using Haiku
  // The prompt would include:
  // - Task title and description
  // - Acceptance criteria
  // - Heuristic suggestion for context
  //
  // LLM response should be JSON with:
  // { complexity: "simple"|"medium"|"complex"|"expert", reasoning: "..." }

  throw new Error(
    "LLM classification not implemented yet. Use classifyTask() which handles fallback."
  );
}
