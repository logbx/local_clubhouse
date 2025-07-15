# 🚀 Quick Start Guide - Git Worktree Development Environment

## 📁 Project Structure Overview

```
/Applications/Projects/
├── saas-app/           # Full-Stack Web Development (main branch)
│   ├── frontend/       # React + Vite + TypeScript
│   ├── backend/        # NestJS + MongoDB + Redis
│   ├── mobile-app/     # React Native + Expo (within main repo)
│   └── shared/         # Shared types and utilities
│
├── saas-app-mobile/    # Mobile Development Worktree (for focused mobile work)
│
└── saas-app-devops/    # DevOps & Testing (feature/devops-testing)
    ├── .github/       # CI/CD workflows
    ├── docker/        # Container configurations
    ├── tests/         # Testing suites
    └── infrastructure/ # AWS/Cloud configs
```

## 🎯 Claude Code Commands

### Open Each Worktree in Claude Code

```bash
# Full-Stack Web Development
claude-code /Applications/Projects/saas-app

# Mobile App Development  
claude-code /Applications/Projects/saas-app-mobile

# DevOps & Testing
claude-code /Applications/Projects/saas-app-devops
```

## ⚡ Development Server Quick Start

### 1. Full-Stack Web Development

```bash
# Navigate to full-stack worktree
cd /Applications/Projects/saas-app

# Start all services (in separate terminals)
npm run dev:full-stack    # Starts both frontend and backend

# Or manually:
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Database
mongod

# Terminal 4: Redis
redis-server
```

**Access Points**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs

### 2. Mobile App Development

```bash
# Navigate to mobile app directory
cd /Applications/Projects/saas-app/mobile-app

# Ensure backend is running in main worktree first!

# Start Expo development server
npm run dev

# Or platform-specific
npm run dev:ios      # iOS Simulator
npm run dev:android  # Android Emulator
npm run dev:web      # Web browser
```

**Connection**: Mobile app connects to backend at http://localhost:3001

### 3. DevOps & Testing

```bash
# Navigate to devops worktree
cd /Applications/Projects/saas-app-devops

# Run all tests
npm run test:all

# Start Docker environment
docker-compose up

# Run specific test suites
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
```

## 🔄 Daily Workflow

### Morning Setup (5 minutes)

```bash
# 1. Update all worktrees
cd /Applications/Projects/saas-app
git pull origin main

# Mobile app is within main worktree - no separate sync needed

cd /Applications/Projects/saas-app-devops
git fetch origin main && git merge origin/main

# 2. Start development servers
# Use the commands above based on what you're working on
```

### Evening Cleanup (3 minutes)

```bash
# Commit work in each active worktree
cd /Applications/Projects/saas-app
git add . && git commit -m "feat: [description]"
git push origin main

# Mobile changes are committed from the main worktree
cd /Applications/Projects/saas-app
git add mobile-app/ && git commit -m "mobile: [description]"
git push origin main

cd /Applications/Projects/saas-app-devops
git add . && git commit -m "devops: [description]"
git push origin feature/devops-testing
```

## 🎯 When to Use Each Worktree

### Full-Stack Web (`saas-app`) - Use for:
- ✅ React frontend development
- ✅ NestJS backend API development
- ✅ Database schema changes
- ✅ Socket.io real-time features
- ✅ Authentication system
- ✅ Core business logic

### Mobile (`saas-app-mobile`) - Use for:
- ✅ React Native + Expo development
- ✅ Mobile UI/UX implementation
- ✅ Native features (camera, location, notifications)
- ✅ App Store builds
- ✅ Mobile-specific optimizations

### DevOps (`saas-app-devops`) - Use for:
- ✅ Testing (unit, integration, E2E)
- ✅ CI/CD pipeline development
- ✅ Docker containerization
- ✅ AWS infrastructure
- ✅ Security scanning
- ✅ Performance testing

## 🔧 Essential Commands

### Git Worktree Management

```bash
# List all worktrees
git worktree list

# Add new worktree (if needed)
git worktree add ../new-worktree branch-name

# Remove worktree
git worktree remove ../worktree-path

# Sync all worktrees (custom script)
./scripts/sync-worktrees.sh
```

### Package Management

```bash
# Install dependencies in all components
cd /Applications/Projects/saas-app/backend && npm install
cd /Applications/Projects/saas-app/frontend && npm install
cd /Applications/Projects/saas-app/mobile-app && npm install
```

### Database Management

```bash
# MongoDB operations
mongosh                          # Open MongoDB shell
use localclubhouse              # Switch to database
db.users.find()                 # Query users

# Redis operations
redis-cli                       # Open Redis CLI
KEYS *                          # List all keys
FLUSHALL                        # Clear cache (dev only!)
```

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Kill processes on ports
   lsof -ti:3001 | xargs kill -9  # Backend
   lsof -ti:5173 | xargs kill -9  # Frontend
   ```

2. **Git sync issues**:
   ```bash
   # Reset worktree to clean state
   git reset --hard origin/branch-name
   git clean -fd
   ```

3. **Dependencies out of sync**:
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Mobile connection issues**:
   - Ensure backend is running
   - Check EXPO_PUBLIC_API_URL in mobile .env
   - Use computer's IP address for physical device testing

## 📱 Mobile Testing Quick Setup

### For Physical Device Testing

1. **Update mobile environment**:
   ```bash
   # Find your computer's IP
   ipconfig getifaddr en0  # macOS
   # ifconfig | grep "inet " | grep -v 127.0.0.1  # Linux
   
   # Update mobile-app/.env
   EXPO_PUBLIC_API_URL=http://YOUR_IP:3001/api
   ```

2. **Start with tunnel** (if on different network):
   ```bash
   cd /Applications/Projects/saas-app/mobile-app
   npm run dev:tunnel
   ```

## 📊 Monitoring & Logs

### Check Application Health

```bash
# Backend health
curl http://localhost:3001/health

# Frontend (check if running)
curl http://localhost:5173

# Mobile API connection
curl http://localhost:3001/api/health
```

### View Logs

```bash
# Backend logs (if using PM2)
pm2 logs backend

# Docker logs
docker-compose logs -f backend

# Mobile logs (in Expo CLI output)
# Check terminal where you ran `npm run dev`
```

## 🔗 Important URLs

### Development
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs
- **MongoDB**: mongodb://localhost:27017/localclubhouse
- **Redis**: redis://localhost:6379

### Production
- **Frontend**: https://your-vercel-domain.vercel.app
- **Backend**: https://your-aws-domain.com
- **Mobile**: Via App Store / Play Store

## 📚 Quick Reference Links

- [Full-Stack README](./README-FULLSTACK.md)
- [Mobile README](../saas-app-mobile/README-MOBILE.md)
- [DevOps README](../saas-app-devops/README-DEVOPS.md)
- [Worktree Sync Guide](./WORKTREE_SYNC.md)
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md)

---

**🎉 You're all set!** Choose your worktree based on what you're working on and start developing!