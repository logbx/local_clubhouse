# 🏆 Local Clubhouse - Community Tournament Platform

A comprehensive platform for local clubs to organize tournaments, manage events, and build communities.

## 🚀 Quick Start - Git Worktree Development

This project uses **git worktrees** for organized development across different environments:

### 📁 Development Environments

| Worktree | Purpose | Branch | Claude Code Command |
|----------|---------|---------|-------------------|
| **Full-Stack Web** | React + NestJS development | `main` | `claude-code /Applications/Projects/saas-app` |
| **Mobile App** | React Native + Expo | `feature/mobile-development` | `claude-code /Applications/Projects/saas-app-mobile` |
| **DevOps & Testing** | CI/CD, Docker, Testing | `feature/devops-testing` | `claude-code /Applications/Projects/saas-app-devops` |

### ⚡ Start Development

```bash
# Launch all development environments
./scripts/launch-dev-environment.sh

# Or manually choose your environment:
cd /Applications/Projects/saas-app        # Full-stack development
cd /Applications/Projects/saas-app-mobile # Mobile development  
cd /Applications/Projects/saas-app-devops # DevOps & testing
```

### 📚 Documentation

- **[🚀 Quick Start Guide](./QUICK_START.md)** - Get up and running in 5 minutes
- **[🌐 Full-Stack Development](./README-FULLSTACK.md)** - React + NestJS development
- **[📱 Mobile Development](../saas-app-mobile/README-MOBILE.md)** - React Native + Expo
- **[🚀 DevOps & Testing](../saas-app-devops/README-DEVOPS.md)** - CI/CD, Docker, Testing
- **[🔄 Worktree Sync Guide](./WORKTREE_SYNC.md)** - Keep worktrees synchronized
- **[🛠️ Development Workflow](./DEVELOPMENT_WORKFLOW.md)** - When to use each environment

---

## 🛠️ Technology Stack

### Frontend (Web)
- **React** 18.2.0 with TypeScript 5.7.2
- **Vite** 6.2.0 for development and building
- **Tailwind CSS** 3.4.17 with HeadlessUI components
- **React Query** (TanStack Query) 5.71.5 for server state
- **React Router DOM** 7.4.0 for routing
- **Socket.io Client** 4.8.1 for real-time features

### Mobile App
- **React Native** 0.73.6 with Expo SDK 53
- **Expo Router** 3.4.0 for navigation
- **NativeWind** 4.0.1 (Tailwind for React Native)
- **TanStack Query** 5.17.0 for server state
- **AsyncStorage** for local data persistence

### Backend
- **NestJS** 11.1.2 with TypeScript 5.0.4
- **MongoDB** 7.8.6 with Mongoose ODM
- **Redis** 4.6.13 for caching and sessions
- **JWT** authentication with Passport
- **Socket.io** 4.7.4 for WebSocket connections
- **AWS S3** for file storage

### DevOps
- **GitHub Actions** for CI/CD
- **Docker** & Docker Compose for containerization
- **AWS** (ECR, ECS) for backend deployment
- **Vercel** for frontend hosting
- **EAS** (Expo Application Services) for mobile builds

---

## 🏗️ Key Features

### 🏆 Tournament Management
- **Swiss Tournament System** - Advanced pairing algorithms
- **Single Elimination** - Traditional bracket tournaments
- **Real-time Match Updates** - Live scoring and progression
- **Player Management** - Registration and seeding

### 🏪 Club Management
- **Club Creation & Administration** - Full club lifecycle
- **Member Management** - Roles, permissions, invitations
- **Event Organization** - Scheduling and RSVP system
- **Group Chat** - Real-time club communication

### 🤝 Sponsorship Platform
- **Sponsor Profiles** - Showcase sponsors and packages
- **Collaboration Requests** - Streamlined partnership process
- **Sponsorship Tiers** - Flexible sponsorship levels
- **Integration with Events** - Sponsor visibility in tournaments

### 💬 Real-time Communication
- **Socket.io Integration** - Live chat and notifications
- **Multi-platform Support** - Web and mobile real-time sync
- **Event Messaging** - Tournament and event specific chat
- **Friend System** - Social networking features

### 📱 Cross-Platform
- **Web Application** - Full-featured React frontend
- **iOS & Android Apps** - React Native with Expo
- **Responsive Design** - Works on all screen sizes
- **Progressive Web App** - Installable web experience

---

## 🚀 Development Setup

### Prerequisites
```bash
# Required services
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or cloud)
- Git
```

### Quick Start Commands

```bash
# 1. Clone and setup worktrees (already done if you're reading this!)
git worktree list

# 2. Full-Stack Development
cd /Applications/Projects/saas-app
# See README-FULLSTACK.md for detailed setup

# 3. Mobile Development
cd /Applications/Projects/saas-app-mobile
# See README-MOBILE.md for detailed setup

# 4. DevOps & Testing
cd /Applications/Projects/saas-app-devops
# See README-DEVOPS.md for detailed setup
```

### Environment Variables

Each worktree has its own environment configuration:
- **Full-Stack**: Backend `.env` + Frontend `.env`
- **Mobile**: Expo environment variables
- **DevOps**: CI/CD and deployment configurations

---

## 📋 Project Structure

```
saas-app/ (main worktree)
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript types
│   └── vite.config.ts
│
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── clubs/          # Clubs module
│   │   ├── tournaments/    # Tournament system
│   │   ├── websocket/      # Socket.io gateway
│   │   └── main.ts
│   └── uploads/
│
├── mobile-app/             # React Native + Expo
├── shared/                 # Shared types/utilities
└── scripts/               # Development scripts
```

---

## 🧪 Testing

### Unit Testing
- **Backend**: Jest with NestJS testing utilities
- **Frontend**: Jest with React Testing Library
- **Mobile**: Jest with React Native testing

### Integration Testing
- **API Testing**: Supertest for endpoint testing
- **Database Testing**: MongoDB memory server
- **Real-time Testing**: Socket.io testing utilities

### End-to-End Testing
- **Web**: Cypress for browser automation
- **Mobile**: Detox for React Native E2E testing
- **Cross-platform**: API contract testing

---

## 🚀 Deployment

### Production Environments
- **Frontend**: Deployed to Vercel
- **Backend**: Deployed to AWS ECS with Docker
- **Mobile**: Built with EAS, distributed via App Stores
- **Database**: MongoDB Atlas
- **Cache**: Redis Cloud

### Staging Environments
- **Preview Deployments**: Vercel preview URLs
- **Development Builds**: EAS development builds
- **Feature Branches**: Automated testing environments

---

## 🤝 Contributing

1. **Choose Your Worktree**: Based on what you're working on
2. **Follow Conventions**: See individual README files for specific guidelines
3. **Test Your Changes**: Run tests in appropriate worktree
4. **Sync Regularly**: Keep worktrees synchronized
5. **Submit PRs**: Follow the PR template and guidelines

---

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## 📄 License

This project is [MIT licensed](LICENSE).