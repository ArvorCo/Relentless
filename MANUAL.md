# Manual

## Introduction

Relentless is a universal AI agent orchestrator that automates software development by running AI coding agents in a loop until all tasks are complete. It provides structured workflows for specification, planning, testing, and quality enforcement across multiple AI platforms including Claude, Amp, OpenCode, Codex, Droid, and Gemini. The system handles complexity classification, cost optimization through smart model routing, automatic fallback on rate limits, and maintains progress through git commits and persistent state files.

## Quickstart

- Read the README.md to understand the project overview and installation steps
- Review the constitution.md file to learn about project governance principles
- Explore the features directory to see existing example specifications and plans
- Check the documentation in docs/ for detailed setup guides and agent-specific instructions
- Review example test cases in the tests/ directory to understand testing patterns

## Usage Examples

- Authenticate users securely by implementing OAuth2 with proper token storage and refresh mechanisms
- Migrate existing authentication systems by replacing hardcoded credentials with OAuth2 flows and updating authorization endpoints

## Troubleshooting

- Tasks are not starting despite configuration being correct
- Agent stops mid-task without completing
- Multiple agents hitting rate limits simultaneously
- Progress file is not updating after iterations complete
- Tests are failing but implementation appears correct
- Concurrent tasks are conflicting or overwriting each other