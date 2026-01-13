# Quality Checklist: Queued Prompts System

**Purpose:** Validate completeness of the queued prompts implementation
**Created:** 2026-01-13
**Feature:** [spec.md](./spec.md)
**Branch:** `001-queued-prompts`

---

## Test Infrastructure & TDD

- [ ] CHK-001 [US-001] `bun test` command executes successfully
- [ ] CHK-002 [US-001] Test files with `*.test.ts` pattern are auto-discovered
- [ ] CHK-003 [US-001] `bun test --coverage` generates coverage report
- [ ] CHK-004 [US-001] CLAUDE.md documents TDD workflow (red-green-refactor)
- [ ] CHK-005 [US-001] CLAUDE.md documents test file naming conventions
- [ ] CHK-006 [US-001] Test helper utilities exist in `tests/helpers/`
- [ ] CHK-007 [Constitution] Tests written BEFORE implementation for all stories
- [ ] CHK-008 [Constitution] Code coverage >80% for queue module
- [ ] CHK-009 [Gap] Consider adding test fixtures directory for sample queue files

---

## Queue Data Types & Validation

- [ ] CHK-010 [US-002] Zod schema `QueueItemSchema` validates all required fields
- [ ] CHK-011 [US-002] Zod schema `QueueStateSchema` validates pending and processed arrays
- [ ] CHK-012 [US-002] Zod schema `QueueCommandType` includes PAUSE, SKIP, PRIORITY, ABORT
- [ ] CHK-013 [US-002] `parseQueueLine()` handles valid timestamp prefix format
- [ ] CHK-014 [US-002] `parseQueueLine()` returns null for malformed lines (graceful degradation)
- [ ] CHK-015 [US-002] `parseCommand()` is case-insensitive (`[PAUSE]` = `[pause]`)
- [ ] CHK-016 [US-002] `parseCommand()` extracts story ID from `[SKIP US-XXX]` format
- [ ] CHK-017 [US-002] `formatQueueLine()` creates valid timestamp prefix format
- [ ] CHK-018 [Edge Case] Unicode characters handled correctly in queue content
- [ ] CHK-019 [Edge Case] Very long messages (>10KB) handled with warning

---

## Queue File Operations

- [ ] CHK-020 [US-003] `addToQueue()` creates `.queue.txt` if it doesn't exist
- [ ] CHK-021 [US-003] `addToQueue()` appends items with ISO timestamp prefix
- [ ] CHK-022 [US-003] `addToQueue()` uses atomic writes (temp file + rename)
- [ ] CHK-023 [US-003] `removeFromQueue()` removes item by 1-based index
- [ ] CHK-024 [US-003] `removeFromQueue()` returns null for invalid index
- [ ] CHK-025 [US-003] `clearQueue()` removes all items from queue
- [ ] CHK-026 [US-004] `loadQueue()` reads both `.queue.txt` and `.queue.processed.txt`
- [ ] CHK-027 [US-004] `loadQueue()` returns empty arrays for missing files
- [ ] CHK-028 [US-004] `loadQueue()` skips malformed lines with warning
- [ ] CHK-029 [US-017] Concurrent writes don't corrupt queue file
- [ ] CHK-030 [US-017] Queue persists across orchestrator crashes/restarts

---

## CLI Commands

- [ ] CHK-031 [US-005] `relentless queue add "msg" --feature <name>` works
- [ ] CHK-032 [US-005] CLI add shows confirmation: "Added to queue: <message>"
- [ ] CHK-033 [US-005] CLI add shows error if feature not found
- [ ] CHK-034 [US-006] `relentless queue list --feature <name>` shows pending items
- [ ] CHK-035 [US-006] CLI list shows items with index, timestamp, and content
- [ ] CHK-036 [US-006] CLI list `--all` flag shows both pending and processed
- [ ] CHK-037 [US-006] CLI list shows "Queue is empty" for empty queue
- [ ] CHK-038 [US-013] `relentless queue remove <n> --feature <name>` removes item
- [ ] CHK-039 [US-013] CLI remove shows error for invalid index
- [ ] CHK-040 [US-013] `relentless queue clear --feature <name>` clears all items
- [ ] CHK-041 [Gap] Consider adding `--dry-run` flag to queue commands

---

## Queue Processing & Runner Integration

- [ ] CHK-042 [US-007] `processQueue()` returns prompts, commands, and warnings
- [ ] CHK-043 [US-007] `processQueue()` moves items to `.queue.processed.txt`
- [ ] CHK-044 [US-007] `processQueue()` separates text prompts from commands
- [ ] CHK-045 [US-007] Invalid commands treated as prompts with warning logged
- [ ] CHK-046 [US-008] Runner calls `processQueue()` at start of each iteration
- [ ] CHK-047 [US-008] Queue prompts injected into agent context via `buildPrompt()`
- [ ] CHK-048 [US-008] Queue acknowledgment appended to `progress.txt`
- [ ] CHK-049 [US-008] Empty queue handled silently (no error, minimal logging)
- [ ] CHK-050 [Constitution] Queue processing adds <100ms latency
- [ ] CHK-051 [Edge Case] Queue processed even when agent is rate-limited

---

## Structured Commands

- [ ] CHK-052 [US-009] `[PAUSE]` command pauses after current iteration
- [ ] CHK-053 [US-009] PAUSE displays "Paused by user. Press Enter to continue..."
- [ ] CHK-054 [US-009] PAUSE works in both standard and TUI mode
- [ ] CHK-055 [US-010] `[ABORT]` command stops orchestrator immediately
- [ ] CHK-056 [US-010] ABORT shows progress summary before exit
- [ ] CHK-057 [US-010] ABORT exits with code 0 (clean exit, not error)
- [ ] CHK-058 [US-011] `[SKIP US-XXX]` marks story as skipped
- [ ] CHK-059 [US-011] Skipped story not selected by `getNextStory()`
- [ ] CHK-060 [US-011] Invalid story ID in SKIP shows warning
- [ ] CHK-061 [US-012] `[PRIORITY US-XXX]` makes story next to work on
- [ ] CHK-062 [US-012] Completed stories cannot be prioritized (warning shown)
- [ ] CHK-063 [Edge Case] Multiple commands in queue processed in FIFO order

---

## TUI Integration

- [ ] CHK-064 [US-014] `QueuePanel.tsx` component renders without errors
- [ ] CHK-065 [US-014] Queue panel shows pending items with index and content
- [ ] CHK-066 [US-014] Queue panel shows "Queue empty" when no items
- [ ] CHK-067 [US-014] Queue panel updates in <500ms when queue changes
- [ ] CHK-068 [US-014] Queue panel fits within TUI layout
- [ ] CHK-069 [US-015] `QueueInput.tsx` component renders without errors
- [ ] CHK-070 [US-015] Pressing `q` activates input mode
- [ ] CHK-071 [US-015] Enter submits input and adds to queue
- [ ] CHK-072 [US-015] Escape cancels input and returns to normal mode
- [ ] CHK-073 [US-015] Input doesn't interfere with agent output display
- [ ] CHK-074 [US-016] Pressing `d` + number removes item from queue
- [ ] CHK-075 [US-016] Pressing `D` clears all items with confirmation
- [ ] CHK-076 [Gap] Consider showing keyboard shortcuts hint in TUI footer

---

## Error Handling & Edge Cases

- [ ] CHK-077 [Constitution] All errors surface with descriptive messages
- [ ] CHK-078 [Constitution] File permission errors handled gracefully
- [ ] CHK-079 [Edge Case] Missing feature directory shows helpful error
- [ ] CHK-080 [Edge Case] Empty queue file (0 bytes) handled gracefully
- [ ] CHK-081 [Edge Case] Queue file with only whitespace handled gracefully
- [ ] CHK-082 [Edge Case] Nested commands (`[PAUSE] then [ABORT]`) process correctly
- [ ] CHK-083 [Clarified] SKIP on in-progress story shows warning and is rejected (no state change)
- [ ] CHK-084 [Clarified] PRIORITY on current story shows info message and continues normally

---

## Code Quality & Constitution Compliance

- [ ] CHK-085 [Constitution] All code passes `bun run typecheck` with 0 errors
- [ ] CHK-086 [Constitution] All code passes `bun run lint` with 0 warnings
- [ ] CHK-087 [Constitution] No `any` types used - proper types or `unknown`
- [ ] CHK-088 [Constitution] Zod schemas used for runtime validation
- [ ] CHK-089 [Constitution] No new dependencies added (uses Bun built-ins)
- [ ] CHK-090 [Constitution] Functions are small and focused (<30 lines)
- [ ] CHK-091 [Constitution] Clear separation of concerns in queue module
- [ ] CHK-092 [Constitution] Self-documenting code with meaningful names

---

## Documentation

- [ ] CHK-093 [US-001] CLAUDE.md updated with test infrastructure section
- [ ] CHK-094 [Gap] README.md updated with queue command examples
- [ ] CHK-095 [Gap] JSDoc comments on all exported functions in queue module
- [ ] CHK-096 [Gap] Help text for all CLI queue commands
- [ ] CHK-097 [Gap] TUI keyboard shortcuts documented

---

## E2E & Integration Tests

- [ ] CHK-098 [US-018] E2E test: `queue add` creates file and adds item
- [ ] CHK-099 [US-018] E2E test: `queue list` shows items correctly
- [ ] CHK-100 [US-018] E2E test: `queue remove` removes correct item
- [ ] CHK-101 [US-018] E2E test: `queue clear` removes all items
- [ ] CHK-102 [US-018] E2E test: Queue items appear in agent prompt
- [ ] CHK-103 [US-018] E2E test: PAUSE command pauses execution
- [ ] CHK-104 [US-018] E2E test: ABORT command stops execution
- [ ] CHK-105 [US-018] Tests clean up temporary directories

---

## Summary

| Category | Items | Story Coverage |
|----------|-------|----------------|
| Test Infrastructure & TDD | 9 | US-001 + Constitution |
| Queue Data Types | 10 | US-002 + Edge Cases |
| Queue File Operations | 11 | US-003, US-004, US-017 |
| CLI Commands | 11 | US-005, US-006, US-013 |
| Queue Processing | 10 | US-007, US-008 |
| Structured Commands | 12 | US-009 to US-012 |
| TUI Integration | 13 | US-014 to US-016 |
| Error Handling | 8 | Edge Cases + Ambiguities |
| Code Quality | 8 | Constitution |
| Documentation | 5 | Gaps |
| E2E Tests | 8 | US-018 |
| **Total** | **105** | 18 stories |

---

## Identified Gaps & Ambiguities

### Gaps (Consider Adding)
- [ ] Test fixtures directory for sample queue files
- [ ] `--dry-run` flag for queue commands
- [ ] Keyboard shortcuts hint in TUI footer
- [ ] README.md queue command examples
- [ ] JSDoc comments on queue module exports

### Ambiguities (RESOLVED)
- [x] SKIP on in-progress story → Reject with warning, no state change
- [x] PRIORITY on current story → Show info message, continue normally

---

*Generated: 2026-01-13*
*Updated: 2026-01-13 (clarifications resolved)*
*Total Items: 105*
*Constitution Items: 16*
*Gaps Identified: 5*
*Ambiguities Resolved: 2*
