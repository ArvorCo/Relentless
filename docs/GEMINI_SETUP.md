# Gemini Setup for Relentless

## Current Status

🔄 **Gemini support is functional for orchestration but extensions are in development.**

**What works now:**
- ✅ Gemini agent adapter (`relentless run --agent gemini`)
- ✅ Orchestration with `relentless run`
- ✅ Rate limit detection and fallback
- ✅ All CLI commands work

**What's coming:**
- 🔄 Extensions for `/relentless.*` commands (Gemini-native format)
- 🔄 Automatic extension installation
- 🔄 Skills → Extensions conversion script

## Quick Start (Current)

Use Gemini with the manual workflow:

```bash
# 1. Install Relentless
bun install -g github:ArvorCo/Relentless
cd your-project
relentless init

# 2. Create files manually or prompt Gemini
gemini "Create relentless/constitution.md with governance rules for a TypeScript project"
gemini "Create relentless/features/001-user-auth/spec.md with specification for user authentication"
gemini "Create relentless/features/001-user-auth/plan.md with technical plan using React/PostgreSQL"
gemini "Create relentless/features/001-user-auth/tasks.md with user stories in this format:
### US-001: Title
**Description:** As a user, I want X so that Y.
**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Typecheck passes"

# 3. Convert and run orchestration with Gemini
relentless convert relentless/features/001-user-auth/tasks.md --feature 001-user-auth
relentless run --feature 001-user-auth --agent gemini --tui
```

## Using Skill Instructions

Gemini can read and follow the skill instructions:

```bash
gemini "Read .claude/skills/tasks/SKILL.md and create tasks.md in relentless/features/001-user-auth/ following that format exactly"
```

## Structure (When Extensions Are Ready)

Gemini extensions will be configured separately from Claude skills:

```
your-project/
├── relentless/
│   ├── constitution.md
│   └── features/
├── .claude/
│   └── skills/              # For Claude/Amp/OpenCode
└── .gemini/                 # Future: Gemini extensions
    └── extensions/
        ├── constitution/
        ├── specify/
        ├── plan/
        ├── tasks/
        └── checklist/
```

## Extension Format

Gemini extensions use a different format than Claude skills. Each extension needs:

### Example: constitution Extension

```json
{
  "name": "constitution",
  "description": "Create or update project constitution",
  "schema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["create", "update"],
        "description": "Whether to create new or update existing constitution"
      },
      "context": {
        "type": "string",
        "description": "Additional context about project requirements"
      }
    }
  },
  "instructions": "Load from SKILL.md content here..."
}
```

## Setup Instructions

### Option 1: Automatic Setup (Coming Soon)

```bash
relentless init --agent gemini
# This will create .gemini/extensions/ with all Relentless extensions
```

### Option 2: Manual Setup (Current)

1. **Copy Skills to Gemini Format:**
   ```bash
   # Convert skills to Gemini extensions format
   # (Script coming soon)
   ```

2. **Register Extensions:**
   Follow Gemini's extension registration process for your project.

3. **Use Extensions:**
   ```bash
   # In Gemini chat:
   @constitution create constitution for TypeScript project with strict testing
   @specify Add user authentication with OAuth2
   @plan using React and PostgreSQL
   @tasks break down into user stories
   @checklist generate quality validation
   ```

## Workflow Comparison

### Claude Code/Amp (Skills)
```bash
/relentless.constitution
/relentless.specify Add user auth
/relentless.plan
/relentless.tasks
/relentless.checklist
```

### Gemini (Extensions)
```bash
@constitution create for TypeScript project
@specify Add user auth
@plan using React/PostgreSQL
@tasks generate stories
@checklist create validation
```

## Hybrid Approach

While Gemini extension support is being developed, you can use the manual workflow:

1. **Create feature directory:**
   ```bash
   relentless features create user-auth
   ```

2. **Prompt Gemini to create files:**
   ```
   Create relentless/features/001-user-auth/spec.md with specification for:
   - User authentication
   - Email/password login
   - JWT tokens
   ```

3. **Convert and run:**
   ```bash
   relentless convert relentless/features/001-user-auth/tasks.md --feature 001-user-auth
   relentless run --feature 001-user-auth --agent gemini
   ```

## Orchestrator Configuration

Gemini is already configured in `relentless/config.json`:

```json
{
  "defaultAgent": "claude",
  "agents": {
    "gemini": {
      "dangerouslyAllowAll": true
    }
  },
  "fallback": {
    "enabled": true,
    "priority": ["claude", "codex", "amp", "opencode", "gemini"],
    "autoRecovery": true
  }
}
```

You can set Gemini as default if you prefer:

```json
{
  "defaultAgent": "gemini"
}
```

## When Extensions Are Ready

Once Gemini extensions are implemented, you'll be able to use:

```bash
# Install extensions (future)
relentless init --agent gemini
# or
gemini extensions install https://github.com/ArvorCo/Relentless

# Use extensions (future)
@constitution create for TypeScript project
@specify Add user authentication
@plan using React and PostgreSQL
@tasks generate user stories
@checklist create validation
```

## Best Practices for Gemini Users

1. **Reference skill files in prompts:**
   ```bash
   gemini "Read .claude/skills/tasks/SKILL.md and follow its instructions to create tasks.md"
   ```

2. **Be explicit about file locations:**
   ```bash
   gemini "Create relentless/features/001-user-auth/tasks.md with these exact user stories..."
   ```

3. **Use the orchestrator for implementation:**
   ```bash
   relentless run --agent gemini --feature 001-user-auth --tui
   ```

4. **Leverage Gemini's strengths:**
   - Good at reading and understanding structured instructions
   - Can parse and follow complex formats
   - Works well with file system operations

## Contributing

Help us add native Gemini extensions support:

1. **Research:** Check Gemini's extension format and requirements
2. **Convert:** Create script to convert `.claude/skills/` to `.gemini/extensions/`
3. **Test:** Validate extensions work with Gemini CLI
4. **Document:** Add usage examples and guides
5. **Submit:** Create PR with working implementation

## Resources

- [Gemini CLI Documentation](https://github.com/google-gemini/gemini-cli)
- [Relentless Skills Format](./.claude/skills/)
- [Agent Adapter](./src/agents/gemini.ts)
- [Manual Workflow Example](#quick-start-current)
