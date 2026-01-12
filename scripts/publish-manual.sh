#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📦 Relentless Manual Publish Script${NC}"
echo ""

# Check if logged in to npm
if ! npm whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to npm${NC}"
    echo "Run: npm login"
    exit 1
fi

echo -e "${GREEN}✅ Logged in to npm as: $(npm whoami)${NC}"
echo ""

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Git working directory has changes${NC}"
    read -p "Continue anyway? (y/n): " continue_dirty
    if [[ $continue_dirty != "y" ]]; then
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${YELLOW}$CURRENT_VERSION${NC}"
echo ""

# Ask for version bump
echo "Select version bump type:"
echo "1) patch (0.1.0 -> 0.1.1)"
echo "2) minor (0.1.0 -> 0.2.0)"
echo "3) major (0.1.0 -> 1.0.0)"
echo "4) custom version"
echo "5) skip version bump"
echo ""
read -p "Enter choice (1-5): " choice

if [[ $choice -le 3 ]]; then
    case $choice in
        1) BUMP_TYPE="patch" ;;
        2) BUMP_TYPE="minor" ;;
        3) BUMP_TYPE="major" ;;
    esac
    
    echo -e "\n${GREEN}Bumping version ($BUMP_TYPE)...${NC}"
    npm version $BUMP_TYPE --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    VERSION_CHANGED=true
    
elif [[ $choice == 4 ]]; then
    read -p "Enter new version: " NEW_VERSION
    npm version $NEW_VERSION --no-git-tag-version
    VERSION_CHANGED=true
    
else
    NEW_VERSION=$CURRENT_VERSION
    VERSION_CHANGED=false
fi

echo -e "${GREEN}Version: $NEW_VERSION${NC}"
echo ""

# Run checks
echo -e "${YELLOW}Running type check...${NC}"
bun run typecheck

echo -e "${YELLOW}Running linter...${NC}"
bun run lint || echo -e "${YELLOW}⚠️  Lint warnings (continuing)${NC}"

echo ""

# Dry run
echo -e "${YELLOW}Running npm publish --dry-run...${NC}"
npm publish --dry-run
echo ""

# Confirm publish
read -p "Publish @arvorco/relentless@$NEW_VERSION to npm? (y/n): " confirm

if [[ $confirm != "y" ]]; then
    echo -e "${RED}Aborted${NC}"
    exit 1
fi

# Publish to npm
echo -e "\n${GREEN}Publishing to npm...${NC}"
npm publish

echo -e "\n${GREEN}✅ Published @arvorco/relentless@$NEW_VERSION!${NC}"
echo ""

# Commit and push if version changed
if [[ $VERSION_CHANGED == true ]]; then
    echo -e "${YELLOW}Committing version bump...${NC}"
    git add package.json
    git commit -m "chore(release): v$NEW_VERSION

Published to npm

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"
    
    git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
    
    read -p "Push to GitHub? (y/n): " push_git
    if [[ $push_git == "y" ]]; then
        echo -e "${GREEN}Pushing to GitHub...${NC}"
        git push && git push --tags
        echo -e "${GREEN}✅ Pushed!${NC}"
    else
        echo -e "${YELLOW}⚠️  Remember to push: git push && git push --tags${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 All done!${NC}"
echo ""
echo "Users can now install with:"
echo "  npm install -g @arvorco/relentless@$NEW_VERSION"
echo "  bun install -g @arvorco/relentless@$NEW_VERSION"
echo ""
echo "View on npm: https://www.npmjs.com/package/@arvorco/relentless"
