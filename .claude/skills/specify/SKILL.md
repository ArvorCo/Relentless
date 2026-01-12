---
name: specify
description: "Create feature specification from natural language description. Use when starting a new feature or creating a spec. Triggers on: create spec, specify feature, new feature spec."
---

# Feature Specification Generator

Create structured feature specifications from natural language descriptions.

---

## The Job

1. Receive feature description from user
2. Generate short name and feature number
3. Create branch and feature directory in `relentless/features/NNN-feature-name/`
4. Generate specification using template
5. Validate specification quality
6. Save to `spec.md`

---

## Step 1: Create Feature Structure

Run the create-new-feature script to set up the branch and directory:

```bash
.claude/skills/specify/scripts/bash/create-new-feature.sh --json "FEATURE_DESCRIPTION"
```

This will output JSON with:
- `BRANCH_NAME`: e.g., "003-user-auth"
- `SPEC_FILE`: Full path to spec.md
- `FEATURE_DIR`: Full path to feature directory
- `FEATURE_NUM`: e.g., "003"

**Important:** Parse this JSON and use these paths for all subsequent operations.

---

## Step 2: Load Constitution & Context

1. Read `relentless/constitution.md` for project governance
2. Note any MUST/SHOULD rules that apply to specifications
3. Keep these principles in mind while generating the spec

---

## Step 3: Generate Specification

Using the template at `templates/spec-template.md`, create a specification with:

### Required Sections:

**1. Feature Overview**
- One-paragraph summary
- User value proposition
- Problem being solved

**2. User Scenarios & Testing**
- Concrete user stories
- Step-by-step flows
- Expected outcomes

**3. Functional Requirements**
- What the system must do
- Testable requirements (no implementation details)
- Clear success criteria

**4. Success Criteria**
- Measurable, technology-agnostic outcomes
- Quantitative metrics (time, performance, volume)
- Qualitative measures (user satisfaction, task completion)

**5. Key Entities (if applicable)**
- Data models and relationships
- Fields and types (logical, not implementation)

**6. Dependencies & Assumptions**
- External systems required
- Prerequisites
- Assumptions made

**7. Out of Scope**
- What this feature explicitly does NOT include
- Future considerations

---

## Step 4: Handle Ambiguities

If aspects are unclear:
- Make informed guesses based on context
- Only mark `[NEEDS CLARIFICATION: specific question]` if:
  - Choice significantly impacts scope or UX
  - Multiple reasonable interpretations exist
  - No reasonable default exists
- **LIMIT: Maximum 3 clarifications**

If clarifications needed, present to user:

```markdown
## Clarification Needed

**Q1: [Topic]**
Context: [Quote spec section]
Question: [Specific question]

Options:
A. [Option 1] - [Implications]
B. [Option 2] - [Implications]
C. Custom - [Your answer]

Your choice: _
```

---

## Step 5: Validate Quality

Check the specification against:

- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] All requirements are testable
- [ ] Success criteria are measurable
- [ ] User scenarios cover primary flows
- [ ] Dependencies identified
- [ ] Scope clearly bounded
- [ ] No more than 3 `[NEEDS CLARIFICATION]` markers

If validation fails, revise and re-check (max 3 iterations).

---

## Step 6: Save & Report

1. Write complete specification to `SPEC_FILE` from JSON output
2. Create progress.txt if it doesn't exist:
   ```markdown
   ---
   feature: FEATURE_NAME
   started: DATE
   last_updated: DATE
   stories_completed: 0
   ---
   
   # Progress Log: FEATURE_NAME
   ```

3. Report to user:
   - Branch created: `BRANCH_NAME`
   - Spec saved: `SPEC_FILE`
   - Quality validation: PASSED/FAILED
   - Next step: `/relentless.plan` or `/relentless.clarify`

---

## Example Output

```markdown
# Feature: User Authentication

## Overview
Enable users to create accounts and log in securely using email/password.

## User Scenarios

### Scenario 1: New User Registration
1. User visits signup page
2. Enters email and password
3. Submits form
4. Receives confirmation email
5. Clicks confirmation link
6. Account is activated

**Expected Outcome:** User has active account and can log in.

## Functional Requirements

**REQ-1:** System must validate email format
**REQ-2:** System must require passwords ≥ 8 characters
**REQ-3:** System must send confirmation email within 1 minute
**REQ-4:** System must hash passwords before storage

## Success Criteria

1. 95% of signups complete within 60 seconds
2. Zero plaintext passwords in database
3. Email confirmation rate > 80%

## Key Entities

**User**
- email: string (unique)
- password_hash: string
- confirmed: boolean
- created_at: timestamp

## Dependencies

- Email service provider (e.g., SendGrid, Mailgun)
- Session management system

## Out of Scope

- Social login (OAuth)
- Two-factor authentication
- Password reset (separate feature)
```

---

## Notes

- Always run the script first to get proper paths
- Use absolute paths from JSON output
- Validate before marking complete
- Keep specification technology-agnostic
- Focus on WHAT, not HOW
