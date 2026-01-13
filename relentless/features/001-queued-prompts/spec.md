# Feature Specification: Queued Prompts System

**Feature Branch**: `001-queued-prompts`
**Created**: 2026-01-13
**Status**: Draft
**Input**: User description: "Implement queued prompts system for mid-run user input with TUI integration and test infrastructure"

---

## Overview

This feature implements a file-based queue system that enables human-in-the-loop intervention during autonomous Relentless runs. Users can add prompts, commands, and guidance that agents read and process between iterations without interrupting the flow.

**This is the first feature implementing strict TDD** - all code must have tests written before implementation. The feature also includes setting up the test infrastructure for the entire project.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Test Infrastructure Setup (Priority: P1)

As a developer on Relentless, I need a complete test infrastructure so that all new features (starting with this one) can be developed using TDD with proper tooling.

**Why this priority**: Foundation requirement - without this, we cannot do TDD for this or any future feature. Must be done first.

**Independent Test**: Can be tested by running `bun test` and seeing the test runner execute successfully with at least one passing test.

**Acceptance Scenarios**:

1. **Given** I run `bun test`, **When** tests exist, **Then** they execute and report results with pass/fail counts
2. **Given** CLAUDE.md exists, **When** I read it, **Then** it contains comprehensive documentation on how to write and run tests
3. **Given** a new test file `*.test.ts`, **When** I run `bun test`, **Then** it's automatically discovered and executed
4. **Given** tests are written, **When** I run `bun test --coverage`, **Then** I see coverage report for the tested files

---

### User Story 2 - Add Text Prompt to Queue via CLI (Priority: P1)

As a developer running a long autonomous feature implementation, I want to add guidance text to a queue file so that the agent receives my instructions in its next iteration without me having to stop and restart the run.

**Why this priority**: This is the core value proposition - enabling human intervention without interruption. Without this, all other features are meaningless.

**Independent Test**: Can be fully tested by running `relentless queue add "message" --feature name` and verifying the `.queue.txt` file contains the message. Delivers immediate value for human-in-the-loop workflows.

**Acceptance Scenarios**:

1. **Given** a feature directory exists at `relentless/features/001-my-feature/`, **When** I run `relentless queue add "Focus on error handling" --feature 001-my-feature`, **Then** the file `relentless/features/001-my-feature/.queue.txt` is created/appended with the message and a timestamp
2. **Given** `.queue.txt` already has content, **When** I add a new message, **Then** the new message is appended (not replaced) preserving FIFO order
3. **Given** no feature directory exists, **When** I run the command, **Then** I receive a clear error message indicating the feature doesn't exist

---

### User Story 3 - Agent Reads and Processes Queue (Priority: P1)

As the Relentless orchestration system, I need to check for queued prompts between iterations so that user guidance is injected into the agent's context for the next story.

**Why this priority**: Tied with US-2 - without processing, the queue is useless. This completes the core loop.

**Independent Test**: Can be tested by creating a `.queue.txt` file manually, running a single iteration, and verifying the queue content appears in the agent prompt and is acknowledged in `progress.txt`.

**Acceptance Scenarios**:

1. **Given** `.queue.txt` exists with content, **When** the orchestrator starts a new iteration, **Then** all queue items are read and included in the agent prompt context
2. **Given** queue items were processed, **When** the iteration completes, **Then** processed items are moved to `.queue.processed.txt` with timestamps
3. **Given** queue items were processed, **When** the iteration completes, **Then** an acknowledgment entry is appended to `progress.txt`
4. **Given** `.queue.txt` doesn't exist, **When** the orchestrator checks, **Then** execution continues normally without errors

---

### User Story 4 - View Queue Contents via CLI (Priority: P2)

As a developer, I want to see what's currently in the queue so that I can verify my messages were added and review pending instructions.

**Why this priority**: Essential for visibility but not critical for core functionality. Users need to verify queue state.

**Independent Test**: Can be tested by adding items to queue, running `relentless queue list --feature name`, and verifying output matches file contents.

**Acceptance Scenarios**:

1. **Given** `.queue.txt` has 3 items, **When** I run `relentless queue list --feature 001-my-feature`, **Then** I see all 3 items with their timestamps in FIFO order
2. **Given** `.queue.txt` is empty or doesn't exist, **When** I run the command, **Then** I see a message indicating the queue is empty
3. **Given** both `.queue.txt` and `.queue.processed.txt` exist, **When** I run `relentless queue list --feature name --all`, **Then** I see both pending and processed items clearly separated

---

### User Story 5 - Structured Commands (PAUSE, SKIP, PRIORITY, ABORT) (Priority: P2)

As a developer, I want to send structured commands to control the orchestration flow so that I can pause execution, skip problematic stories, reprioritize, or abort the run.

**Why this priority**: Important for control but builds on basic queue functionality. Commands extend the core prompt capability.

**Independent Test**: Can be tested by adding `[PAUSE]` to queue, running an iteration, and verifying the orchestrator pauses after completing current story.

**Acceptance Scenarios**:

1. **Given** queue contains `[PAUSE]`, **When** the orchestrator processes the queue, **Then** it completes the current story and pauses before the next iteration, displaying "Paused by user. Press Enter to continue..."
2. **Given** queue contains `[SKIP US-003]` and US-003 is NOT in progress, **When** processed, **Then** story US-003 is marked as skipped (not passes:true) and the orchestrator moves to the next story
3. **Given** queue contains `[SKIP US-003]` and US-003 IS currently in progress, **When** processed, **Then** a warning is shown: "Cannot skip US-003: story is currently in progress. Wait for iteration to complete." and the command is ignored
4. **Given** queue contains `[PRIORITY US-005]` and US-005 is NOT the current story, **When** processed, **Then** story US-005 becomes the next story to work on (after current completes)
5. **Given** queue contains `[PRIORITY US-005]` and US-005 IS the current story, **When** processed, **Then** an info message is shown: "Story US-005 is already in progress" and execution continues normally
6. **Given** queue contains `[ABORT]`, **When** processed, **Then** the orchestrator stops immediately with a clean exit and summary of progress
7. **Given** queue contains invalid command `[INVALID]`, **When** processed, **Then** it's treated as a text prompt (passed to agent) with a warning logged

---

### User Story 6 - TUI Queue Panel Display (Priority: P2)

As a developer using the TUI (`--tui` mode), I want to see the current queue contents in the interface so that I can monitor pending instructions without switching terminals.

**Why this priority**: Enhances UX significantly. Visibility is critical for understanding system state.

**Independent Test**: Can be tested by adding items to `.queue.txt`, running TUI mode, and verifying items appear in the queue panel.

**Acceptance Scenarios**:

1. **Given** TUI is running, **When** I look at the interface, **Then** I see a "Queue" panel showing current queue items (or "Queue empty" if none)
2. **Given** queue items exist, **When** an item is processed, **Then** the queue panel updates in real-time to reflect the change
3. **Given** TUI is running, **When** I add items via CLI in another terminal, **Then** the TUI queue panel updates to show new items

---

### User Story 7 - TUI Queue Input (Priority: P2)

As a developer using the TUI, I want to add items to the queue directly from the interface so that I don't have to switch to another terminal.

**Why this priority**: Power user feature that significantly improves workflow. Tied to queue display.

**Independent Test**: Can be tested by pressing the input key, typing a message, pressing Enter, and verifying it appears in both queue panel and `.queue.txt`.

**Acceptance Scenarios**:

1. **Given** TUI is running, **When** I press `q` key, **Then** an input field appears at the bottom where I can type a message
2. **Given** input field is focused, **When** I type a message and press Enter, **Then** the message is added to `.queue.txt` and appears in the queue panel
3. **Given** I'm typing in input, **When** I press Escape, **Then** input is cancelled and focus returns to main view
4. **Given** input is active, **When** agent output is streaming, **Then** the output continues to display while I type

---

### User Story 8 - TUI Queue Item Removal (Priority: P3)

As a developer using the TUI, I want to remove items from the queue directly in the interface so that I can correct mistakes without leaving the TUI.

**Why this priority**: Nice to have but less critical. Users can use CLI remove command if needed.

**Independent Test**: Can be tested by pressing `d` key, selecting an item, and verifying it's removed from both display and file.

**Acceptance Scenarios**:

1. **Given** queue panel shows items, **When** I press `d` followed by item number (e.g., `d1`), **Then** that item is removed from the queue
2. **Given** queue panel shows items, **When** I press `D` (shift+d), **Then** all items are cleared after confirmation
3. **Given** I try to delete from empty queue, **When** I press `d`, **Then** I see a message that queue is already empty

---

### User Story 9 - Remove Item from Queue via CLI (Priority: P3)

As a developer, I want to remove specific items from the queue via CLI so that I can correct mistakes or remove outdated instructions before the agent processes them.

**Why this priority**: Nice to have but less critical than adding/viewing. Users can manually edit file if needed.

**Independent Test**: Can be tested by adding items, running `relentless queue remove 2 --feature name`, and verifying item 2 is removed.

**Acceptance Scenarios**:

1. **Given** queue has 3 items, **When** I run `relentless queue remove 2 --feature 001-my-feature`, **Then** the second item is removed and remaining items stay in order
2. **Given** queue has 3 items, **When** I run `relentless queue clear --feature 001-my-feature`, **Then** all items are removed (file becomes empty or deleted)
3. **Given** I try to remove item 5 from a 3-item queue, **When** I run the command, **Then** I receive a clear error about invalid index

---

### User Story 10 - Queue Persistence Across Restarts (Priority: P3)

As a developer, I want queue items to persist if the orchestrator crashes or I restart it so that my instructions aren't lost.

**Why this priority**: Important for reliability but file-based approach provides this naturally. Needs explicit handling for edge cases.

**Independent Test**: Can be tested by adding items to queue, killing the process, restarting, and verifying queue is still intact and processed.

**Acceptance Scenarios**:

1. **Given** queue has items and orchestrator crashes, **When** I restart with same feature, **Then** pending queue items are still there and processed
2. **Given** queue was partially processed when crash occurred, **When** I restart, **Then** only unprocessed items remain in `.queue.txt` (processed ones are in `.queue.processed.txt`)
3. **Given** `.queue.txt` has corrupted/malformed content, **When** orchestrator reads it, **Then** it logs a warning, skips malformed lines, and continues with valid items

---

### Edge Cases

- **Empty queue file**: Should be handled gracefully (not an error)
- **Very long queue messages**: Should be handled (no arbitrary limits, but warn if >10KB)
- **Concurrent writes**: Two terminals adding to queue simultaneously should not corrupt data
- **Unicode/special characters**: Queue should handle international characters and emojis
- **File permissions**: Clear error if queue file cannot be read/written
- **Missing feature directory**: Clear error with suggestion to create feature first
- **Queue during non-TUI mode**: CLI queue commands should work regardless of TUI mode
- **Rate-limited iteration with queue**: Queue should be processed even when agent is rate-limited
- **Nested commands in queue**: `[PAUSE] then [ABORT]` should process PAUSE first

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST read `.queue.txt` from feature directory between each iteration
- **FR-002**: System MUST process queue items in FIFO order (oldest first)
- **FR-003**: System MUST move processed items to `.queue.processed.txt` with timestamps
- **FR-004**: System MUST acknowledge processed items in `progress.txt`
- **FR-005**: System MUST inject text prompts into agent context for next iteration
- **FR-006**: System MUST recognize and execute structured commands: `[PAUSE]`, `[SKIP story-id]`, `[PRIORITY story-id]`, `[ABORT]`
- **FR-007**: System MUST provide CLI commands: `relentless queue add`, `relentless queue list`, `relentless queue remove`, `relentless queue clear`
- **FR-008**: System MUST display queue panel in TUI mode showing pending items
- **FR-009**: System MUST allow adding items to queue from TUI via keyboard input (`q` key)
- **FR-010**: System MUST allow removing items from queue via TUI (`d` key)
- **FR-011**: System MUST persist queue across process restarts (file-based)
- **FR-012**: System MUST handle malformed queue content gracefully with warnings
- **FR-013**: Project MUST have test infrastructure using Bun's built-in test runner
- **FR-014**: All queue functionality MUST have unit tests written before implementation
- **FR-015**: CLAUDE.md MUST document test infrastructure and TDD workflow

### Key Entities

- **QueueItem**: Represents a single queue entry
  - `id`: Unique identifier (timestamp-based)
  - `content`: The message or command text
  - `type`: "prompt" | "command"
  - `command`: Parsed command type if applicable (PAUSE, SKIP, PRIORITY, ABORT)
  - `targetStoryId`: Story ID for SKIP/PRIORITY commands
  - `addedAt`: ISO timestamp when added
  - `processedAt`: ISO timestamp when processed (null if pending)

- **QueueState**: Overall queue status
  - `featurePath`: Path to feature directory
  - `pending`: Array of pending QueueItems
  - `processed`: Array of processed QueueItems
  - `lastChecked`: Timestamp of last queue check

- **QueueCommand**: Structured command parsed from queue
  - `type`: "PAUSE" | "SKIP" | "PRIORITY" | "ABORT"
  - `storyId`: Optional story ID for targeted commands

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add queue items and see them processed in <5 seconds after iteration start
- **SC-002**: Queue operations (add, list, remove) complete in <100ms
- **SC-003**: 100% of queue module code has unit tests written before implementation
- **SC-004**: All queue-related tests pass before any story is marked complete
- **SC-005**: TUI queue panel updates in real-time (<500ms) as items are added/processed
- **SC-006**: Zero data loss when queue files are accessed concurrently
- **SC-007**: Test infrastructure is documented in CLAUDE.md with examples
- **SC-008**: `bun test` runs all tests and reports coverage

---

## Technical Assumptions

The following assumptions guide the implementation:

1. **File Format**: Queue file uses simple line-based format with optional metadata prefix
   ```
   2026-01-13T10:30:00Z | Focus on error handling for the API
   2026-01-13T10:31:00Z | [PAUSE]
   2026-01-13T10:32:00Z | [SKIP US-003]
   ```

2. **File Locking**: Use atomic writes (write to temp file, rename) to prevent corruption

3. **TUI Framework**: Extend existing Ink/React TUI components (no new dependencies)

4. **Test Runner**: Use Bun's built-in test runner (`bun test`) - no jest/vitest needed

5. **Queue Location**: Always `relentless/features/<feature>/.queue.txt` (dot-prefixed to indicate system file)

6. **Command Parsing**: Commands are case-insensitive (`[PAUSE]` = `[pause]` = `[Pause]`)

7. **Processed File**: `.queue.processed.txt` maintains full audit trail for debugging

---

## Non-Functional Requirements

- **Performance**: Queue operations must not add noticeable latency to iterations (<100ms overhead)
- **Reliability**: Queue must survive crashes, restarts, and concurrent access
- **Usability**: CLI commands should be intuitive with helpful error messages
- **Maintainability**: Queue module should be self-contained with clear interfaces
- **Testability**: All components designed for easy unit testing with dependency injection

---

## Dependencies

- **Internal**: Depends on existing execution runner, TUI components, PRD parser
- **External**: No new dependencies required (uses Bun built-ins)
- **Blocking**: Test infrastructure (US-1) must be completed before other stories

---

## Out of Scope

- WebSocket-based queue (future enhancement)
- Remote queue access (future enhancement)
- Queue encryption for sensitive messages
- Queue size limits enforcement
- Multi-feature queue aggregation

---

## Constitution Compliance

This specification aligns with the following constitution principles:

- **Principle 1 (TDD)**: Tests written before implementation (mandatory for this feature)
- **Principle 4 (Queued Prompts)**: Direct implementation of this constitutional requirement
- **Principle 7 (Zero-Lint)**: All code will pass lint with zero warnings
- **Principle 8 (TypeScript Strictness)**: Strict types with Zod validation
- **Principle 10 (Clean Architecture)**: Queue module is self-contained with clear interfaces
- **Principle 12 (Error Handling)**: Graceful degradation for all error scenarios
