# Publishing Relentless to npm

## Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/signup if you don't have one
2. **npm login**: Authenticate your local machine

## Step-by-Step Publishing Guide

### 1. Login to npm

```bash
npm login
# or if using 2FA
npm login --auth-type=web
```

This will prompt for:
- Username
- Password
- Email
- OTP (if 2FA enabled)

### 2. Check Package Name Availability

```bash
npm search relentless
```

**Note:** The package name `relentless` might be taken. Options:
- Use scoped package: `@arvor/relentless` or `@arvorco/relentless`
- Alternative name: `relentless-ai`, `relentless-orchestrator`

### 3. Update package.json (if needed)

If name is taken, update `package.json`:

```json
{
  "name": "@arvorco/relentless",
  "version": "0.1.0",
  ...
}
```

For scoped packages, you might need to make it public:

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

### 4. Verify Files to Publish

Check what will be published:

```bash
npm pack --dry-run
```

This shows:
- Files that will be included
- Total package size
- File list

By default, npm includes:
- `package.json`
- `README.md`
- `LICENSE`
- All files except those in `.npmignore` or `.gitignore`

### 5. Add .npmignore (Optional)

Create `.npmignore` to exclude files from npm package:

```
# Development files
.git
.github
*.log
*.md
!README.md
!LICENSE.md

# Source control
.gitignore

# Documentation (optional - you might want to include these)
REFACTOR_SUMMARY.md
CHANGES_SUMMARY.md
COMMIT_MESSAGE.md
PUBLISHING.md

# Testing
test/
tests/
*.test.ts

# Build artifacts
dist/
node_modules/

# IDE
.vscode/
.idea/
```

**Important:** For Relentless, you probably **DO** want to include:
- `.claude/` directory (skills and commands)
- `templates/` directory
- `skills/` directory
- Documentation files

So be careful with `.npmignore`.

### 6. Bump Version (if needed)

For first publish, `0.1.0` is fine. For future updates:

```bash
# Patch release (0.1.0 -> 0.1.1)
npm version patch

# Minor release (0.1.0 -> 0.2.0)
npm version minor

# Major release (0.1.0 -> 1.0.0)
npm version major
```

This will:
- Update `package.json`
- Create a git commit
- Create a git tag

### 7. Build (if needed)

Since this uses Bun and TypeScript:

```bash
# Optional: Build if you want to include compiled version
bun run build
```

**Note:** For Bun packages, you can publish TypeScript directly since Bun runs it natively.

### 8. Test Installation Locally

Before publishing, test the package locally:

```bash
# Create a test package
npm pack

# This creates relentless-0.1.0.tgz
# Install it globally to test
npm install -g ./relentless-0.1.0.tgz

# Test the CLI
relentless --help

# Clean up
npm uninstall -g relentless
```

### 9. Publish to npm

**Dry run first:**

```bash
npm publish --dry-run
```

**Actually publish:**

```bash
npm publish

# For scoped packages (if using @arvorco/relentless)
npm publish --access public
```

### 10. Verify Publication

Check your package on npm:

```bash
# View package info
npm view relentless

# Or visit
# https://www.npmjs.com/package/relentless
# https://www.npmjs.com/package/@arvorco/relentless
```

## Installation for Users

Once published, users can install with:

```bash
# npm
npm install -g relentless

# bun (recommended)
bun install -g relentless

# Or scoped
npm install -g @arvorco/relentless
```

## Updating the Package

For future updates:

```bash
# 1. Make changes and commit
git add .
git commit -m "feat: new feature"

# 2. Bump version
npm version patch  # or minor/major

# 3. Push with tags
git push && git push --tags

# 4. Publish
npm publish
```

## Common Issues

### Issue: Package name taken
**Solution:** Use scoped package `@arvorco/relentless` or alternative name

### Issue: Authentication failed
**Solution:** Run `npm login` again or check 2FA settings

### Issue: Package too large
**Solution:** Check with `npm pack --dry-run` and add `.npmignore`

### Issue: Missing files in published package
**Solution:** Check `.npmignore` and `.gitignore` - npm respects both

### Issue: Bun runtime dependency
**Solution:** Add to README that Bun is required, or bundle for Node.js

## Current Package Configuration

From `package.json`:
- **Name:** `relentless`
- **Version:** `0.1.0`
- **Binary:** `relentless` → `./bin/relentless.ts`
- **Repository:** https://github.com/ArvorCo/Relentless.git
- **License:** MIT

## Recommended Next Steps

1. ✅ Check if `relentless` name is available
2. ⚠️ If taken, decide: scoped package or alternative name
3. ✅ Update `package.json` with chosen name
4. ✅ Add `.npmignore` or verify what's included
5. ✅ Test local installation with `npm pack`
6. ✅ Login to npm
7. ✅ Publish with `npm publish`
8. ✅ Update README with npm installation instructions

## Alternative: GitHub Packages

You can also publish to GitHub Packages:

```bash
# Add to package.json
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}

# Authenticate
npm login --registry=https://npm.pkg.github.com

# Publish
npm publish
```

Then users install with:
```bash
npm install -g @arvorco/relentless --registry=https://npm.pkg.github.com
```
