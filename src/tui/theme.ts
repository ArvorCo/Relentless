/**
 * TUI Theme
 *
 * Colors, borders, and styling constants
 */

export const colors = {
  primary: "cyan",
  success: "green",
  warning: "yellow",
  error: "red",
  dim: "gray",
  accent: "magenta",
} as const;

export const symbols = {
  complete: "✓",
  pending: "○",
  inProgress: "◉",
  arrow: "→",
  bullet: "•",
  lightning: "⚡",
  rocket: "🚀",
  party: "🎉",
  warning: "⚠️",
  error: "❌",
  clock: "⏳",
} as const;

export const borders = {
  horizontal: "─",
  vertical: "│",
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  teeLeft: "├",
  teeRight: "┤",
  cross: "┼",
  doubleLine: "═",
} as const;
