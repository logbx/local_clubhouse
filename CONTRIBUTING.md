# Contributing to Local Clubhouse

Thank you for your interest in contributing to Local Clubhouse! This document provides guidelines and instructions for contributing to the project.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/clubhouse.git
   cd clubhouse
   ```
3. **Set up the development environment**: Follow the [Quick Start Guide](./QUICK_START.md)
4. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📋 Development Workflow

### Before You Start

- Check existing [issues](https://github.com/yourusername/clubhouse/issues) to see if your idea is already being discussed
- For major changes, open an issue first to discuss your proposal
- Review the [Development Workflow](./docs/development/DEVELOPMENT_WORKFLOW.md) guide

### Code Standards

#### TypeScript
- Use TypeScript for all new code
- Follow strict type checking rules
- Avoid using `any` type unless absolutely necessary
- Document complex types with JSDoc comments

#### Code Style
- Run linting before committing: `npm run lint`
- Run type checking: `npm run typecheck`
- Follow existing code patterns and conventions
- Use meaningful variable and function names

#### Testing
- Write tests for new features
- Ensure existing tests pass: `npm run test`
- Aim for at least 80% code coverage
- Include both unit and integration tests where appropriate

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(tournaments): add Swiss tournament pairing algorithm
fix(auth): resolve token refresh issue
docs(readme): update installation instructions
```

## 🔧 Development Areas

### Backend (NestJS)
- Location: `/backend`
- Run: `npm run start:dev`
- Test: `npm run test`
- Lint: `npm run lint`

### Frontend (React + Vite)
- Location: `/frontend`
- Run: `npm run dev`
- Test: `npm run test`
- Lint: `npm run lint`

### Mobile App (React Native + Expo)
- Location: `/mobile-app`
- Run: `npm run start`
- Test: `npm run test`

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Clear title** and description
2. **Steps to reproduce** the issue
3. **Expected behavior** vs. **actual behavior**
4. **Screenshots** or error messages (if applicable)
5. **Environment details**:
   - OS and version
   - Node.js version
   - Browser (for web issues)
   - Device (for mobile issues)

## 💡 Suggesting Features

Feature requests are welcome! Please:

1. **Search existing issues** first to avoid duplicates
2. **Describe the problem** your feature would solve
3. **Explain your proposed solution**
4. **Consider alternatives** and their trade-offs
5. **Include mockups or examples** if helpful

## 📝 Pull Request Process

### Before Submitting

1. **Update your branch** with the latest main:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all checks**:
   ```bash
   npm run lint        # Linting
   npm run typecheck   # Type checking
   npm run test        # Tests
   ```

3. **Update documentation** if needed
4. **Test your changes** thoroughly

### Submitting the PR

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub with:
   - Clear title following commit message conventions
   - Detailed description of changes
   - Link to related issues
   - Screenshots/videos for UI changes
   - Test results

3. **Address review feedback** promptly
4. **Keep your PR updated** with main branch

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No console.log or debugging code
- [ ] Branch is up-to-date with main
- [ ] Commit messages follow conventions
- [ ] PR description is clear and complete

## 🎯 Priority Areas

Check the [Development Roadmap](./docs/development/ROADMAP.md) for current priorities:

- **Critical**: Testing infrastructure, security improvements
- **High Priority**: Performance optimization, code quality
- **Medium Priority**: Documentation, feature enhancements

## 📚 Resources

- [Quick Start Guide](./QUICK_START.md)
- [Complete Documentation](./docs/README.md)
- [Development Workflow](./docs/development/DEVELOPMENT_WORKFLOW.md)
- [Troubleshooting Guides](./docs/troubleshooting/)

## 🤝 Code Review

All submissions require review. We aim to:

- Review PRs within 2-3 business days
- Provide constructive feedback
- Help you improve your contribution
- Merge quality contributions promptly

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You

Your contributions make Local Clubhouse better for everyone. We appreciate your time and effort!

---

**Questions?** Feel free to ask in issues or discussions!

