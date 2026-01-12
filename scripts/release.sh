#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Relentless Release Script${NC}"
echo ""

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}❌ Git working directory is not clean. Commit or stash changes first.${NC}"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${YELLOW}$CURRENT_VERSION${NC}"
echo ""

# Ask for version bump type
echo "Select version bump type:"
echo "1) patch (0.1.0 -> 0.1.1) - Bug fixes"
echo "2) minor (0.1.0 -> 0.2.0) - New features"
echo "3) major (0.1.0 -> 1.0.0) - Breaking changes"
echo "4) custom - Enter version manually"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        BUMP_TYPE="patch"
        ;;
    2)
        BUMP_TYPE="minor"
        ;;
    3)
        BUMP_TYPE="major"
        ;;
    4)
        read -p "Enter new version: " NEW_VERSION
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Bump version if not custom
if [[ -n $BUMP_TYPE ]]; then
    echo -e "\n${GREEN}Bumping version ($BUMP_TYPE)...${NC}"
    npm version $BUMP_TYPE --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
else
    # Update package.json with custom version
    npm version $NEW_VERSION --no-git-tag-version
fi

echo -e "${GREEN}✅ New version: $NEW_VERSION${NC}"
echo ""

# Run checks
echo -e "${YELLOW}Running type check...${NC}"
bun run typecheck

echo -e "${YELLOW}Running linter...${NC}"
bun run lint || true # Continue even if lint has warnings

echo ""

# Create release commit
echo -e "${GREEN}Creating release commit...${NC}"
git add package.json
git commit -m "chore(release): v$NEW_VERSION

Release version $NEW_VERSION

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"

# Create git tag
echo -e "${GREEN}Creating git tag v$NEW_VERSION...${NC}"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo ""
echo -e "${GREEN}✅ Release prepared!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review changes: git log -1"
echo "2. Push to GitHub: git push && git push --tags"
echo "3. GitHub Actions will automatically publish to npm"
echo ""
echo -e "${YELLOW}Or publish manually now:${NC}"
read -p "Push and trigger GitHub Actions? (y/n): " push_now

if [[ $push_now == "y" ]]; then
    echo -e "\n${GREEN}Pushing to GitHub...${NC}"
    git push && git push --tags
    echo ""
    echo -e "${GREEN}✅ Pushed! GitHub Actions will publish to npm.${NC}"
    echo -e "Check progress: https://github.com/ArvorCo/Relentless/actions"
else
    echo -e "\n${YELLOW}Skipped push. Run manually:${NC}"
    echo "  git push && git push --tags"
fi
