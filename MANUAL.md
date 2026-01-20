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

## Glossary

- Auto Mode: Smart routing system that selects optimal models based on task complexity and cost settings
- Escalation: Automatic retry with more capable models when tasks fail with smaller models
- Fallback: Switching to alternative AI agents when current agent hits rate limits or becomes unavailable
- Harness: The adapter layer that connects Relentless to specific AI agents like Claude, Amp, or Codex
- Smoke Test: Simple validation tasks that verify basic functionality without requiring complex logic changes
- Mode: Cost optimization preset that determines which models are used for different complexity levels

## Support

For questions, bug reports, or feature requests, please use the GitHub Issues page at https://github.com/ArvorCo/Relentless/issues. This is the primary support channel for the Relentless project where you can search existing discussions or create new issues to get help from the community and maintainers.