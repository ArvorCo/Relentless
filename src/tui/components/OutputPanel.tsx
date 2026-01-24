/**
 * OutputPanel Component
 *
 * Enhanced central output panel with context header,
 * code block detection, and fullscreen support
 */

import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { colors, borders } from "../theme.js";
import type { Story, OutputMode } from "../types.js";
import type { AgentName } from "../../agents/types.js";

interface OutputPanelProps {
  /** Output lines to display */
  lines: string[];
  /** Maximum lines to show */
  maxLines?: number;
  /** Current story being worked on */
  currentStory?: Story | null;
  /** Current agent name */
  currentAgent?: string;
  /** Current model being used */
  currentModel?: string;
  /** Routing information */
  routing?: {
    mode: "free" | "cheap" | "good" | "genius";
    complexity: "simple" | "medium" | "complex" | "expert";
    harness: AgentName;
    model: string;
  };
  /** Display mode (normal or fullscreen) */
  displayMode?: OutputMode;
  /** Panel title */
  title?: string;
}

interface ParsedLine {
  text: string;
  type: "normal" | "code" | "code-start" | "code-end" | "header" | "success" | "error" | "warning";
  language?: string;
}

/**
 * Parse output lines to detect code blocks and special formatting
 */
function parseLines(lines: string[]): ParsedLine[] {
  const parsed: ParsedLine[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // Check for code block markers
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        parsed.push({ text: line, type: "code-end" });
        inCodeBlock = false;
      } else {
        const language = line.substring(3).trim();
        parsed.push({ text: line, type: "code-start", language });
        inCodeBlock = true;
      }
      continue;
    }

    // Inside code block
    if (inCodeBlock) {
      parsed.push({ text: line, type: "code" });
      continue;
    }

    // Check for special line types
    if (line.startsWith("---") || line.startsWith("===")) {
      parsed.push({ text: line, type: "header" });
    } else if (
      line.includes("success") ||
      line.includes("complete") ||
      line.includes("\u2713") ||
      line.includes("\uD83C\uDF89")
    ) {
      parsed.push({ text: line, type: "success" });
    } else if (
      line.includes("error") ||
      line.includes("Error") ||
      line.includes("failed") ||
      line.includes("\u274C")
    ) {
      parsed.push({ text: line, type: "error" });
    } else if (
      line.includes("warning") ||
      line.includes("Warning") ||
      line.includes("\u26A0")
    ) {
      parsed.push({ text: line, type: "warning" });
    } else {
      parsed.push({ text: line, type: "normal" });
    }
  }

  return parsed;
}

/**
 * Get color for a parsed line type
 */
function getLineColor(type: ParsedLine["type"]): string {
  switch (type) {
    case "code":
    case "code-start":
    case "code-end":
      return colors.accent;
    case "header":
      return colors.primary;
    case "success":
      return colors.success;
    case "error":
      return colors.error;
    case "warning":
      return colors.warning;
    default:
      return colors.dim;
  }
}

/**
 * Format mode badge text
 */
function getModeBadge(mode: string): { text: string; color: string } {
  switch (mode) {
    case "free":
      return { text: "FREE", color: colors.success };
    case "cheap":
      return { text: "CHEAP", color: colors.primary };
    case "good":
      return { text: "GOOD", color: colors.warning };
    case "genius":
      return { text: "GENIUS", color: colors.accent };
    default:
      return { text: mode.toUpperCase(), color: colors.dim };
  }
}

/**
 * Format complexity badge
 */
function getComplexityBadge(complexity: string): { text: string; color: string } {
  switch (complexity) {
    case "simple":
      return { text: "S", color: colors.success };
    case "medium":
      return { text: "M", color: colors.warning };
    case "complex":
      return { text: "C", color: colors.error };
    case "expert":
      return { text: "E", color: colors.accent };
    default:
      return { text: complexity[0]?.toUpperCase() ?? "?", color: colors.dim };
  }
}

export function OutputPanel({
  lines,
  maxLines = 12,
  currentStory,
  currentAgent,
  currentModel,
  routing,
  displayMode = "normal",
  title = "Output",
}: OutputPanelProps): React.ReactElement {
  // Parse lines for syntax highlighting
  const parsedLines = useMemo(() => parseLines(lines), [lines]);

  // Get visible lines based on max
  const clampedMaxLines = Math.max(0, maxLines);
  const displayLines =
    clampedMaxLines > 0 ? parsedLines.slice(-clampedMaxLines) : [];

  // Build context header
  const hasContext = currentStory || currentAgent || routing;

  return (
    <Box flexDirection="column" paddingX={1} width="100%">
      {/* Context header */}
      {hasContext && (
        <Box flexDirection="row" marginBottom={1}>
          {/* Story ID */}
          {currentStory && (
            <>
              <Text color={colors.warning} bold>
                {currentStory.id}
              </Text>
              <Text color={colors.dim}> {borders.vertical} </Text>
            </>
          )}

          {/* Agent/Model */}
          {(currentAgent || currentModel) && (
            <>
              <Text color={colors.primary}>
                {currentAgent ?? ""}
                {currentModel ? `/${currentModel}` : ""}
              </Text>
            </>
          )}

          {/* Routing info */}
          {routing && (
            <>
              <Text color={colors.dim}> {borders.vertical} </Text>
              <Text color={getModeBadge(routing.mode).color}>
                {getModeBadge(routing.mode).text}
              </Text>
              <Text color={colors.dim}>/</Text>
              <Text color={getComplexityBadge(routing.complexity).color}>
                {getComplexityBadge(routing.complexity).text}
              </Text>
            </>
          )}

          {/* Fullscreen indicator */}
          {displayMode === "fullscreen" && (
            <>
              <Text color={colors.dim}> {borders.vertical} </Text>
              <Text color={colors.accent}>[F] Fullscreen</Text>
            </>
          )}
        </Box>
      )}

      {/* Title bar */}
      <Box>
        <Text color={colors.dim} bold>
          {borders.horizontal}
          {borders.horizontal} {title} {borders.horizontal}
          {borders.horizontal}
        </Text>
      </Box>

      {/* Output content */}
      <Box flexDirection="column">
        {displayLines.length > 0 ? (
          displayLines.map((line, i) => (
            <Text
              key={i}
              color={getLineColor(line.type)}
              dimColor={line.type === "normal"}
              wrap="truncate"
            >
              {line.text}
            </Text>
          ))
        ) : (
          <Text color={colors.dim} dimColor>
            Waiting for agent output...
          </Text>
        )}
      </Box>

      {/* Auto-scroll indicator */}
      {lines.length > clampedMaxLines && (
        <Box marginTop={1}>
          <Text color={colors.dim}>
            {borders.vertical} {lines.length - clampedMaxLines} lines above{" "}
            {borders.vertical}
          </Text>
        </Box>
      )}
    </Box>
  );
}
