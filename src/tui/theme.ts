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
  /** Panel-specific colors */
  panel: {
    taskBorder: "cyan",
    outputBorder: "white",
    queueBorder: "magenta",
    statusBorder: "gray",
    headerBg: "gray",
  },
  /** Message type colors */
  message: {
    command: "magenta",
    prompt: "white",
    system: "gray",
    info: "cyan",
    success: "green",
    error: "red",
    warning: "yellow",
  },
  /** Status colors */
  status: {
    active: "green",
    pending: "gray",
    blocked: "red",
    complete: "green",
    inProgress: "yellow",
    rateLimited: "red",
  },
  /** Cost display colors */
  cost: {
    free: "green",
    cheap: "cyan",
    medium: "yellow",
    expensive: "red",
  },
} as const;

export const symbols = {
  complete: "\u2713",
  pending: "\u25CB",
  inProgress: "\u25C9",
  blocked: "\uD83D\uDD12",
  arrow: "\u2192",
  bullet: "\u2022",
  lightning: "\u26A1",
  rocket: "\uD83D\uDE80",
  party: "\uD83C\uDF89",
  warning: "\u26A0\uFE0F",
  error: "\u274C",
  clock: "\u23F3",
  /** Panel indicators */
  panel: {
    expand: "+",
    collapse: "-",
    fullscreen: "\u25A3",
    minimize: "\u25A2",
  },
  /** Pulse animation frames */
  pulse: [">", ">>", ">>>", ">>"],
  /** Priority badges */
  priority: {
    critical: "!",
    high: "\u2191",
    medium: "\u2022",
    low: "\u2193",
  },
  /** Research indicator */
  research: "\uD83D\uDD0D",
} as const;

export const borders = {
  horizontal: "\u2500",
  vertical: "\u2502",
  topLeft: "\u250C",
  topRight: "\u2510",
  bottomLeft: "\u2514",
  bottomRight: "\u2518",
  teeLeft: "\u251C",
  teeRight: "\u2524",
  cross: "\u253C",
  doubleLine: "\u2550",
  /** Rounded corners for panels */
  rounded: {
    topLeft: "\u256D",
    topRight: "\u256E",
    bottomLeft: "\u2570",
    bottomRight: "\u256F",
  },
  /** Double-line borders for emphasis */
  double: {
    horizontal: "\u2550",
    vertical: "\u2551",
    topLeft: "\u2554",
    topRight: "\u2557",
    bottomLeft: "\u255A",
    bottomRight: "\u255D",
  },
} as const;

/** Animation timing constants */
export const animation = {
  /** Pulse animation interval (ms) */
  pulseInterval: 300,
  /** Typing effect speed (ms per character) */
  typingSpeed: 30,
  /** Cursor blink interval (ms) */
  blinkInterval: 500,
  /** Number transition duration (ms) */
  numberTransition: 500,
  /** Countdown update interval (ms) */
  countdownInterval: 1000,
  /** Status message display duration (ms) */
  statusMessageDuration: 2000,
} as const;

/** Panel layout constants */
export const layout = {
  /** Minimum panel widths */
  minWidth: {
    task: 20,
    output: 40,
    queue: 20,
  },
  /** Default panel heights (in lines) */
  defaultHeight: {
    header: 2,
    statusBar: 1,
    output: 12,
    queue: 8,
  },
  /** Padding values */
  padding: {
    panel: 1,
    content: 1,
    section: 1,
  },
} as const;

/** Badge styles for different states/modes */
export const badges = {
  mode: {
    free: { text: "FREE", color: "green" },
    cheap: { text: "CHEAP", color: "cyan" },
    good: { text: "GOOD", color: "yellow" },
    genius: { text: "GENIUS", color: "magenta" },
  },
  complexity: {
    simple: { text: "S", color: "green" },
    medium: { text: "M", color: "yellow" },
    complex: { text: "C", color: "red" },
    expert: { text: "E", color: "magenta" },
  },
  priority: {
    1: { text: "P1", color: "red" },
    2: { text: "P2", color: "red" },
    3: { text: "P3", color: "yellow" },
    4: { text: "P4", color: "yellow" },
    5: { text: "P5", color: "gray" },
  },
} as const;
