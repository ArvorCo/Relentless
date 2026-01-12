# Publishing Guide for Relentless

## Recommended: Automated Publishing with GitHub Actions ✅

### One-Time Setup

1. **Get npm token:**
   ```bash
   npm login
   npm token create
   ```
   
   Copy the token that's generated (starts with `npm_...`)

2. **Add token to GitHub Secrets:**
   - Go to https://github.com/ArvorCo/Relentless/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

3. **Done!** Now every release will auto-publish.

### Publishing a New Version

Use the release script:

```bash
./scripts/release.sh
```

This will:
1. Ask what type of version bump (patch/minor/major)
2. Update package.json
3. Run type check and linter
4. Create commit with message `chore(release): vX.Y.Z`
5. Create git tag
6. Push to GitHub
7. GitHub Actions automatically publishes to npm

**That's it!** GitHub Actions does the rest.

### Manual Trigger

You can also manually trigger the workflow:
- Go to https://github.com/ArvorCo/Relentless/actions
- Select "Publish to npm"
- Click "Run workflow"

## Alternative: Manual Publishing

If you prefer manual control, use the manual script:

```bash
./scripts/publish-manual.sh
```

This will:
1. Check you're logged in to npm
2. Ask for version bump
3. Run checks (typecheck, lint)
4. Show dry-run preview
5. Publish to npm
6. Commit and push to GitHub

## Workflow Comparison

### GitHub Actions (Automated)
- ✅ One command: `./scripts/release.sh`
- ✅ Consistent process
- ✅ Secure (npm token in GitHub secrets)
- ✅ Creates GitHub releases automatically
- ✅ Can't accidentally publish without tests passing
- ❌ Requires one-time setup

### Manual Script
- ✅ Full control over each step
- ✅ No GitHub secrets needed
- ✅ Works immediately
- ❌ More steps
- ❌ Can accidentally skip checks
- ❌ Requires npm login on local machine

## Publishing Checklist

Before publishing:

- [ ] All tests pass locally
- [ ] Documentation is up to date
- [ ] CHANGELOG updated (if you have one)
- [ ] No sensitive data in code
- [ ] Version number makes sense (semver)
- [ ] README has correct installation instructions

## Version Numbers (Semver)

- **Patch** (0.1.0 → 0.1.1): Bug fixes, no new features
- **Minor** (0.1.0 → 0.2.0): New features, backward compatible
- **Major** (0.1.0 → 1.0.0): Breaking changes

## First Publish

For the first publish (0.1.0 → npm):

```bash
# Option 1: Automated (after GitHub secrets setup)
./scripts/release.sh

# Option 2: Manual
./scripts/publish-manual.sh
```

## Troubleshooting

### "ENEEDAUTH" error
**Solution:** Run `npm login` first

### "403 Forbidden" error
**Solution:** 
- Check you have permission to publish to @arvorco scope
- Verify npm token has publish permissions
- Check package.json has `"access": "public"` in publishConfig

### "Version already exists" error
**Solution:** Bump the version number in package.json

### GitHub Actions not running
**Solution:**
- Commit message must contain `chore: release` or `chore(release)`
- Check GitHub Actions is enabled in repo settings
- Verify NPM_TOKEN secret is set

## Package Info

- **Name:** @arvorco/relentless
- **Registry:** https://www.npmjs.com/package/@arvorco/relentless
- **Repository:** https://github.com/ArvorCo/Relentless

## After Publishing

Update README.md to show npm installation:

```markdown
## Installation

\`\`\`bash
# npm
npm install -g @arvorco/relentless

# bun (recommended)
bun install -g @arvorco/relentless

# or use directly with bunx
bunx @arvorco/relentless init
\`\`\`
```

Share the release:
- Tweet about it
- Post on Reddit
- Update your website
- Notify users

## Files Created

- `.github/workflows/publish.yml` - GitHub Actions workflow
- `scripts/release.sh` - Automated release script
- `scripts/publish-manual.sh` - Manual publish script
- `.npmignore` - Files to exclude from npm package
- `PUBLISHING_GUIDE.md` - This file
