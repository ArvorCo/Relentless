---
name: plan
description: "Generate technical implementation plan from feature specification. Use after creating spec. Triggers on: create plan, technical plan, implementation design."
---

# Technical Implementation Plan Generator

Create detailed technical plans that translate feature specifications into implementation designs.

---

## The Job

1. Read the feature specification (`spec.md`)
2. Read project constitution for technical constraints
3. Generate technical architecture and implementation plan
4. Save to `plan.md` in the feature directory

---

## Step 1: Locate Feature Files

Find the current feature directory:
- Look in `relentless/features/` for the most recent feature
- Or ask user which feature to plan
- Verify `spec.md` exists

---

## Step 2: Load Context

Read these files:
1. **relentless/constitution.md** - Project governance and technical standards
2. **relentless/features/NNN-feature/spec.md** - Feature requirements
3. Project README or docs for tech stack information

---

## Step 3: Generate Technical Plan

Using the template at `templates/plan-template.md`, create a plan with:

### Required Sections:

**1. Technical Overview**
- Architecture approach
- Key technologies to use (from constitution/existing stack)
- Integration points

**2. Data Models**
- Database schemas
- Entity relationships
- Field definitions with types
- Indexes and constraints

**3. API Contracts**
- Endpoints and methods
- Request/response formats
- Authentication requirements
- Error responses

**4. Implementation Strategy**
- Phase breakdown
- Dependencies between components
- Integration approach

**5. Testing Strategy**
- Unit test approach
- Integration test scenarios
- E2E test cases
- Test data requirements

**6. Security Considerations**
- Authentication/authorization
- Data validation
- Security best practices
- Compliance requirements

**7. Rollout Plan**
- Deployment strategy
- Migration requirements (if any)
- Monitoring and observability
- Rollback plan

---

## Step 4: Ensure Constitution Compliance

Validate the plan against constitution:
- **MUST** rules: Required, plan must follow these
- **SHOULD** rules: Best practices, document any deviations

If plan violates MUST rules, revise until compliant.

---

## Step 5: Save & Report

1. Save plan to `relentless/features/NNN-feature/plan.md`
2. Update progress.txt with plan creation timestamp
3. Report:
   - Plan location
   - Key technical decisions
   - Constitution compliance: PASS/FAIL
   - Next step: `/relentless.tasks`

---

## Example Sections

```markdown
# Technical Implementation Plan: User Authentication

## Technical Overview

**Architecture:** Three-tier (API, Service, Data)
**Stack:** Node.js, TypeScript, PostgreSQL
**Authentication:** JWT tokens with refresh mechanism

## Data Models

### User Table
\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
\`\`\`

## API Contracts

### POST /api/auth/register
**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

**Response (201):**
\`\`\`json
{
  "id": "uuid",
  "email": "user@example.com",
  "message": "Confirmation email sent"
}
\`\`\`

## Testing Strategy

**Unit Tests:**
- Password hashing utility
- Email validation
- Token generation/verification

**Integration Tests:**
- Full registration flow
- Email sending
- Database operations

**E2E Tests:**
- Complete user journey from signup to login
```

---

## Notes

- Plan bridges WHAT (spec) to HOW (implementation)
- Include specific technologies and patterns
- Must comply with constitution
- Detailed enough for task generation
