# CLAUDE.md - AI Assistant Guide for saas-app

## Project Overview
This guide helps Claude assist with the saas-app project, a full-stack application built with:
- Backend: NestJS (TypeScript)
- Frontend: React + Vite (TypeScript)
- Database: MongoDB
- Caching: Redis
- Styling: Tailwind CSS
- Testing: Jest

## Key Project Areas

### 1. Authentication & Authorization
- JWT-based authentication system
- Role-based access control (RBAC)
- Guards for protecting routes
- Refresh token mechanism

### 2. Club Management
- Club creation and administration
- Member management
- Event organization
- Group chat functionality

### 3. Tournament System
- Single Elimination tournaments
- Swiss tournament system
- Real-time match updates
- Tournament brackets and standings

### 4. Sponsorship Platform
- Sponsor profiles and packages
- Collaboration requests
- Sponsorship tiers
- Integration with events

## Best Practices for AI Assistance

### Code Generation
1. **TypeScript First**
   - Always generate TypeScript code with proper types
   - Follow strict type checking rules
   - Include type definitions for all functions and variables

2. **Component Structure**
   ```typescript
   // Example component structure
   import React from 'react';
   import { ComponentProps } from './types';
   
   export const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
     // Implementation
   };
   ```

3. **API Integration**
   - Use the existing api.ts service
   - Follow RESTful patterns
   - Include error handling
   - Use React Query for data fetching

### Testing Recommendations
1. **Unit Tests**
   - Focus on service and utility functions
   - Use Jest mocks appropriately
   - Test edge cases thoroughly

2. **Component Tests**
   - Use React Testing Library
   - Test user interactions
   - Verify rendered content

### Styling Guidelines
1. **Tailwind Classes**
   - Use existing utility classes
   - Follow the project's color scheme
   - Maintain dark mode support
   - Use the defined component classes

2. **Component Patterns**
   ```tsx
   // Example with Tailwind styling
   <div className="card card-hover p-4">
     <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
       {title}
     </h2>
   </div>
   ```

## Common Tasks

### Adding New Features
1. Create necessary DTOs and schemas
2. Implement backend service and controller
3. Add frontend types and API service
4. Create React components and pages
5. Update routing
6. Add tests

### Debugging Tips
1. Check TypeScript compilation errors
2. Verify JWT token handling
3. Inspect WebSocket connections
4. Review database queries
5. Check React component re-renders

## Project Structure Conventions

### Backend
- `/src/modules/` - Feature modules (auth, clubs, tournaments, etc.)
- `/src/common/` - Shared utilities, guards, decorators
- `/src/config/` - Configuration files
- `/src/schemas/` - MongoDB schemas

### Frontend
- `/src/components/` - Reusable UI components
- `/src/pages/` - Route components
- `/src/services/` - API services and utilities
- `/src/types/` - TypeScript type definitions
- `/src/hooks/` - Custom React hooks

## Development Guidelines

### Code Quality
- Run linting: `npm run lint`
- Run type checking: `npm run typecheck`
- Ensure both pass before considering work complete

### Testing
- Backend: `npm run test` in backend directory
- Frontend: `npm run test` in frontend directory
- Run tests after making changes

### Git Workflow
- Use conventional commit messages
- Keep commits atomic and focused
- Review changes before committing

## Common Gotchas & Solutions

1. **JWT Token Issues**
   - Use `user.sub || user.id` for user identification
   - Verify token expiration handling
   - Check authorization headers

2. **WebSocket Connections**
   - Ensure proper room joining/leaving
   - Handle reconnection logic
   - Verify event emission

3. **Type Safety**
   - Use strict null checks
   - Implement proper interface inheritance
   - Handle undefined cases

4. **Database Operations**
   - Use proper indexes
   - Implement efficient queries
   - Handle MongoDB ObjectId conversion

## Environment Setup
```env
# Required environment variables
MONGODB_URI=mongodb://localhost:27017/saas-app
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
AWS_S3_BUCKET=your_bucket
```

**Note**: Use separate `.env.development` and `.env.production` files in both backend and frontend directories for environment-specific configurations.

## Deployment Considerations
1. Use PM2 for process management
2. Configure proper environment variables
3. Set up MongoDB indexes
4. Enable Redis caching
5. Configure S3 for file uploads

## Testing Guidelines
1. Run backend tests: `cd backend && npm run test`
2. Run frontend tests: `cd frontend && npm run test`
3. Use proper mocking for external services
4. Test real-time functionality
5. Verify type safety

## Documentation Standards
1. Include JSDoc comments for functions
2. Document component props
3. Explain complex business logic
4. Update README for new features
5. Maintain API documentation

## Performance Optimization
1. Use React Query for caching
2. Implement proper MongoDB indexes
3. Optimize WebSocket events
4. Lazy load components
5. Use proper Tailwind purging

This guide should be updated as the project evolves and new patterns emerge.