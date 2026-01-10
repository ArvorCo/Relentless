/**
 * Agent Adapters Module
 *
 * Re-exports all agent-related types and functions
 */

export * from "./types";
export * from "./registry";

// Individual adapters (for direct access if needed)
export { claudeAdapter } from "./claude";
export { ampAdapter } from "./amp";
export { opencodeAdapter } from "./opencode";
export { codexAdapter } from "./codex";
export { droidAdapter } from "./droid";
export { geminiAdapter } from "./gemini";
