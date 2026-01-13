# User Stories: Queued Prompts System

**Feature Branch**: `001-queued-prompts`
**Project**: Relentless
**Created**: 2026-01-13

---

## Phase 0: Setup

### US-001: Test Infrastructure Setup

**Description:** As a developer on Relentless, I want a complete test infrastructure so that all new features can be developed using TDD with proper tooling.

**Acceptance Criteria:**
- [ ] `bun test` command runs successfully
- [ ] Test files with pattern `*.test.ts` are auto-discovered
- [ ] `bun test --coverage` shows coverage report
- [ ] Test helper utilities exist in `tests/helpers/`
- [ ] Sample test file `tests/queue/parser.test.ts` passes
- [ ] CLAUDE.md documents test infrastructure with examples
- [ ] CLAUDE.md documents TDD workflow (red-green-refactor)
- [ ] CLAUDE.md documents test file naming conventions
- [ ] Typecheck passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint`

**Dependencies:** None
**Phase:** Setup
**Priority:** 1
**Research:** No

---

## Phase 1: Foundation

### US-002: Queue Data Types and Parser

**Description:** As a developer, I want Zod schemas and parser functions for queue items so that queue data is validated and type-safe.

**Acceptance Criteria:**
- [ ] `src/queue/types.ts` contains Zod schemas (QueueItem, QueueState, QueueCommand)
- [ ] `src/queue/parser.ts` has `parseQueueLine()` function
- [ ] `src/queue/parser.ts` has `parseCommand()` function
- [ ] `src/queue/parser.ts` has `formatQueueLine()` function
- [ ] Parser handles timestamp prefix format: `2026-01-13T10:30:00.000Z | content`
- [ ] Parser detects command format: `[COMMAND]` and `[COMMAND arg]`
- [ ] Parser is case-insensitive for commands
- [ ] Parser returns null for malformed lines (graceful degradation)
- [ ] Unit tests written BEFORE implementation
- [ ] Tests cover: valid prompts, valid commands, malformed input, edge cases
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-001
**Phase:** Foundation
**Priority:** 2
**Research:** No

---

### US-003: Queue File Writer

**Description:** As a developer, I want functions to add, remove, and clear queue items so that the queue file can be safely modified.

**Acceptance Criteria:**
- [ ] `src/queue/writer.ts` has `addToQueue()` function
- [ ] `src/queue/writer.ts` has `removeFromQueue()` function
- [ ] `src/queue/writer.ts` has `clearQueue()` function
- [ ] `addToQueue()` appends item with timestamp to `.queue.txt`
- [ ] `addToQueue()` creates file if it doesn't exist
- [ ] `removeFromQueue()` removes item by index (1-based)
- [ ] `clearQueue()` removes all items
- [ ] Uses atomic writes (temp file + rename) to prevent corruption
- [ ] Handles concurrent writes safely
- [ ] Unit tests written BEFORE implementation
- [ ] Tests cover: add single, add multiple, remove, clear, file creation
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-002
**Phase:** Foundation
**Priority:** 3
**Research:** No

---

### US-004: Queue Loader

**Description:** As a developer, I want a function to load queue state from files so that the current queue status can be retrieved.

**Acceptance Criteria:**
- [ ] `src/queue/index.ts` has `loadQueue()` function
- [ ] `loadQueue()` reads `.queue.txt` for pending items
- [ ] `loadQueue()` reads `.queue.processed.txt` for processed items
- [ ] Returns `QueueState` with pending and processed arrays
- [ ] Handles missing files gracefully (returns empty arrays)
- [ ] Handles malformed content with warnings (skips bad lines)
- [ ] Records `lastChecked` timestamp
- [ ] Unit tests written BEFORE implementation
- [ ] Tests cover: empty queue, populated queue, missing files, malformed content
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-002
**Phase:** Foundation
**Priority:** 4
**Research:** No

---

## Phase 2: Core Stories

### US-005: CLI Queue Add Command

**Description:** As a developer running a feature, I want to add messages to the queue via CLI so that I can provide guidance to agents without interrupting the run.

**Acceptance Criteria:**
- [ ] `relentless queue add "message" --feature <name>` works
- [ ] Message is appended to `.queue.txt` with timestamp
- [ ] Validates feature directory exists
- [ ] Shows confirmation: "Added to queue: <message>"
- [ ] Shows error if feature not found: "Feature '<name>' not found"
- [ ] Supports adding commands: `relentless queue add "[PAUSE]" --feature <name>`
- [ ] Help text: `relentless queue add --help`
- [ ] Unit tests for queue add logic
- [ ] Integration test for CLI command
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-003
**Phase:** Stories
**Priority:** 5
**Research:** No

---

### US-006: CLI Queue List Command

**Description:** As a developer, I want to view the queue contents via CLI so that I can see pending and processed items.

**Acceptance Criteria:**
- [ ] `relentless queue list --feature <name>` shows pending items
- [ ] Items displayed with index, timestamp, and content
- [ ] Empty queue shows: "Queue is empty"
- [ ] `--all` flag shows both pending and processed items
- [ ] Processed items marked with "[processed]" or similar
- [ ] Shows feature name in output header
- [ ] Validates feature directory exists
- [ ] Help text: `relentless queue list --help`
- [ ] Unit tests for list formatting
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-004
**Phase:** Stories
**Priority:** 6
**Research:** No

---

### US-007: Queue Processor for Orchestration

**Description:** As the Relentless orchestrator, I want to process the queue between iterations so that user guidance is injected into agent context.

**Acceptance Criteria:**
- [ ] `src/queue/processor.ts` has `processQueue()` function
- [ ] `processQueue()` reads pending items from queue
- [ ] Returns `QueueProcessResult` with prompts, commands, warnings
- [ ] Moves processed items to `.queue.processed.txt` with processed timestamp
- [ ] Clears items from `.queue.txt` after processing
- [ ] Separates text prompts from structured commands
- [ ] Invalid commands treated as prompts with warning
- [ ] Unit tests written BEFORE implementation
- [ ] Tests cover: prompts only, commands only, mixed, empty queue
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-004
**Phase:** Stories
**Priority:** 7
**Research:** No

---

### US-008: Runner Integration - Queue Check

**Description:** As the Relentless orchestrator, I want to check the queue between iterations so that queue items are processed in the execution loop.

**Acceptance Criteria:**
- [ ] `src/execution/runner.ts` calls `processQueue()` at start of each iteration
- [ ] Queue prompts are injected into agent prompt via `buildPrompt()`
- [ ] Queue acknowledgment appended to `progress.txt`
- [ ] Queue check logged in output: "Processing N queue items..."
- [ ] Empty queue handled silently (no error, no excessive logging)
- [ ] Queue processing does not add significant latency (<100ms)
- [ ] Integration test for runner + queue
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-007
**Phase:** Stories
**Priority:** 8
**Research:** No

---

### US-009: Structured Command - PAUSE

**Description:** As a developer, I want to pause the orchestration via queue command so that I can review progress before continuing.

**Acceptance Criteria:**
- [ ] `[PAUSE]` command recognized by parser
- [ ] When processed, orchestrator pauses after current iteration
- [ ] Displays: "Paused by user. Press Enter to continue..."
- [ ] Waits for user input before continuing
- [ ] Works in both standard and TUI mode
- [ ] Pause logged in progress.txt
- [ ] Unit test for PAUSE command parsing
- [ ] Integration test for PAUSE execution
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-008
**Phase:** Stories
**Priority:** 9
**Research:** No

---

### US-010: Structured Command - ABORT

**Description:** As a developer, I want to abort the orchestration via queue command so that I can stop the run cleanly.

**Acceptance Criteria:**
- [ ] `[ABORT]` command recognized by parser
- [ ] When processed, orchestrator stops immediately
- [ ] Shows summary of progress before exit
- [ ] Exit code 0 (clean exit, not error)
- [ ] Abort logged in progress.txt
- [ ] Unit test for ABORT command parsing
- [ ] Integration test for ABORT execution
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-008
**Phase:** Stories
**Priority:** 10
**Research:** No

---

### US-011: Structured Command - SKIP

**Description:** As a developer, I want to skip a specific story via queue command so that I can bypass problematic stories.

**Acceptance Criteria:**
- [ ] `[SKIP US-XXX]` command recognized by parser
- [ ] Parser extracts story ID from command
- [ ] When processed (story NOT in progress), story marked as skipped in PRD
- [ ] When processed (story IS in progress), warning shown: "Cannot skip US-XXX: story is currently in progress. Wait for iteration to complete."
- [ ] SKIP command ignored if story is in progress (no state change)
- [ ] Skipped story not selected by `getNextStory()`
- [ ] Skip logged in progress.txt with reason
- [ ] Invalid story ID shows warning
- [ ] Unit test for SKIP command parsing
- [ ] Unit test for SKIP rejection when story in progress
- [ ] Integration test for SKIP execution
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-008
**Phase:** Stories
**Priority:** 11
**Research:** No

---

### US-012: Structured Command - PRIORITY

**Description:** As a developer, I want to prioritize a specific story via queue command so that I can change execution order.

**Acceptance Criteria:**
- [ ] `[PRIORITY US-XXX]` command recognized by parser
- [ ] Parser extracts story ID from command
- [ ] When processed (story NOT current), story becomes next to work on
- [ ] When processed (story IS current), info message shown: "Story US-XXX is already in progress" and execution continues normally
- [ ] Priority change logged in progress.txt
- [ ] Invalid story ID shows warning
- [ ] Completed stories cannot be prioritized (warning)
- [ ] Unit test for PRIORITY command parsing
- [ ] Unit test for PRIORITY on current story (info message)
- [ ] Integration test for PRIORITY execution
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-008
**Phase:** Stories
**Priority:** 12
**Research:** No

---

### US-013: CLI Queue Remove Command

**Description:** As a developer, I want to remove items from the queue via CLI so that I can correct mistakes before processing.

**Acceptance Criteria:**
- [ ] `relentless queue remove <index> --feature <name>` removes item
- [ ] Index is 1-based (matches list output)
- [ ] Shows confirmation: "Removed: <content>"
- [ ] Shows error for invalid index: "Invalid index: N. Queue has M items"
- [ ] `relentless queue clear --feature <name>` removes all items
- [ ] Clear shows confirmation: "Cleared N items from queue"
- [ ] Help text: `relentless queue remove --help`
- [ ] Unit tests for remove/clear logic
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-003
**Phase:** Stories
**Priority:** 13
**Research:** No

---

### US-014: TUI Queue Panel Display

**Description:** As a developer using TUI mode, I want to see queue contents in the interface so that I can monitor pending items without switching terminals.

**Acceptance Criteria:**
- [ ] `src/tui/components/QueuePanel.tsx` component created
- [ ] Queue panel shows pending items with index and content
- [ ] Empty queue shows "Queue empty" message
- [ ] Panel updates in real-time (<500ms) when queue changes
- [ ] Panel fits within TUI layout without breaking other components
- [ ] `queueItems` added to TUIState in `types.ts`
- [ ] Queue state loaded in TUIRunner.tsx
- [ ] File watcher or polling for queue file changes
- [ ] Component renders without errors
- [ ] Typecheck passes
- [ ] Lint passes

**Dependencies:** US-004
**Phase:** Stories
**Priority:** 14
**Research:** No

---

### US-015: TUI Queue Input

**Description:** As a developer using TUI mode, I want to add items to the queue from the interface so that I can provide guidance without leaving the TUI.

**Acceptance Criteria:**
- [ ] `src/tui/components/QueueInput.tsx` component created
- [ ] Pressing `q` key activates input mode
- [ ] Input field appears at bottom of screen
- [ ] Typing adds characters to input
- [ ] Enter submits input and adds to queue
- [ ] Escape cancels input and returns to normal mode
- [ ] Input doesn't interfere with agent output display
- [ ] `queueInputActive` and `queueInputValue` added to TUIState
- [ ] Keyboard handler added to TUI
- [ ] Component renders without errors
- [ ] Typecheck passes
- [ ] Lint passes

**Dependencies:** US-014
**Phase:** Stories
**Priority:** 15
**Research:** No

---

### US-016: TUI Queue Item Removal

**Description:** As a developer using TUI mode, I want to remove items from the queue in the interface so that I can correct mistakes without CLI.

**Acceptance Criteria:**
- [ ] Pressing `d` key followed by number removes that item
- [ ] Pressing `D` (shift+d) clears all items with confirmation
- [ ] Removal updates queue panel immediately
- [ ] Empty queue shows message: "Queue already empty"
- [ ] Confirmation prompt for clear all: "Clear all items? (y/n)"
- [ ] Keyboard handler for deletion added
- [ ] Component renders without errors
- [ ] Typecheck passes
- [ ] Lint passes

**Dependencies:** US-015
**Phase:** Stories
**Priority:** 16
**Research:** No

---

## Phase 3: Polish

### US-017: Queue Persistence and Recovery

**Description:** As a developer, I want queue items to persist across crashes and restarts so that my instructions aren't lost.

**Acceptance Criteria:**
- [ ] Queue file persists after orchestrator crash
- [ ] Restarting orchestrator processes pending queue items
- [ ] Partial processing (crash mid-queue) recovers correctly
- [ ] Processed items remain in `.queue.processed.txt`
- [ ] Malformed lines logged with warning and skipped
- [ ] No data loss in concurrent write scenarios
- [ ] Integration test: crash/restart simulation
- [ ] Integration test: concurrent writes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] All tests pass

**Dependencies:** US-008
**Phase:** Polish
**Priority:** 17
**Research:** No

---

### US-018: E2E Tests for Queue System

**Description:** As a developer, I want E2E tests for the queue system so that I can verify the full workflow works correctly.

**Acceptance Criteria:**
- [ ] `tests/e2e/queue-cli.test.ts` created
- [ ] E2E test: `queue add` creates file and adds item
- [ ] E2E test: `queue list` shows items correctly
- [ ] E2E test: `queue remove` removes correct item
- [ ] E2E test: `queue clear` removes all items
- [ ] E2E test: Queue items appear in agent prompt
- [ ] E2E test: Commands (PAUSE, ABORT) execute correctly
- [ ] Tests clean up after themselves (temp directories)
- [ ] All E2E tests pass
- [ ] Typecheck passes
- [ ] Lint passes

**Dependencies:** US-013, US-012
**Phase:** Polish
**Priority:** 18
**Research:** No

---

## Dependency Graph

```
US-001 (Test Infrastructure)
   │
   └──► US-002 (Types & Parser)
           │
           ├──► US-003 (Writer)
           │       │
           │       ├──► US-005 (CLI Add)
           │       └──► US-013 (CLI Remove)
           │
           └──► US-004 (Loader)
                   │
                   ├──► US-006 (CLI List)
                   │
                   ├──► US-007 (Processor)
                   │       │
                   │       └──► US-008 (Runner Integration)
                   │               │
                   │               ├──► US-009 (PAUSE)
                   │               ├──► US-010 (ABORT)
                   │               ├──► US-011 (SKIP)
                   │               ├──► US-012 (PRIORITY)
                   │               └──► US-017 (Persistence)
                   │
                   └──► US-014 (TUI Panel)
                           │
                           └──► US-015 (TUI Input)
                                   │
                                   └──► US-016 (TUI Removal)

US-012, US-013 ──► US-018 (E2E Tests)
```

---

## Parallel Opportunities

The following stories can be worked on in parallel (after dependencies met):

| Parallel Group | Stories | Notes |
|----------------|---------|-------|
| Group A | US-005, US-006, US-014 | After US-004 complete |
| Group B | US-009, US-010, US-011, US-012 | After US-008 complete |
| Group C | US-013, US-017 | After US-008 complete |

---

## Summary

| Metric | Value |
|--------|-------|
| Total Stories | 18 |
| Setup Phase | 1 |
| Foundation Phase | 3 |
| Stories Phase | 12 |
| Polish Phase | 2 |
| Parallel Groups | 3 |

---

## Next Steps

1. Run `/relentless.checklist` to generate quality checklist
2. Run `relentless convert tasks.md --feature 001-queued-prompts` to create prd.json
3. Run `relentless run --feature 001-queued-prompts --tui` to start implementation

---

*Generated: 2026-01-13*
*Spec version: Draft*
*Plan version: 2026-01-13*
