---
name: checklist
description: "Generate custom quality checklists based on PRD requirements. Use for ensuring comprehensive validation. Triggers on: create checklist, generate quality checklist, validation checklist for."
---

# Quality Checklist Generator

Generate comprehensive, domain-specific quality checklists that ensure thorough validation of your feature implementation.

---

## The Job

1. Read the PRD from `relentless/features/[feature-name]/prd.json` or `prd.md`
2. Analyze user stories and acceptance criteria to infer the appropriate domain
3. Generate a detailed quality checklist with 20-40 items across 5-7 categories
4. Ensure 80% of items reference specific spec sections or have markers for gaps/ambiguities
5. Save to `relentless/features/[feature-name]/checklist.md`

**Important:** This skill works with Claude Code, Amp, Gemini, and other AI coding agents.

---

## Step 1: Domain Inference

Analyze the PRD to determine the primary domain(s):

- **Database/Backend**: Schema, migrations, API endpoints, server actions
- **Frontend/UI**: Components, forms, navigation, responsive design
- **Authentication/Security**: Auth flows, permissions, security policies
- **Data Processing**: ETL, validation, transformations, aggregations
- **Integration**: Third-party APIs, webhooks, external services
- **Performance**: Caching, optimization, load handling
- **Testing**: Unit tests, integration tests, E2E tests

Most features span multiple domains. Identify the **primary** and **secondary** domains.

---

## Step 2: Checklist Structure

Generate a checklist with the following structure:

### Header
```markdown
# Quality Checklist: [Feature Name]

Generated: [Date]
Domain: [Primary Domain] + [Secondary Domains]

This checklist ensures comprehensive validation of the [Feature Name] implementation.
Reference the PRD for detailed requirements.

---
```

### Categories (5-7 categories, tailored to domain)

#### For Database/Backend Features:
- Schema & Migrations
- Data Integrity
- API Design
- Error Handling
- Security

#### For Frontend/UI Features:
- Component Structure
- User Experience
- Accessibility
- Responsive Design
- Error States

#### For Full-Stack Features (most common):
- Schema & Database
- Backend Logic
- Frontend Components
- Integration & Flow
- Testing & Validation
- Security & Permissions
- Performance & UX

### Item Format

Each item should be:
- **Specific**: Reference exact PRD sections when possible
- **Verifiable**: Can be checked objectively
- **Actionable**: Clear what to verify

```markdown
## Category Name

- [ ] **[US-XXX]** Specific requirement from user story
- [ ] **[FR-X]** Functional requirement validation
- [ ] **[Gap]** Potential gap identified (e.g., error handling not specified)
- [ ] **[Ambiguity]** Unclear area needing clarification
- [ ] General best practice for this domain
```

---

## Step 3: Quality Requirements

Ensure **80% of items** fall into one of these categories:

### Referenced Items (60%+)
Directly reference PRD sections:
- `[US-001]` - User story reference
- `[FR-3]` - Functional requirement reference
- `[AC-2]` - Acceptance criteria reference
- `[Goal-1]` - Goal reference

### Gap/Ambiguity Markers (20%+)
Identify potential issues:
- `[Gap]` - Missing specification (e.g., "Error handling for network failures not specified")
- `[Ambiguity]` - Unclear requirement (e.g., "Loading state duration unspecified")
- `[Edge Case]` - Potential edge case not covered
- `[Security]` - Security consideration not mentioned

### General Best Practices (20%)
Domain-standard practices:
- "Code follows project linting rules"
- "Components have proper TypeScript types"
- "Database indexes on foreign keys"

---

## Step 4: Category Selection Guide

### Database/Backend Checklist Categories:
1. **Schema & Migrations**
   - Table structure matches requirements
   - Migrations are reversible
   - Indexes on foreign keys and query fields
   - Data types appropriate for use case

2. **Data Integrity**
   - Foreign key constraints
   - Required fields enforced
   - Validation rules implemented
   - Default values appropriate

3. **API Design**
   - Endpoints follow REST conventions
   - Request/response types defined
   - Error responses standardized
   - API versioning considered

4. **Error Handling**
   - Database errors caught and logged
   - User-friendly error messages
   - Rollback on failure
   - Validation errors reported clearly

5. **Security**
   - SQL injection prevention
   - Authentication checks
   - Authorization/permissions
   - Sensitive data protection

### Frontend/UI Checklist Categories:
1. **Component Structure**
   - Components follow project patterns
   - Props typed correctly
   - State management appropriate
   - Reusable components identified

2. **User Experience**
   - Loading states implemented
   - Success/error feedback clear
   - Navigation intuitive
   - Actions have confirmation when needed

3. **Accessibility**
   - Semantic HTML used
   - ARIA labels on interactive elements
   - Keyboard navigation works
   - Color contrast meets WCAG standards

4. **Responsive Design**
   - Works on mobile screens
   - Touch targets appropriately sized
   - Layout adapts to screen width
   - Images scale properly

5. **Error States**
   - Network error handling
   - Empty states defined
   - Invalid input feedback
   - Graceful degradation

### Full-Stack Checklist Categories:
1. **Schema & Database** (see Database categories)
2. **Backend Logic** (API Design + Error Handling)
3. **Frontend Components** (Component Structure + UX)
4. **Integration & Flow** (end-to-end user flows)
5. **Testing & Validation** (tests, linting, typechecking)
6. **Security & Permissions** (auth, authorization, data protection)
7. **Performance & UX** (loading, caching, responsiveness)

---

## Example Checklist: Task Status Feature

```markdown
# Quality Checklist: Task Status Feature

Generated: 2026-01-11
Domain: Full-Stack (Database + UI)

This checklist ensures comprehensive validation of the Task Status Feature implementation.
Reference the PRD for detailed requirements.

---

## Schema & Database

- [ ] **[US-001]** `status` column added to tasks table
- [ ] **[US-001]** Status type is enum: 'pending' | 'in_progress' | 'done'
- [ ] **[US-001]** Default value is 'pending'
- [ ] **[US-001]** Migration runs successfully without errors
- [ ] **[Gap]** Index on status column for filtering performance
- [ ] Migration is reversible (has down migration)

## Backend Logic

- [ ] **[US-003]** Status update endpoint accepts valid status values
- [ ] **[US-003]** Invalid status values rejected with clear error
- [ ] **[Gap]** Concurrent status updates handled correctly
- [ ] Status changes logged for audit trail (if applicable)
- [ ] Server action returns updated task object

## Frontend Components

- [ ] **[US-002]** Status badge component created
- [ ] **[US-002]** Badge colors: gray=pending, blue=in_progress, green=done
- [ ] **[US-002]** Badge visible on all task cards
- [ ] **[US-003]** Status dropdown/toggle added to task rows
- [ ] **[US-003]** Current status shows as selected in dropdown
- [ ] **[Ambiguity]** Loading state during status update
- [ ] TypeScript types for status enum defined
- [ ] Components follow project structure patterns

## Integration & Flow

- [ ] **[US-003]** Changing status saves immediately
- [ ] **[US-003]** UI updates without full page refresh
- [ ] **[US-004]** Filter dropdown has options: All, Pending, In Progress, Done
- [ ] **[US-004]** Filter persists in URL parameters
- [ ] **[US-004]** Empty state shown when no tasks match filter
- [ ] **[Gap]** Filter state cleared when navigating away
- [ ] Page loads with correct filter from URL params

## Testing & Validation

- [ ] Migration tested on clean database
- [ ] All TypeScript type checks pass (bun run typecheck)
- [ ] All linting rules pass (bun run lint)
- [ ] **[Edge Case]** Filtering with no tasks in database
- [ ] **[Edge Case]** Status update fails (network error)
- [ ] Manual browser verification completed

## Security & Permissions

- [ ] Status updates require authentication
- [ ] Users can only update their own tasks (if multi-user)
- [ ] **[Gap]** Permission checks for status changes
- [ ] SQL injection prevented (using parameterized queries)

## Performance & UX

- [ ] **[Gap]** Status filter query performance acceptable
- [ ] Status badge renders without layout shift
- [ ] Dropdown opens/closes smoothly
- [ ] Filter change feels instant (< 100ms perceived)
- [ ] **[Ambiguity]** Optimistic UI updates vs server confirmation
- [ ] Status colors accessible (sufficient contrast)

---

## Summary

Total Items: 42
- Referenced: 17 (40%)
- Gaps/Ambiguities: 11 (26%)
- Best Practices: 14 (33%)

**Coverage:** 66% of items reference specific PRD sections or identify gaps/ambiguities.
```

---

## Implementation Notes

### For User Stories with Dependencies
If the PRD has dependencies (US-002 depends on US-001), structure checklist to reflect implementation order:
- Early categories cover foundational stories (schema, backend)
- Later categories cover dependent stories (UI, integration)

### For Multi-Domain Features
If feature spans multiple domains (e.g., database + UI + external API):
- Create categories for each domain
- Add "Integration & Flow" category for cross-domain interactions
- Ensure end-to-end user flows are validated

### Gap and Ambiguity Identification
Common gaps to look for:
- **Error handling**: What happens when operations fail?
- **Loading states**: How long do operations take? What shows during loading?
- **Edge cases**: Empty data, maximum limits, invalid input
- **Security**: Authentication, authorization, data validation
- **Performance**: Query optimization, caching, pagination
- **Accessibility**: Screen readers, keyboard navigation

---

## Step 5: Save the Checklist

1. Determine feature name from PRD path or filename
2. Save to: `relentless/features/[feature-name]/checklist.md`
3. Use markdown format exactly as shown in examples
4. Include summary at bottom with item counts and coverage percentage

---

## Checklist Before Saving

- [ ] Analyzed PRD and identified primary/secondary domains
- [ ] Generated 20-40 checklist items
- [ ] Organized into 5-7 relevant categories
- [ ] At least 80% of items reference PRD sections or mark gaps/ambiguities
- [ ] Items are specific and verifiable
- [ ] Summary section shows item counts and coverage
- [ ] Saved to `relentless/features/[feature-name]/checklist.md`

---

## Multi-Agent Support

This skill is designed to work with:
- **Claude Code**: Full support, use AskUserQuestion if domain unclear
- **Amp**: Full support, infer domain from PRD automatically
- **Gemini**: Full support, analyze PRD structure and content
- **Codex**: Full support, generate checklist programmatically
- **Droid**: Full support, interactive domain selection if needed

The skill does NOT require agent-specific features - it only needs:
- File reading capability
- PRD analysis (text understanding)
- Markdown file writing
