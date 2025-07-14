#!/bin/bash

# 🚀 Launch Development Environment Script
# This script opens all development environments in separate terminal tabs/windows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🚀 LAUNCHING DEVELOPMENT ENVIRONMENT${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to open terminal tabs on macOS
open_terminal_tab() {
    local title="$1"
    local command="$2"
    local directory="$3"
    
    osascript -e "
    tell application \"Terminal\"
        set newTab to do script \"cd '$directory' && echo -e '\\033]0;$title\\007' && $command\"
        set custom title of newTab to \"$title\"
    end tell"
}

# Function to open VS Code
open_vscode() {
    local directory="$1"
    local title="$2"
    
    echo -e "${BLUE}📝 Opening $title in VS Code...${NC}"
    code "$directory"
}

# Check if we're on macOS (for Terminal app integration)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${YELLOW}🖥️  Detected macOS - using Terminal app${NC}"
    
    # 1. Full-Stack Development
    echo -e "${GREEN}🌐 Opening Full-Stack Development Environment...${NC}"
    open_terminal_tab "Backend (NestJS)" "npm run dev" "/Applications/Projects/saas-app/backend"
    sleep 1
    open_terminal_tab "Frontend (React)" "npm run dev" "/Applications/Projects/saas-app/frontend"
    sleep 1
    open_terminal_tab "MongoDB" "mongod" "/Applications/Projects/saas-app"
    sleep 1
    open_terminal_tab "Redis" "redis-server" "/Applications/Projects/saas-app"
    
    # 2. Mobile Development
    echo -e "${GREEN}📱 Opening Mobile Development Environment...${NC}"
    sleep 1
    open_terminal_tab "Mobile (Expo)" "npm run dev" "/Applications/Projects/saas-app-mobile"
    
    # 3. DevOps & Testing
    echo -e "${GREEN}🚀 Opening DevOps & Testing Environment...${NC}"
    sleep 1
    open_terminal_tab "Tests (Jest)" "npm run test:watch" "/Applications/Projects/saas-app-devops"
    sleep 1
    open_terminal_tab "Docker" "docker-compose up" "/Applications/Projects/saas-app-devops"
    
    echo ""
    echo -e "${BLUE}📝 Opening VS Code workspaces...${NC}"
    open_vscode "/Applications/Projects/saas-app" "Full-Stack"
    sleep 2
    open_vscode "/Applications/Projects/saas-app-mobile" "Mobile"
    sleep 2
    open_vscode "/Applications/Projects/saas-app-devops" "DevOps"
    
else
    # For Linux/WSL - provide manual commands
    echo -e "${YELLOW}🐧 Non-macOS detected - please run these commands manually:${NC}"
    echo ""
    echo -e "${GREEN}Full-Stack Development:${NC}"
    echo "cd /Applications/Projects/saas-app/backend && npm run dev"
    echo "cd /Applications/Projects/saas-app/frontend && npm run dev"
    echo "mongod"
    echo "redis-server"
    echo ""
    echo -e "${GREEN}Mobile Development:${NC}"
    echo "cd /Applications/Projects/saas-app-mobile && npm run dev"
    echo ""
    echo -e "${GREEN}DevOps & Testing:${NC}"
    echo "cd /Applications/Projects/saas-app-devops && npm run test:watch"
    echo "cd /Applications/Projects/saas-app-devops && docker-compose up"
    echo ""
    echo -e "${GREEN}VS Code:${NC}"
    echo "code /Applications/Projects/saas-app"
    echo "code /Applications/Projects/saas-app-mobile"
    echo "code /Applications/Projects/saas-app-devops"
fi

echo ""
echo -e "${GREEN}✅ DEVELOPMENT ENVIRONMENT LAUNCHED${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}🔗 Quick Access URLs:${NC}"
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:3001"
echo "API Docs:  http://localhost:3001/api-docs"
echo ""
echo -e "${YELLOW}📱 Mobile Development:${NC}"
echo "- Scan QR code with Expo Go app"
echo "- Ensure backend is running first"
echo ""
echo -e "${BLUE}🚀 DevOps & Testing:${NC}"
echo "- Tests will run automatically in watch mode"
echo "- Docker services starting up"
echo ""
echo -e "${PURPLE}Happy coding! 🎉${NC}"