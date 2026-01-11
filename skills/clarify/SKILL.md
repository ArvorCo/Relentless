---
name: clarify
description: "Identify and clarify ambiguities in PRD specifications. Use for improving spec clarity. Triggers on: clarify prd, identify ambiguities, improve spec clarity, ask clarification questions."
---

# Interactive Clarification Skill

Systematically identify underspecified areas in PRD specifications and generate targeted clarification questions to improve specification quality.

---

## The Job

1. Read the PRD from `relentless/features/[feature-name]/prd.json` or `prd.md`
2. Scan for ambiguities across 9 categories
3. Generate max 5 highly targeted questions with multiple-choice options
4. Add `[NEEDS CLARIFICATION]` markers (max 3 per spec)
5. Save questions and answers to `relentless/features/[feature-name]/clarification-log.md`
6. Update PRD in-place with clarified information after each round

**Important:** This skill works with Claude Code, Amp, Gemini, and other AI coding agents.

---

## Step 1: Ambiguity Detection Categories

Scan the PRD for these 9 types of ambiguities:

### 1. Behavioral Ambiguities
Questions about **how** the system should behave:
- What happens when an operation fails?
- How should the system respond to edge cases?
- What is the expected behavior during loading/waiting?

**Examples:**
- "What shows during data loading?" → Loading spinner? Skeleton UI? Previous data?
- "What happens if save fails?" → Retry? Show error? Rollback changes?

### 2. Data Ambiguities
Questions about **what data** and its structure:
- What fields are required vs optional?
- What are valid values/ranges?
- How is data validated?

**Examples:**
- "Is email field required?" → Yes/No/Optional with default?
- "What's max length for username?" → 20 chars? 50? Unlimited?

### 3. UI/UX Ambiguities
Questions about **visual and interaction** design:
- Where does this element appear?
- What style/color/size should it be?
- How do users interact with it?

**Examples:**
- "Where does the delete button appear?" → On each card? In detail view? Context menu?
- "What color indicates priority?" → Red/yellow/green? Custom colors?

### 4. Integration Ambiguities
Questions about **external dependencies**:
- Which API/service is used?
- What happens if external service is down?
- What authentication is required?

**Examples:**
- "Which payment provider?" → Stripe? PayPal? Multiple?
- "Fallback when API unavailable?" → Show cached data? Error message?

### 5. Permission/Security Ambiguities
Questions about **access control**:
- Who can perform this action?
- What permissions are required?
- How is authorization checked?

**Examples:**
- "Can users delete others' comments?" → Own only? Admins? Authors?
- "Authentication required?" → Yes? Only for certain actions?

### 6. Performance/Scale Ambiguities
Questions about **limits and optimization**:
- How many items can be displayed?
- Is pagination needed?
- What are acceptable response times?

**Examples:**
- "Max items per page?" → 10? 25? 100? Infinite scroll?
- "How to handle 1000+ records?" → Pagination? Virtual scrolling? Search only?

### 7. Error Handling Ambiguities
Questions about **failure scenarios**:
- What errors can occur?
- How are errors displayed to users?
- Should operations retry automatically?

**Examples:**
- "Validation error display?" → Inline? Toast? Modal?
- "Retry on network error?" → Automatic? Manual? How many times?

### 8. State Management Ambiguities
Questions about **state persistence**:
- Is this state saved to database?
- Should it persist across sessions?
- Is it local to component or global?

**Examples:**
- "Save filter selection?" → In URL? LocalStorage? Database? Session only?
- "Remember user preferences?" → Per device? Per account? Temporary?

### 9. Edge Case Ambiguities
Questions about **boundary conditions**:
- What happens with empty data?
- What about very long input?
- How to handle race conditions?

**Examples:**
- "Behavior with no data?" → Empty state message? Placeholder? Hide section?
- "Concurrent edits handling?" → Last write wins? Merge? Lock?

---

## Step 2: Question Generation Strategy

### Prioritization Rules
Generate questions for ambiguities that:
1. **Block implementation** (cannot proceed without knowing)
2. **Affect user experience** (visible to users)
3. **Impact architecture** (structural decisions)
4. **Have security implications** (permissions, data access)

### Question Format
Each question must:
- Be **specific** (reference exact user story or requirement)
- Have **multiple-choice options** (A/B/C/D format)
- Include **context** (why this matters)
- Offer **"Other"** option for flexibility

### Template:
```markdown
## Question [N]: [Category] - [Specific Topic]

**Context:** [User Story ID] specifies "[quote from PRD]" but doesn't clarify [what's ambiguous].

**Question:** [Clear, specific question]?

**Options:**
A. [Option 1 - most common/recommended]
B. [Option 2 - alternative approach]
C. [Option 3 - minimal/simple version]
D. Other: [please specify]

**Impact:** [Why this decision matters - implementation, UX, security, etc.]

**Recommendation:** Option [X] - [brief justification]
```

---

## Step 3: Clarification Markers

Add `[NEEDS CLARIFICATION]` markers in PRD at ambiguous points (max 3 per spec).

### Marker Format:
```markdown
[NEEDS CLARIFICATION: {category}] {brief description of what needs clarification}
```

### Examples:
```markdown
- [ ] User can delete tasks [NEEDS CLARIFICATION: Permissions] - Own tasks only or any task?
- [ ] Show loading state [NEEDS CLARIFICATION: UI/UX] - Spinner, skeleton, or previous data?
- [ ] Filter persists [NEEDS CLARIFICATION: State] - In URL, localStorage, or database?
```

### Placement Rules:
- Place markers **inline** in acceptance criteria or functional requirements
- Limit to **3 markers maximum** per PRD to avoid clutter
- Remove marker after clarification is obtained and PRD is updated

---

## Step 4: Interactive Workflow

### Round 1: Initial Analysis
1. Scan PRD for all 9 ambiguity categories
2. Identify top 5 most critical ambiguities
3. Generate questions with multiple-choice options
4. Add up to 3 `[NEEDS CLARIFICATION]` markers
5. Save to `clarification-log.md`

### Round 2+: Update PRD
1. Collect answers from user
2. Update PRD in-place with clarified information
3. Remove resolved `[NEEDS CLARIFICATION]` markers
4. Append answers to `clarification-log.md`
5. If more ambiguities remain, generate next round of questions

### Stopping Condition
- All critical ambiguities resolved
- User indicates spec is clear enough
- 3 rounds of clarification completed (max)

---

## Step 5: Clarification Log Format

Create `clarification-log.md` with this structure:

```markdown
# Clarification Log: [Feature Name]

Generated: [Date]
Status: [In Progress / Complete]

This log tracks clarification questions and answers for the [Feature Name] specification.

---

## Round 1: [Date/Time]

### Question 1: [Category] - [Topic]

**Context:** [User Story ID] specifies "[quote]" but doesn't clarify [ambiguity].

**Question:** [Question text]?

**Options:**
A. [Option 1]
B. [Option 2]
C. [Option 3]
D. Other: [please specify]

**Impact:** [Why this matters]

**Recommendation:** Option A - [justification]

**Answer:** [User's answer - filled in after response]

**Action Taken:** [How PRD was updated based on answer]

---

### Question 2: [Category] - [Topic]
[Same format as Question 1]

---

## Round 2: [Date/Time]
[If needed - same format as Round 1]

---

## Summary

**Total Questions Asked:** [N]
**Ambiguities Resolved:** [N]
**Remaining Ambiguities:** [N]
**PRD Updates:** [List of sections updated]

**Status:** ✅ Specification is clear and ready for implementation
```

---

## Step 6: PRD Update Strategy

After receiving answers, update PRD sections:

### Update Acceptance Criteria:
**Before:**
```markdown
- [ ] Show loading state during data fetch [NEEDS CLARIFICATION: UI/UX]
```

**After (based on answer "A. Spinner"):**
```markdown
- [ ] Show spinner with "Loading..." text during data fetch
```

### Update Functional Requirements:
**Before:**
```markdown
FR-3: Users can delete tasks [NEEDS CLARIFICATION: Permissions]
```

**After (based on answer "A. Own tasks only"):**
```markdown
FR-3: Users can delete their own tasks only (not tasks created by others)
```

### Add New Sections if Needed:
If clarification reveals new requirements, add:
- New acceptance criteria
- New functional requirements
- Technical considerations
- Edge case handling

---

## Example: Task Priority Feature

### Initial PRD (Ambiguous):
```markdown
### US-003: Add priority selector to task edit
**Description:** As a user, I want to change a task's priority when editing it.

**Acceptance Criteria:**
- [ ] Priority dropdown in task edit modal
- [ ] Shows current priority as selected
- [ ] Saves immediately on selection change [NEEDS CLARIFICATION: State]
```

### Clarification Question:
```markdown
## Question 1: State Management - Priority Change Persistence

**Context:** US-003 specifies "Saves immediately on selection change" but doesn't clarify the save mechanism or error handling.

**Question:** How should priority changes be saved and what happens if save fails?

**Options:**
A. Auto-save to database immediately, show error toast if fails, revert to previous value
B. Auto-save to database, optimistic UI update, retry silently on failure
C. Save only when user clicks "Save" button in modal
D. Other: [please specify]

**Impact:** Affects user experience, error handling implementation, and state management approach.

**Recommendation:** Option A - Clear feedback to user, explicit error handling, no data loss.

**Answer:** A

**Action Taken:** Updated US-003 acceptance criteria to specify auto-save behavior and error handling.
```

### Updated PRD (Clarified):
```markdown
### US-003: Add priority selector to task edit
**Description:** As a user, I want to change a task's priority when editing it.

**Acceptance Criteria:**
- [ ] Priority dropdown in task edit modal
- [ ] Shows current priority as selected
- [ ] Priority saves to database immediately on selection change
- [ ] Show success toast: "Priority updated to [High/Medium/Low]"
- [ ] On save failure: show error toast and revert dropdown to previous value
- [ ] Disable dropdown during save operation
```

---

## Quality Requirements

### For Each Question:
- [ ] References specific user story or requirement
- [ ] Has 3-4 multiple-choice options
- [ ] Includes context explaining why it matters
- [ ] Provides a recommendation with justification
- [ ] Falls into one of the 9 ambiguity categories

### For Clarification Markers:
- [ ] Max 3 markers per PRD
- [ ] Each marker specifies category
- [ ] Placed inline at point of ambiguity
- [ ] Removed after clarification

### For PRD Updates:
- [ ] All answered questions result in PRD updates
- [ ] Updates are specific and unambiguous
- [ ] Markers removed for resolved items
- [ ] New acceptance criteria added where needed

---

## Multi-Agent Support

This skill is designed to work with:
- **Claude Code**: Use AskUserQuestion tool for interactive clarification
- **Amp**: Generate questions, collect answers via chat, update PRD
- **Gemini**: Analyze PRD, identify ambiguities, present questions
- **Codex**: Programmatic ambiguity detection and question generation
- **Droid**: Interactive clarification workflow with user prompts

The skill does NOT require agent-specific features - it only needs:
- File reading capability
- PRD analysis (text understanding)
- Markdown file writing
- (Optional) Interactive user input for question/answer flow

---

## Checklist Before Completion

- [ ] Scanned PRD across all 9 ambiguity categories
- [ ] Generated max 5 targeted questions
- [ ] Questions have multiple-choice format with recommendations
- [ ] Added up to 3 `[NEEDS CLARIFICATION]` markers
- [ ] Created `clarification-log.md` with proper structure
- [ ] (After answers) Updated PRD in-place with clarifications
- [ ] (After answers) Removed resolved markers from PRD
- [ ] (After answers) Appended answers to clarification log
- [ ] Clarification log saved to `relentless/features/[feature-name]/clarification-log.md`

---

## Implementation Tips

### Ambiguity Detection Heuristics
Look for these phrases that often indicate ambiguities:
- "appropriately", "properly", "correctly" → How specifically?
- "should work", "must handle" → What exact behavior?
- "user-friendly", "intuitive" → What specific UX?
- "if needed", "as appropriate" → When exactly?
- "error handling" without specifics → What errors? How handle?

### Question Prioritization
Ask about:
1. **High impact** (affects many stories or core functionality)
2. **Blocking** (cannot implement without knowing)
3. **User-facing** (visible to end users)
4. **Security-critical** (permissions, data access)
5. **Architectural** (affects system design)

Skip asking about:
- Standard best practices (linting, typechecking - assume these)
- Obvious defaults (empty states show message, errors show toast)
- Implementation details (how to code it - developer decides)

---

## Example Ambiguity Categories in Real PRDs

### Behavioral Ambiguity Example:
```markdown
US-004: Filter tasks by priority
- [ ] Filter dropdown with options: All | High | Medium | Low
```
**Ambiguity:** What happens when filter is changed? Immediate update? Apply button?
**Question:** Does filter apply immediately on selection or require "Apply" button click?

### Data Ambiguity Example:
```markdown
FR-1: Add priority field to tasks table
```
**Ambiguity:** Can priority be null? Default value?
**Question:** Should priority be required (NOT NULL) or optional? If required, what default?

### UI/UX Ambiguity Example:
```markdown
US-002: Display priority indicator
```
**Ambiguity:** Where exactly does indicator appear? What does it look like?
**Question:** Where should priority indicator appear on task card? (Top-left, top-right, inline with title?)

### Permission Ambiguity Example:
```markdown
US-003: Users can change task priority
```
**Ambiguity:** Any task or only own tasks? Admin privileges?
**Question:** Can users change priority on any task or only tasks they created?

---

## Advanced: Multi-Round Clarification

If PRD is highly ambiguous, run multiple rounds:

### Round 1: Foundational Questions
Focus on core behavior, data model, and high-level UX.

### Round 2: Integration & Edge Cases
After foundational clarity, ask about integrations, error handling, edge cases.

### Round 3: Polish & Performance
Final round for optimization, accessibility, performance considerations.

**Max 3 rounds** - after that, proceed with best judgment and document assumptions.
