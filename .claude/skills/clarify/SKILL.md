---
name: clarify
description: "Identify and resolve ambiguities in feature specifications. Use when spec has unclear requirements. Triggers on: clarify spec, resolve ambiguities, clarify requirements."
---

# Specification Clarification Tool

Systematically identify and resolve ambiguities in feature specifications.

---

## The Job

1. Read spec.md
2. Scan for 9 types of ambiguities
3. Present clarification questions to user
4. Update spec with answers
5. Save clarification log

---

## Step 1: Load Specification

Read `relentless/features/NNN-feature/spec.md`

---

## Step 2: Scan for Ambiguities

Check for these 9 types:

**1. Behavioral Ambiguities**
- What happens when [action]?
- How should system respond to [event]?
- Example: "What happens when user enters wrong password 5 times?"

**2. Data Ambiguities**
- What are required vs optional fields?
- What validation rules apply?
- Example: "What email format validation should we use?"

**3. UI/UX Ambiguities**
- Where should this be displayed?
- How should user interact?
- What visual style?
- Example: "Should password field show/hide toggle?"

**4. Integration Ambiguities**
- Which external API/service?
- What happens if service unavailable?
- Example: "Which email provider: SendGrid, Mailgun, or AWS SES?"

**5. Permission Ambiguities**
- Who can perform this action?
- What authorization rules?
- Example: "Can unconfirmed users log in or should we block them?"

**6. Performance Ambiguities**
- What are acceptable response times?
- Pagination requirements?
- Example: "How many login attempts allowed per minute?"

**7. Error Handling Ambiguities**
- What errors can occur?
- How should errors be displayed?
- Example: "What message for duplicate email: '409 Conflict' or custom message?"

**8. State Management Ambiguities**
- How is data persisted?
- What about caching?
- Example: "Should we remember failed login attempts across sessions?"

**9. Edge Case Ambiguities**
- What about empty data?
- Race conditions?
- Example: "What if two users register with same email simultaneously?"

---

## Step 3: Present Questions

For each ambiguity found (max 5 most critical):

```markdown
## Question N: [Topic]

**Context:** [Quote relevant spec section]

**What we need to know:** [Specific question]

**Options:**
A. [Option 1] - [Implications]
B. [Option 2] - [Implications]
C. [Option 3] - [Implications]
D. Custom - [Your answer]

**Your choice:** _
```

---

## Step 4: Update Specification

After receiving answers:
1. Update spec.md with clarifications
2. Remove `[NEEDS CLARIFICATION]` markers
3. Add concrete details based on answers

---

## Step 5: Save Clarification Log

Create `relentless/features/NNN-feature/clarification-log.md`:

```markdown
# Clarification Log: Feature Name

## Q1: [Topic] - RESOLVED
**Date:** 2026-01-11
**Question:** [Question]
**Answer:** [User's choice]
**Updated Sections:** [List spec sections updated]

## Q2: [Topic] - DEFERRED
**Date:** 2026-01-11
**Question:** [Question]
**Reason:** Can be decided during implementation
```

---

## Example

```markdown
## Question 1: Password Requirements

**Context:** Spec says "password must be secure" but doesn't define requirements.

**What we need to know:** What are the specific password requirements?

**Options:**
A. Basic (min 8 characters) - Simple, user-friendly
B. Moderate (min 8 chars + number + symbol) - Balanced security
C. Strict (min 12 chars + number + symbol + upper/lower) - High security
D. Custom - Define your own rules

**Your choice:** B

---

## Question 2: Failed Login Handling

**Context:** Spec doesn't mention what happens after failed login attempts.

**What we need to know:** How should we handle repeated failed logins?

**Options:**
A. No limit - Allow unlimited attempts
B. Rate limit - Max 5 attempts per minute per IP
C. Account lockout - Lock account after 5 failed attempts for 30 minutes
D. Custom - Define your own approach

**Your choice:** C
```

---

## Notes

- Prioritize by impact: security > scope > UX > technical
- Maximum 5 questions per session
- Some ambiguities can be deferred to implementation
- Update spec immediately after clarification
- Keep clarification log for future reference
