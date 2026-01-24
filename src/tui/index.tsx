/**
 * TUI Module
 *
 * Beautiful terminal interface for Relentless
 */

// Main app
export { App } from "./App.js";

// Original components
export { Header } from "./components/Header.js";
export { ProgressBar } from "./components/ProgressBar.js";
export { CurrentStory } from "./components/CurrentStory.js";
export { AgentOutput } from "./components/AgentOutput.js";
export { StoryGrid } from "./components/StoryGrid.js";
export { AgentStatus } from "./components/AgentStatus.js";

// New components for 3-column layout
export { TaskItem } from "./components/TaskItem.js";
export { TaskPanel } from "./components/TaskPanel.js";
export { OutputPanel } from "./components/OutputPanel.js";
export { MessageItem } from "./components/MessageItem.js";
export { MessageQueuePanel } from "./components/MessageQueuePanel.js";
export { CostBadge } from "./components/CostBadge.js";
export { TokenCounter } from "./components/TokenCounter.js";
export { RateLimitIndicator } from "./components/RateLimitIndicator.js";
export { StatusBar } from "./components/StatusBar.js";

// Layouts
export { LayoutSwitcher, ThreeColumnLayout, VerticalLayout } from "./layouts/index.js";

// Hooks
export { useTUI } from "./hooks/useTUI.js";
export { useTimer } from "./hooks/useTimer.js";
export { useResponsiveLayout } from "./hooks/useResponsiveLayout.js";
export { useFrameAnimation, usePulse, useTypingEffect, useBlinkingCursor, useAnimatedNumber, useCountdown } from "./hooks/useAnimation.js";
export { useCostTracking, formatCost, formatTokens } from "./hooks/useCostTracking.js";

// Types and theme
export * from "./types.js";
export * from "./theme.js";
