# Clarification Log: Queued Prompts System

**Feature:** 001-queued-prompts
**Date:** 2026-01-13
**Status:** All ambiguities resolved

---

## Resolved Ambiguities

### 1. SKIP Command on In-Progress Story

**Question:** What happens if `[SKIP US-XXX]` targets a story that is currently being worked on?

**Answer:** **Reject with warning**

**Behavior:**
- Show warning message: "Cannot skip US-XXX: story is currently in progress. Wait for iteration to complete."
- Command is ignored (no state change)
- Story continues execution normally
- User must wait for iteration to complete before skipping

**Rationale:** Prevents mid-iteration confusion and ensures clean state transitions.

**Files Updated:**
- `spec.md` - User Story 5 acceptance scenarios
- `tasks.md` - US-011 acceptance criteria
- `checklist.md` - CHK-083 marked as clarified

---

### 2. PRIORITY Command on Current Story

**Question:** What happens if `[PRIORITY US-XXX]` targets the story that is already in progress?

**Answer:** **Show info message and continue**

**Behavior:**
- Show info message: "Story US-XXX is already in progress"
- Execution continues normally
- No state change needed (story is already the priority)
- Command acknowledged but effectively no-op

**Rationale:** User-friendly acknowledgment without disrupting workflow.

**Files Updated:**
- `spec.md` - User Story 5 acceptance scenarios
- `tasks.md` - US-012 acceptance criteria
- `checklist.md` - CHK-084 marked as clarified

---

### 3. Queue Processing and Reprocessing

**Question:** How should multiple commands and text prompts be handled in the queue?

**Answer:** **Never reprocess, user controls removal**

**Behavior:**
- Processed items are moved to `.queue.processed.txt` and NEVER reprocessed
- Text prompts may remain visible in TUI after processing for reference
- User can manually remove items from queue via TUI (`d` key) or CLI
- Commands are processed in FIFO order
- Once processed, items are immutable in the processed file

**Rationale:** Prevents duplicate processing while giving user control over queue management.

**Files Updated:**
- Already documented in spec.md FR-003 and FR-011
- No additional changes needed (behavior was correctly specified)

---

## Summary

| Ambiguity | Resolution | Impact |
|-----------|------------|--------|
| SKIP on in-progress | Reject with warning | US-011 updated |
| PRIORITY on current | Info message, continue | US-012 updated |
| Reprocessing | Never, user removes | Already correct |

---

## Next Steps

1. Run `relentless convert tasks.md --feature 001-queued-prompts` to create prd.json
2. Run `relentless run --feature 001-queued-prompts --tui` to start implementation

---

*Clarifications resolved: 2026-01-13*
*Stakeholder: Leonardo Dias*
