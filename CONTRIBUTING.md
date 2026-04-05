# Contributing to CLAIM

## Getting Started

1. Fork the repo
2. Clone your fork and checkout the `v3` branch
3. Install dependencies: `bun install`
4. Run tests: `bun test`

## Development

```bash
bun test          # Run all 119 tests
bun run build     # Build the project
claim serve       # Start the worker locally
```

## Code Style

- TypeScript strict mode
- Avoid `any` where possible
- Tests required for new features
- Keep dependencies minimal (currently 2 -- let's keep it that way)

## Pull Requests

1. Create a feature branch (`git checkout -b feat/my-feature`)
2. Make your changes
3. Ensure all tests pass (`bun test`)
4. Open a PR against the `v3` branch

## What We're Looking For

- New capture triggers and lifecycle hooks
- Vault templates and routing strategies
- Integrations beyond Obsidian
- Performance improvements
- Documentation fixes

## Reporting Issues

Use the [issue templates](.github/ISSUE_TEMPLATE/) for bug reports and feature requests.
