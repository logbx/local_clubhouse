# 🔄 Worktree Synchronization Guide

## Overview
This guide explains how to keep your three git worktrees synchronized and manage changes across different development environments.

## 🌳 Worktree Structure

```
/Applications/Projects/
├── saas-app/           # main branch (Full-Stack Web Development)
├── saas-app-mobile/    # feature/mobile-development
└── saas-app-devops/    # feature/devops-testing
```

## 🔄 Synchronization Workflow

### 1. Regular Sync from Main Branch

**Full-stack changes should flow to other worktrees:**

```bash
# In mobile worktree
cd /Applications/Projects/saas-app-mobile
git fetch origin main
git merge origin/main

# In devops worktree  
cd /Applications/Projects/saas-app-devops
git fetch origin main
git merge origin/main
```

### 2. Merging Feature Branches Back to Main

**Mobile feature → Main:**
```bash
# From main worktree
cd /Applications/Projects/saas-app
git checkout main
git pull origin main
git merge feature/mobile-development
git push origin main
```

**DevOps feature → Main:**
```bash
# From main worktree
cd /Applications/Projects/saas-app
git checkout main
git pull origin main
git merge feature/devops-testing
git push origin main
```

### 3. Cross-Worktree Feature Dependencies

When mobile features depend on backend API changes:

```bash
# 1. Develop API in full-stack worktree
cd /Applications/Projects/saas-app
# Make backend changes, test locally

# 2. Commit and sync to mobile worktree
git add . && git commit -m "Add new API endpoint"
git push origin main

# 3. Update mobile worktree
cd /Applications/Projects/saas-app-mobile
git fetch origin main
git merge origin/main
# Now develop mobile features using new API
```

## 📋 Daily Sync Checklist

### Morning Routine (Start of Day)
```bash
# 1. Update main worktree
cd /Applications/Projects/saas-app
git pull origin main

# 2. Update mobile worktree
cd /Applications/Projects/saas-app-mobile
git fetch origin main
git rebase origin/main feature/mobile-development

# 3. Update devops worktree
cd /Applications/Projects/saas-app-devops
git fetch origin main
git rebase origin/main feature/devops-testing
```

### Evening Routine (End of Day)
```bash
# 1. Commit work in each worktree
cd /Applications/Projects/saas-app
git add . && git commit -m "Full-stack: [description]"

cd /Applications/Projects/saas-app-mobile
git add . && git commit -m "Mobile: [description]"

cd /Applications/Projects/saas-app-devops
git add . && git commit -m "DevOps: [description]"

# 2. Push main branch changes
cd /Applications/Projects/saas-app
git push origin main

# 3. Push feature branches
cd /Applications/Projects/saas-app-mobile
git push origin feature/mobile-development

cd /Applications/Projects/saas-app-devops
git push origin feature/devops-testing
```

## 🚫 Conflicts Resolution

### Common Conflict Scenarios

1. **Package.json conflicts** (dependencies)
2. **Shared type definitions** (in /shared folder)
3. **Environment configuration** files
4. **Database schema** changes

### Resolution Strategy

```bash
# When conflicts occur during merge
git status  # See conflicted files

# Edit conflicted files manually or use:
git mergetool

# After resolving conflicts
git add .
git commit -m "Resolve merge conflicts"
```

## 📁 File Synchronization Strategy

### Shared Files (Keep in Sync)
- `/shared/types/` - TypeScript type definitions
- `/backend/src/schemas/` - Database schemas
- Root configuration files (ESLint, Prettier)
- Documentation files (README, guides)

### Environment-Specific Files (Don't Sync)
- `package.json` - Different dependencies per environment
- Environment configs (Vite, Expo, Docker)
- Build outputs and dist folders
- node_modules directories

### Semi-Shared Files (Selective Sync)
- API client code (adapt for each environment)
- Utility functions (may need platform-specific versions)
- Test configurations (shared patterns, different tools)

## 🔄 Automated Sync Scripts

### Create Sync Helper Script

```bash
#!/bin/bash
# scripts/sync-worktrees.sh

echo "🔄 Syncing all worktrees..."

# Update main worktree
echo "📱 Updating main (full-stack) worktree..."
cd /Applications/Projects/saas-app
git pull origin main

# Update mobile worktree
echo "📱 Updating mobile worktree..."
cd /Applications/Projects/saas-app-mobile
git fetch origin main
git rebase origin/main feature/mobile-development

# Update devops worktree
echo "🚀 Updating devops worktree..."
cd /Applications/Projects/saas-app-devops
git fetch origin main
git rebase origin/main feature/devops-testing

echo "✅ All worktrees updated!"
```

Make it executable:
```bash
chmod +x scripts/sync-worktrees.sh
./scripts/sync-worktrees.sh
```

## 🔀 Branch Management

### Feature Branch Naming Convention
- `feature/mobile-[description]` - Mobile-specific features
- `feature/api-[description]` - Backend API changes
- `feature/ui-[description]` - Frontend UI changes
- `feature/devops-[description]` - Infrastructure changes

### Integration Branches
```bash
# Create integration branch for testing
git checkout -b integration/mobile-api-v2

# Merge both mobile and API features
git merge feature/mobile-push-notifications
git merge feature/api-notifications

# Test integration, then merge to main
```

## 📊 Monitoring Sync Status

### Check Divergence Between Worktrees
```bash
# From main worktree
git log --oneline --graph --all

# Check what's in mobile branch but not in main
git log main..feature/mobile-development

# Check what's in main but not in mobile branch
git log feature/mobile-development..main
```

### Visual Tools
- Use VS Code's Git Graph extension
- GitHub's network graph
- GitKraken or similar GUI tools

## ⚠️ Common Pitfalls

1. **Forgetting to sync before starting work**
   - Always pull latest changes first

2. **Working on same files in multiple worktrees**
   - Coordinate changes through main branch

3. **Conflicting database migrations**
   - Test migrations in all environments

4. **Environment-specific code in shared files**
   - Keep platform-specific code in appropriate worktrees

5. **Large binary files**
   - Use Git LFS for large assets

## 🔄 Weekly Integration Process

### Every Friday (Integration Day)
1. **Code Review**: Review all feature branches
2. **Integration Testing**: Test features together
3. **Merge to Main**: Merge stable features
4. **Sync All Worktrees**: Ensure all environments are updated
5. **Deploy**: Deploy to staging environments

## 📋 Sync Troubleshooting

### Reset Worktree to Clean State
```bash
# If worktree gets corrupted
cd /Applications/Projects/saas-app-mobile
git reset --hard origin/feature/mobile-development
git clean -fd

# Re-install dependencies
npm install
```

### Remove and Recreate Worktree
```bash
# From main worktree
git worktree remove ../saas-app-mobile
git worktree add ../saas-app-mobile feature/mobile-development
```

This synchronization strategy ensures all team members can work efficiently across different aspects of the application while maintaining code consistency and preventing conflicts.