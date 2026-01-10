/**
 * Smart Agent Router
 *
 * Routes stories to the best-suited agent based on story type
 */

import type { AgentName, StoryType } from "../agents/types";
import { AGENT_SPECIALIZATIONS } from "../agents/types";
import type { RoutingConfig } from "../config/schema";
import { inferStoryType, type UserStory } from "../prd/types";

/**
 * Route a story to the best agent
 */
export function routeStory(story: UserStory, routing: RoutingConfig): AgentName {
  const storyType = inferStoryType(story) as StoryType;

  // Check explicit routing rules first
  const rule = routing.rules.find((r) => r.storyType === storyType);
  if (rule) {
    return rule.agent;
  }

  // Find best agent based on specializations
  const scores = Object.entries(AGENT_SPECIALIZATIONS).map(([agent, specializations]) => {
    const score = specializations.includes(storyType) ? 2 : 0;
    const generalScore = specializations.includes("general") ? 1 : 0;
    return { agent: agent as AgentName, score: score + generalScore };
  });

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // If no good match, use default
  if (scores[0].score === 0) {
    return routing.default;
  }

  return scores[0].agent;
}

/**
 * Get recommended agent for a story type
 */
export function getRecommendedAgent(storyType: StoryType): AgentName[] {
  return Object.entries(AGENT_SPECIALIZATIONS)
    .filter(([, specializations]) => specializations.includes(storyType))
    .map(([agent]) => agent as AgentName);
}
