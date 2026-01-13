# Technical Implementation Plan: Queued Prompts System

**Feature Branch**: `001-queued-prompts`
**Created**: 2026-01-13
**Status**: Planning Complete
**Spec Reference**: `spec.md`

---

## Technical Overview

### Architecture Approach

The queued prompts system follows a **file-based event queue** pattern with three main components:

1. **Queue Module** (`src/queue/`) - Core queue management (read, write, parse, process)
2. **CLI Commands** (`bin/relentless.ts`) - User-facing queue operations
3. **TUI Components** (`src/tui/`) - Visual queue display and input

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
├─────────────────────┬───────────────────────────────────────────┤
│    CLI Commands     │              TUI Components               │
│  relentless queue   │  QueuePanel  │  QueueInput  │  QueueItem  │
├─────────────────────┴───────────────────────────────────────────┤
│                        Queue Module                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │   Parser    │  │   Writer    │  │     Command Executor     │ │
│  │ (read/parse)│  │ (add/remove)│  │ (PAUSE/SKIP/PRIORITY/...) │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      File System Layer                          │
│        .queue.txt         │        .queue.processed.txt         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Technologies

- **Runtime**: Bun (built-in test runner, file APIs)
- **Language**: TypeScript (strict mode)
- **Validation**: Zod schemas for queue item validation
- **TUI**: Ink/React (existing framework)
- **Testing**: Bun test (`bun test`)

### Integration Points

| Component | File | Integration |
|-----------|------|-------------|
| Execution Runner | `src/execution/runner.ts` | Insert queue check in main loop (line ~254) |
| Prompt Builder | `src/execution/runner.ts:buildPrompt()` | Inject queue prompts into context |
| CLI | `bin/relentless.ts` | Add `queue` command group |
| TUI State | `src/tui/types.ts` | Add `queueItems` to `TUIState` |
| TUI App | `src/tui/App.tsx` | Add `QueuePanel` component |
| TUI Runner | `src/tui/TUIRunner.tsx` | Add queue state management |

---

## Data Models

### Queue File Format

```
# .queue.txt format (line-based with timestamp prefix)
2026-01-13T10:30:00.000Z | Focus on error handling for the API
2026-01-13T10:31:00.000Z | [PAUSE]
2026-01-13T10:32:00.000Z | [SKIP US-003]
2026-01-13T10:33:00.000Z | [PRIORITY US-005]
```

### TypeScript Types

```typescript
// src/queue/types.ts

import { z } from "zod";

/**
 * Structured command types
 */
export const QueueCommandType = z.enum(["PAUSE", "SKIP", "PRIORITY", "ABORT"]);
export type QueueCommandType = z.infer<typeof QueueCommandType>;

/**
 * Queue item type
 */
export const QueueItemType = z.enum(["prompt", "command"]);
export type QueueItemType = z.infer<typeof QueueItemType>;

/**
 * A single queue item
 */
export const QueueItemSchema = z.object({
  /** Unique ID (timestamp-based) */
  id: z.string(),
  /** Raw content from file */
  content: z.string(),
  /** Type of item */
  type: QueueItemType,
  /** Parsed command (if type is "command") */
  command: QueueCommandType.optional(),
  /** Target story ID (for SKIP/PRIORITY) */
  targetStoryId: z.string().optional(),
  /** When item was added */
  addedAt: z.string().datetime(),
  /** When item was processed (null if pending) */
  processedAt: z.string().datetime().optional(),
});
export type QueueItem = z.infer<typeof QueueItemSchema>;

/**
 * Queue state for a feature
 */
export const QueueStateSchema = z.object({
  /** Path to feature directory */
  featurePath: z.string(),
  /** Pending items */
  pending: z.array(QueueItemSchema),
  /** Processed items (audit trail) */
  processed: z.array(QueueItemSchema),
  /** Last time queue was checked */
  lastChecked: z.string().datetime().optional(),
});
export type QueueState = z.infer<typeof QueueStateSchema>;

/**
 * Result of processing queue commands
 */
export interface QueueProcessResult {
  /** Text prompts to inject into agent context */
  prompts: string[];
  /** Commands to execute */
  commands: Array<{
    type: QueueCommandType;
    storyId?: string;
  }>;
  /** Warnings (e.g., unrecognized commands treated as prompts) */
  warnings: string[];
}
```

### TUI State Extension

```typescript
// Addition to src/tui/types.ts

export interface QueueDisplayItem {
  id: string;
  content: string;
  type: "prompt" | "command";
  addedAt: string;
}

// Add to TUIState interface:
export interface TUIState {
  // ... existing fields ...

  /** Queue items to display */
  queueItems: QueueDisplayItem[];
  /** Is queue input mode active */
  queueInputActive: boolean;
  /** Current queue input value */
  queueInputValue: string;
}
```

---

## API Contracts

### Queue Module Public API

```typescript
// src/queue/index.ts

/**
 * Load queue state from feature directory
 */
export async function loadQueue(featurePath: string): Promise<QueueState>;

/**
 * Add item to queue
 */
export async function addToQueue(
  featurePath: string,
  content: string
): Promise<QueueItem>;

/**
 * Remove item from queue by index (1-based)
 */
export async function removeFromQueue(
  featurePath: string,
  index: number
): Promise<QueueItem | null>;

/**
 * Clear all items from queue
 */
export async function clearQueue(featurePath: string): Promise<number>;

/**
 * Process queue and return items for this iteration
 * Moves processed items to .queue.processed.txt
 */
export async function processQueue(
  featurePath: string
): Promise<QueueProcessResult>;

/**
 * Parse a single queue line into QueueItem
 */
export function parseQueueLine(line: string): QueueItem | null;

/**
 * Parse command from content (e.g., "[PAUSE]" -> { type: "PAUSE" })
 */
export function parseCommand(content: string): {
  type: QueueCommandType;
  storyId?: string;
} | null;

/**
 * Format queue item for file
 */
export function formatQueueLine(item: QueueItem): string;
```

### CLI Commands

```bash
# Add item to queue
relentless queue add "message" --feature <name>
relentless queue add "[PAUSE]" --feature <name>
relentless queue add "[SKIP US-003]" --feature <name>

# List queue contents
relentless queue list --feature <name>
relentless queue list --feature <name> --all  # Include processed

# Remove item (1-based index)
relentless queue remove <index> --feature <name>

# Clear all items
relentless queue clear --feature <name>
```

### Error Responses

| Scenario | Exit Code | Message |
|----------|-----------|---------|
| Feature not found | 1 | `Feature '<name>' not found` |
| Invalid index | 1 | `Invalid index: <n>. Queue has <m> items` |
| Queue empty | 0 | `Queue is empty` |
| File permission error | 1 | `Cannot write to queue file: <path>` |

---

## Implementation Strategy

### Phase 1: Foundation (Stories 1-3)

**Goal**: Test infrastructure + core queue functionality

```
Story 1: Test Infrastructure
├── Configure bun test
├── Create test helper utilities
├── Add first test file (queue/parser.test.ts)
├── Update CLAUDE.md with testing documentation
└── Verify: bun test runs successfully

Story 2: CLI Queue Add
├── Create src/queue/types.ts (Zod schemas)
├── Create src/queue/parser.ts (parse/format functions)
├── Create src/queue/writer.ts (add/remove/clear)
├── Create src/queue/index.ts (exports)
├── Add "queue" command group to CLI
├── Implement "queue add" command
└── Verify: relentless queue add works

Story 3: Runner Queue Processing
├── Create src/queue/processor.ts (process queue)
├── Modify runner.ts:buildPrompt() to include queue
├── Modify runner.ts main loop to check queue
├── Add queue acknowledgment to progress.txt
└── Verify: Queue items appear in agent context
```

### Phase 2: CLI Completeness (Stories 4, 9)

**Goal**: Full CLI queue management

```
Story 4: CLI Queue List
├── Implement "queue list" command
├── Add --all flag for processed items
├── Format output nicely with timestamps
└── Verify: relentless queue list works

Story 9: CLI Queue Remove
├── Implement "queue remove <index>" command
├── Implement "queue clear" command
├── Handle edge cases (invalid index, empty queue)
└── Verify: relentless queue remove works
```

### Phase 3: Structured Commands (Story 5)

**Goal**: PAUSE, SKIP, PRIORITY, ABORT support

```
Story 5: Structured Commands
├── Implement parseCommand() function
├── Add command execution in runner.ts
├── Handle PAUSE (wait for user input)
├── Handle SKIP (mark story as skipped)
├── Handle PRIORITY (reorder next story)
├── Handle ABORT (clean exit)
└── Verify: Commands execute correctly
```

### Phase 4: TUI Integration (Stories 6, 7, 8)

**Goal**: Visual queue management in TUI

```
Story 6: TUI Queue Panel
├── Create src/tui/components/QueuePanel.tsx
├── Add queueItems to TUIState
├── Add queue loading to TUIRunner.tsx
├── Add file watcher for queue updates
└── Verify: Queue displays in TUI

Story 7: TUI Queue Input
├── Create src/tui/components/QueueInput.tsx
├── Add keyboard handler for 'q' key
├── Implement input focus management
├── Connect to queue writer
└── Verify: Can add items from TUI

Story 8: TUI Queue Removal
├── Add keyboard handler for 'd' key
├── Implement item selection
├── Add confirmation for 'D' (clear all)
└── Verify: Can remove items from TUI
```

### Phase 5: Reliability (Story 10)

**Goal**: Edge cases and persistence

```
Story 10: Queue Persistence
├── Add atomic write (temp file + rename)
├── Handle malformed queue content
├── Add recovery from partial processing
├── Test crash/restart scenarios
└── Verify: Queue survives restarts
```

---

## Testing Strategy

### Test File Structure

```
tests/
├── queue/
│   ├── parser.test.ts      # parseQueueLine, parseCommand
│   ├── writer.test.ts      # addToQueue, removeFromQueue, clearQueue
│   ├── processor.test.ts   # processQueue, command execution
│   └── integration.test.ts # Full queue lifecycle
├── tui/
│   └── QueuePanel.test.ts  # Component rendering
└── e2e/
    └── queue-cli.test.ts   # CLI command tests
```

### Unit Test Examples

```typescript
// tests/queue/parser.test.ts
import { describe, test, expect } from "bun:test";
import { parseQueueLine, parseCommand } from "../../src/queue/parser";

describe("parseQueueLine", () => {
  test("parses prompt line correctly", () => {
    const line = "2026-01-13T10:30:00.000Z | Focus on error handling";
    const item = parseQueueLine(line);

    expect(item).not.toBeNull();
    expect(item!.type).toBe("prompt");
    expect(item!.content).toBe("Focus on error handling");
    expect(item!.addedAt).toBe("2026-01-13T10:30:00.000Z");
  });

  test("parses command line correctly", () => {
    const line = "2026-01-13T10:30:00.000Z | [PAUSE]";
    const item = parseQueueLine(line);

    expect(item).not.toBeNull();
    expect(item!.type).toBe("command");
    expect(item!.command).toBe("PAUSE");
  });

  test("returns null for malformed line", () => {
    const item = parseQueueLine("invalid line without timestamp");
    expect(item).toBeNull();
  });
});

describe("parseCommand", () => {
  test("parses PAUSE command", () => {
    const cmd = parseCommand("[PAUSE]");
    expect(cmd).toEqual({ type: "PAUSE" });
  });

  test("parses SKIP with story ID", () => {
    const cmd = parseCommand("[SKIP US-003]");
    expect(cmd).toEqual({ type: "SKIP", storyId: "US-003" });
  });

  test("is case insensitive", () => {
    const cmd = parseCommand("[pause]");
    expect(cmd).toEqual({ type: "PAUSE" });
  });

  test("returns null for non-command", () => {
    const cmd = parseCommand("Just a regular message");
    expect(cmd).toBeNull();
  });
});
```

### Integration Test Example

```typescript
// tests/queue/integration.test.ts
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { addToQueue, loadQueue, processQueue, clearQueue } from "../../src/queue";

const TEST_DIR = "/tmp/relentless-queue-test";

describe("Queue Integration", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true });
  });

  test("full queue lifecycle", async () => {
    // Add items
    await addToQueue(TEST_DIR, "First message");
    await addToQueue(TEST_DIR, "[PAUSE]");
    await addToQueue(TEST_DIR, "Second message");

    // Verify queue state
    const state = await loadQueue(TEST_DIR);
    expect(state.pending).toHaveLength(3);

    // Process queue
    const result = await processQueue(TEST_DIR);
    expect(result.prompts).toContain("First message");
    expect(result.prompts).toContain("Second message");
    expect(result.commands).toContainEqual({ type: "PAUSE" });

    // Verify items moved to processed
    const afterState = await loadQueue(TEST_DIR);
    expect(afterState.pending).toHaveLength(0);
    expect(afterState.processed).toHaveLength(3);
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/queue-cli.test.ts
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

const TEST_PROJECT = "/tmp/relentless-e2e-test";

describe("Queue CLI E2E", () => {
  beforeEach(async () => {
    if (existsSync(TEST_PROJECT)) {
      rmSync(TEST_PROJECT, { recursive: true });
    }
    mkdirSync(TEST_PROJECT, { recursive: true });

    // Initialize relentless
    await $`cd ${TEST_PROJECT} && bun run ${import.meta.dir}/../../bin/relentless.ts init`;

    // Create a feature
    mkdirSync(join(TEST_PROJECT, "relentless/features/test-feature"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true });
  });

  test("queue add creates queue file", async () => {
    const result = await $`cd ${TEST_PROJECT} && bun run ${import.meta.dir}/../../bin/relentless.ts queue add "Test message" --feature test-feature`.text();

    expect(result).toContain("Added to queue");
    expect(existsSync(join(TEST_PROJECT, "relentless/features/test-feature/.queue.txt"))).toBe(true);
  });
});
```

### Test Data Requirements

- Sample `.queue.txt` files with various formats
- Feature directories with and without queue files
- Malformed queue content for error handling tests

---

## Security Considerations

### Input Validation

- Validate all queue content against length limits (warn if >10KB)
- Sanitize command parsing to prevent injection
- Validate story IDs against PRD before SKIP/PRIORITY

### File System Safety

- Use atomic writes (write to temp, rename) to prevent corruption
- Validate feature directory exists before queue operations
- Use relative paths within relentless directory

### No Secrets in Queue

- Queue files are plain text and may be committed
- Warn users not to include sensitive data
- Consider future encryption option (out of scope)

---

## Rollout Plan

### Development Phases

1. **Alpha** (Stories 1-3): Core queue + test infrastructure
2. **Beta** (Stories 4-5, 9): Full CLI + commands
3. **RC** (Stories 6-8): TUI integration
4. **GA** (Story 10): Reliability + edge cases

### Migration Requirements

- No database migrations (file-based)
- Backward compatible (new files don't break existing features)

### Monitoring

- Log queue operations to progress.txt
- Track processed item count in metadata
- Report queue status in TUI footer

### Rollback Plan

- Queue feature is additive (no breaking changes)
- If issues, can disable by not checking queue in runner
- Queue files remain valid for manual inspection

---

## File Listing

### New Files to Create

```
src/queue/
├── types.ts           # Zod schemas and TypeScript types
├── parser.ts          # Parse queue lines and commands
├── writer.ts          # Write operations (add, remove, clear)
├── processor.ts       # Process queue for iteration
└── index.ts           # Public API exports

src/tui/components/
├── QueuePanel.tsx     # Queue display component
└── QueueInput.tsx     # Queue input component

tests/
├── queue/
│   ├── parser.test.ts
│   ├── writer.test.ts
│   ├── processor.test.ts
│   └── integration.test.ts
├── tui/
│   └── QueuePanel.test.ts
└── e2e/
    └── queue-cli.test.ts
```

### Files to Modify

```
bin/relentless.ts           # Add queue command group
src/execution/runner.ts     # Add queue check in loop
src/tui/types.ts            # Add queue state types
src/tui/App.tsx             # Add QueuePanel component
src/tui/TUIRunner.tsx       # Add queue state management
CLAUDE.md                   # Add testing documentation
```

---

## Constitution Compliance

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. TDD | COMPLIANT | Tests written before implementation (Story 1 first) |
| 4. Queued Prompts | COMPLIANT | Direct implementation of constitutional requirement |
| 7. Zero-Lint | COMPLIANT | Will run lint on all new code |
| 8. TypeScript Strict | COMPLIANT | Zod schemas + strict types |
| 9. Minimal Dependencies | COMPLIANT | No new dependencies (uses Bun built-ins) |
| 10. Clean Architecture | COMPLIANT | Queue module is self-contained |
| 11. Performance | COMPLIANT | File operations <100ms |
| 12. Error Handling | COMPLIANT | Graceful degradation for all scenarios |

---

## Next Steps

1. Run `/relentless.tasks` to generate user stories and tasks
2. Run `/relentless.checklist` to generate quality checklist
3. Start implementation with Story 1 (Test Infrastructure)

---

*Plan generated: 2026-01-13*
*Constitution version: 2.0.0*
