# Relentless Project Constitution

**Version:** 2.1.0
**Ratified:** 2026-01-13
**Last Amended:** 2026-01-20

---

## Preamble

Relentless is a universal AI agent orchestrator that empowers developers to run any AI coding agent autonomously until all tasks are complete. This constitution establishes the governing principles, patterns, and constraints that guide development and ensure Relentless remains performant, reliable, and cost-effective.

Our mission is to build one of the best AI orchestration tools in the world - simple, genius, and efficient.

---

## Core Identity

**Project:** Relentless
**Organization:** Arvor
**Purpose:** Universal AI Agent Orchestrator
**Languages:** TypeScript (strict mode)
**Runtime:** Bun (not Node.js)
**License:** MIT

---

## Part I: Foundational Principles

### Principle 1: SpecKit Workflow

**MUST:**
- All features MUST follow the 6-step workflow: specify → plan → tasks → convert → analyze → implement
- Each step MUST produce its corresponding artifact before proceeding
- Artifacts MUST be validated with `/relentless.analyze` before implementation begins
- Implementation MUST NOT start without: spec.md, plan.md, tasks.md, checklist.md, prd.json

**SHOULD:**
- Run analysis after any manual artifact edits
- Keep artifacts in sync throughout development
- Document deviations from plan in progress.txt
- Review checklist.md before completing each story

**Rationale:** The SpecKit workflow ensures thorough planning, prevents scope creep, and provides structured guidance for AI agents. Each artifact serves a specific purpose in the autonomous execution pipeline.

---

### Principle 2: Test-Driven Development (TDD)

**MUST:**
- All new features MUST have tests written BEFORE implementation begins
- Tests MUST define expected behavior with clear assertions
- Implementation MUST NOT proceed until failing tests exist
- All tests MUST pass before any story is marked complete
- E2E tests MUST exist for critical user workflows

**SHOULD:**
- Aim for >80% code coverage on new features
- Write tests that serve as living documentation
- Use property-based testing for complex logic
- Include edge case tests for all boundary conditions

**Rationale:** TDD prevents regressions in long autonomous runs where agents may introduce subtle bugs. Tests serve as contracts that agents must satisfy, providing fast feedback loops essential for AI-driven development. Reference: [Test-Driven Development with AI](https://www.builder.io/blog/test-driven-development-ai)

---

### Principle 3: Smart Model Routing

**MUST:**
- Planning phase MUST evaluate task complexity before assigning models
- Each specification MUST ask user whether smart routing is desired
- Routing decisions MUST be made at planning time, not runtime
- Model/harness performance history MUST be tracked for future planning
- Simple tasks MUST be routable to cheaper/free models when user opts in
- Complex tasks and final reviews MUST use SOTA models (Opus 4.5, GPT-5.2, etc.)

**SHOULD:**
- Maintain a knowledge base of model/harness capabilities and strengths
- Update routing heuristics based on observed task outcomes
- Consider task dependencies when routing parallel work
- Balance cost optimization with quality requirements

**Rationale:** Different models excel at different tasks. Strategic routing saves costs (up to 75% reduction) while maintaining quality. SOTA models handle complex reasoning; lighter models handle boilerplate. Reference: [MasRouter](https://aclanthology.org/2025.acl-long.757.pdf), [Dynamic LLM Routing](https://arxiv.org/abs/2502.16696)

---

### Principle 4: Parallel Execution with Git Worktrees

**MUST:**
- Parallel tasks MUST use git worktrees for clean isolation
- Each worktree MUST be on an independent branch
- Merge strategy MUST be defined before parallel execution begins
- Post-merge testing MUST validate combined implementations
- Worktrees MUST be cleaned up after successful merge
- Circular dependencies MUST be detected and prevented before parallelization

**SHOULD:**
- Limit parallel worktrees to prevent resource exhaustion
- Prefer parallel execution for independent tasks only
- Run integration tests after merging worktrees
- Log all worktree operations for debugging

**Rationale:** Git worktrees enable up to 50 agents working in parallel with clean isolation and easy merging. Cleanup prevents workspace pollution. Reference: [Parallelizing AI Coding Agents](https://ainativedev.io/news/how-to-parallelize-ai-coding-agents)

---

### Principle 5: Queued Prompts (Mid-Run Input)

**MUST:**
- Implement file-based queue (.queue.txt) for mid-run user input
- Agents MUST check queue between iterations
- Queued prompts MUST persist in memory for subsequent iterations
- Queue MUST be processed in FIFO order
- Acknowledge queued prompts in progress.txt

**SHOULD:**
- Support priority flags in queued messages
- Allow queue inspection without modifying it
- Clear processed items from queue after acknowledgment
- Support structured commands (pause, skip, abort) in queue

**Rationale:** Long autonomous runs need human intervention capability without interrupting the flow. File-based queues are simple, debuggable, and work across all agents. Reference: [Human-in-the-Loop Best Practices](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)

---

### Principle 6: Adaptive Final Review

**MUST:**
- Every feature MUST have a final review phase before completion
- Review MUST be performed by SOTA model (Opus 4.5, GPT-5.2, or equivalent)
- Review scope MUST adapt to feature size:
  - Small features: Full codebase review in single context
  - Large features: Multi-context review with summary aggregation
- Review MUST check for: bugs, code quality, unnecessary artifacts, duplicate code, slop removal
- Review findings MUST be documented and acted upon

**SHOULD:**
- Use automated pre-checks before SOTA review to optimize costs
- Flag high-risk areas for deeper analysis
- Generate review report with actionable items
- Track review quality metrics over time

**Rationale:** AI agents can produce "slop" - unnecessary code, duplications, or artifacts. A final expert review catches issues that accumulated over many iterations. Adaptive scoping ensures thoroughness without waste.

---

### Principle 7: Agent-Aware Best Practices

**MUST:**
- Maintain up-to-date knowledge of each agent's capabilities
- Document agent-specific best practices and limitations
- Respect agent rate limits with intelligent fallback
- Use agent-appropriate prompting styles
- Track agent performance for routing optimization

**SHOULD:**
- Auto-detect agent availability and health
- Implement graceful degradation between agent tiers
- Share learned patterns across agent runs via progress.txt
- Monitor harness/model ecosystem for new capabilities

**Rationale:** Each agent (Claude, Amp, OpenCode, Codex, Droid, Gemini) has unique strengths. Leveraging these differences maximizes effectiveness and minimizes costs. Reference: [AI Agent Orchestration Frameworks](https://blog.n8n.io/ai-agent-orchestration-frameworks/)

---

## Part II: Code Quality Standards

### Principle 8: Zero-Lint Policy

**MUST:**
- All code MUST pass lint with zero warnings (not just errors)
- All code MUST pass typecheck with zero errors
- No subterfuges or workarounds to suppress legitimate lint issues
- Fix lints properly as an expert developer (IQ 300 approach)
- Run lint and typecheck before every commit

**SHOULD:**
- Configure strictest reasonable lint rules
- Use automated formatting (Prettier, etc.)
- Address lint issues immediately, not as technical debt

**Rationale:** Clean code performs better and maintains clarity. Lint warnings often signal real issues that compound over time.

---

### Principle 9: TypeScript Strictness

**MUST:**
- Use TypeScript strict mode throughout
- Avoid `any` type - use `unknown` or proper types
- Export types alongside implementations
- Use Zod schemas for runtime validation
- Document complex type constraints

**SHOULD:**
- Prefer type inference where clear
- Use interfaces for public APIs
- Use types for unions/intersections
- Add explicit return types on exported functions

**Rationale:** Type safety prevents runtime errors and enables better tooling. Strict mode catches issues at compile time rather than production.

---

### Principle 10: Minimal Dependencies

**MUST NOT:**
- Add dependencies without clear justification
- Include deprecated packages
- Use packages with known security vulnerabilities

**MUST:**
- Prefer built-in solutions over external dependencies
- Audit dependencies regularly
- Pin versions for reproducibility

**SHOULD:**
- Consider bundle size impact
- Evaluate maintenance status of dependencies
- Prefer well-maintained, popular packages

**Rationale:** Every dependency is a potential security risk, maintenance burden, and performance cost. Minimalism keeps the codebase lean and secure.

---

## Part III: Architecture Principles

### Principle 11: Clean Architecture

**MUST:**
- Maintain clear separation of concerns
- Keep modules focused and single-purpose
- Use dependency injection for testability
- Follow existing code structure patterns

**SHOULD:**
- Prefer composition over inheritance
- Keep functions small and focused (<30 lines)
- Write self-documenting code
- Use meaningful names that reveal intent

**Rationale:** Clean architecture enables parallel development, easier testing, and maintainable codebases. AI agents work better with well-organized code.

---

### Principle 12: Performance First

**MUST:**
- Maintain fast startup time (<1s)
- Ensure responsive CLI commands
- Optimize file operations for large codebases
- Keep memory footprint minimal

**SHOULD:**
- Use lazy loading for heavy modules
- Cache repeated operations
- Profile performance regularly
- Parallelize where safe

**Rationale:** Performance directly impacts developer experience and agent efficiency. Slow tools waste time and money.

---

### Principle 13: Error Handling Excellence

**MUST:**
- Surface errors clearly - never hide failures
- Provide descriptive error messages with context
- Validate inputs at system boundaries
- Implement graceful degradation

**SHOULD:**
- Include recovery suggestions in errors
- Log errors with sufficient context for debugging
- Use circuit breaker patterns for external dependencies
- Consider error handling in design

**Rationale:** Autonomous agents need clear error signals to self-correct. Hidden errors cause cascading failures in long runs. Reference: [AI Agent Error Handling](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)

---

## Part IV: Version Control & Documentation

### Principle 14: Git Discipline

**MUST:**
- Write clear, descriptive commit messages
- Reference story IDs: `feat: [US-XXX] - Description`
- Keep commits focused and atomic
- Never commit broken code
- Never commit secrets

**SHOULD:**
- Maintain clean commit history
- Use meaningful branch names
- Squash WIP commits before merge
- Update docs with code changes

**Rationale:** Git history is memory for AI agents across iterations. Clean history enables better context and debugging.

---

### Principle 15: Documentation Standards

**MUST:**
- Document public APIs and interfaces
- Document complex algorithms
- Keep README up to date
- Document breaking changes

**SHOULD:**
- Write self-documenting code first
- Document "why" not just "what"
- Keep docs in sync with code
- Include troubleshooting guides

**Rationale:** Documentation helps both humans and AI agents understand the codebase. Good docs reduce errors and speed up development.

---

## Part V: Security & Compliance

### Principle 16: Security First

**MUST:**
- Never commit secrets to git
- Validate all external inputs
- Use safe file system operations
- Follow principle of least privilege
- Log sensitive operations

**SHOULD:**
- Regular dependency audits
- Rate limiting where appropriate
- Security-focused code review
- Keep security patches current

**Rationale:** Security vulnerabilities in orchestration tools can have wide-reaching impact. Proactive security prevents costly incidents.

---

## Part VI: Future Roadmap Principles

The following are strategic directions that guide future development:

### Cost & Metrics Dashboard
- Investigate harness-specific methods for cost/usage tracking
- Consider integration with existing tools like Claude Code's /status
- Build unified dashboard when implementation path is clear

### Enhanced Model Routing Intelligence
- Build and maintain model capability knowledge base
- Track task outcomes for routing optimization
- Develop routing heuristics from empirical data

### Extended Parallel Execution
- Support for containerized agent isolation (future option)
- Cross-worktree dependency management
- Distributed execution across machines

### Integration Ecosystem
- GitHub Actions integration
- CI/CD pipeline templates
- IDE extensions for orchestration control

---

## Governance

### Amendment Process

1. **Propose:** Create PR with proposed changes
2. **Discuss:** Gather feedback from team and community
3. **Update:** Increment version semantically:
   - **MAJOR:** Breaking changes to principles
   - **MINOR:** New principles added
   - **PATCH:** Clarifications, typo fixes
4. **Document:** Record rationale for changes
5. **Ratify:** Merge after approval

### Compliance

- Constitution checked before each feature implementation
- Violations block story completion
- Agents must reference constitution in progress.txt
- Regular review at project milestones

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.1.0 | 2026-01-20 | Added SpecKit Workflow principle, template version tracking, renumbered principles (now 16 total), improved artifact consistency requirements |
| 2.0.0 | 2026-01-13 | Major revision: Added smart routing, parallel execution, queued prompts, adaptive review, TDD requirements, agent-aware practices |
| 1.0.0 | Previous | Initial constitution |

---

## References

- [AI Agent Orchestration Frameworks](https://blog.n8n.io/ai-agent-orchestration-frameworks/)
- [MasRouter: Learning to Route LLMs](https://aclanthology.org/2025.acl-long.757.pdf)
- [Dynamic LLM Routing](https://arxiv.org/abs/2502.16696)
- [Difficulty-Aware Agent Orchestration](https://arxiv.org/html/2509.11079v1)
- [Parallelizing AI Coding Agents](https://ainativedev.io/news/how-to-parallelize-ai-coding-agents)
- [Test-Driven Development with AI](https://www.builder.io/blog/test-driven-development-ai)
- [TDD, AI agents and coding with Kent Beck](https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent)
- [Azure AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [LLM Cost Optimization Guide](https://futureagi.com/blogs/llm-cost-optimization-2025)

---

*This constitution is the foundation for all Relentless development. Reference it during specification, planning, and implementation.*
