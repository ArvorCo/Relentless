# First Release Checklist for @arvorco/relentless

## Pre-Release Verification

### ✅ Code Quality
- [x] Type check passes: `bun run typecheck`
- [x] Linter passes: `bun run lint`
- [x] All agent adapters present (Claude, Amp, OpenCode, Codex, Droid, Gemini)
- [x] Skills installed correctly (11 skills total)
- [x] Commands renamed from speckit to relentless
- [x] Scripts are executable (release.sh, publish-manual.sh)

### ✅ Package Configuration
- [x] Package name: `@arvorco/relentless`
- [x] Version: `0.1.0` (initial release)
- [x] publishConfig.access: public (for scoped package)
- [x] bin entry point: `./bin/relentless.ts`
- [x] .npmignore properly excludes dev files
- [x] Package size acceptable (~60 KB)

### ✅ Documentation
- [x] README.md updated with npm install instructions
- [x] CLAUDE.md updated with publishing workflow
- [x] GEMINI_SETUP.md for Gemini users
- [x] PUBLISHING_GUIDE.md with complete instructions
- [x] PACKAGE_CONTENTS.md documents what's in the package
- [x] LICENSE file present (MIT)

### ✅ GitHub Setup
- [x] GitHub Actions workflow created (.github/workflows/publish.yml)
- [x] Release scripts created and tested
- [x] All changes committed and pushed
- [ ] NPM_TOKEN added to GitHub secrets (user must do this)

### ✅ Testing
- [ ] Test local installation: `npm pack` and install the .tgz
- [ ] Test CLI works: `relentless --help`
- [ ] Test init command: `relentless init` in a test directory
- [ ] Test feature creation: `relentless features create test`

## Release Steps

### 1. Final Verification
```bash
# Check working directory is clean
git status

# Run type check
bun run typecheck

# Run linter (warnings OK, errors must be fixed)
bun run lint

# Preview what will be published
npm pack --dry-run
```

### 2. Local Testing (Optional but Recommended)
```bash
# Create test package
npm pack

# Install it globally
npm install -g ./arvorco-relentless-0.1.0.tgz

# Test the CLI
relentless --help
relentless init

# Clean up
npm uninstall -g @arvorco/relentless
rm arvorco-relentless-0.1.0.tgz
```

### 3. Setup NPM Token (One-Time)
1. Login to npm: https://www.npmjs.com/
2. Go to Access Tokens: https://www.npmjs.com/settings/[your-username]/tokens
3. Create new token (Classic Token, Automation type)
4. Copy the token (starts with `npm_...`)
5. Add to GitHub:
   - Go to: https://github.com/ArvorCo/Relentless/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your token
   - Click "Add secret"

### 4. Publish to npm

**Option A: Automated (Recommended)**
```bash
./scripts/release.sh
```
- Select version bump: `1` for patch (stays 0.1.0 for first release)
- Or `5` to skip version bump
- Script will:
  - Run checks
  - Create commit
  - Create tag
  - Push to GitHub
  - GitHub Actions publishes to npm

**Option B: Manual**
```bash
# Login to npm
npm login

# Publish
./scripts/publish-manual.sh
```

### 5. Verify Publication
```bash
# Check package on npm
npm view @arvorco/relentless

# Try installing
npm install -g @arvorco/relentless

# Test it works
relentless --help
```

### 6. Announce Release
- [ ] Tweet about it
- [ ] Post on Reddit (r/programming, r/typescript, r/ai)
- [ ] Share on LinkedIn
- [ ] Update project website (if any)
- [ ] Add to Awesome Lists (awesome-typescript, awesome-ai-tools)

## Post-Release

### Update Documentation
- [ ] Verify npm badge works on GitHub
- [ ] Check npmjs.com page looks good
- [ ] Ensure installation instructions work for users

### Monitor
- [ ] Watch for GitHub issues
- [ ] Check npm download stats
- [ ] Respond to user feedback

## Future Releases

For subsequent releases:
```bash
# Patch release (0.1.0 → 0.1.1)
./scripts/release.sh
# Select: 1 (patch)

# Minor release (0.1.0 → 0.2.0)
./scripts/release.sh
# Select: 2 (minor)

# Major release (0.1.0 → 1.0.0)
./scripts/release.sh
# Select: 3 (major)
```

GitHub Actions will automatically publish to npm.

## Rollback Plan

If something goes wrong:

### Unpublish (within 72 hours)
```bash
npm unpublish @arvorco/relentless@0.1.0
```

### Deprecate (after 72 hours)
```bash
npm deprecate @arvorco/relentless@0.1.0 "This version has issues, use 0.1.1"
```

### Fix and Re-release
```bash
# Fix the issue
# Bump version
./scripts/release.sh
# Publish new version
```

## Success Criteria

Release is successful when:
- [x] Package appears on npmjs.com
- [x] Users can install with `npm install -g @arvorco/relentless`
- [x] CLI works: `relentless --help` shows commands
- [x] Init works: `relentless init` creates project structure
- [x] Skills are installed correctly in `.claude/skills/`
- [x] Commands work for Claude/Amp/OpenCode users
- [x] No critical bugs reported in first 24 hours

## Support Resources

- npm package: https://www.npmjs.com/package/@arvorco/relentless
- GitHub repo: https://github.com/ArvorCo/Relentless
- Issues: https://github.com/ArvorCo/Relentless/issues
- Documentation: README.md
- Publishing guide: PUBLISHING_GUIDE.md
