# SaaS App Monorepo

This repository contains both the **backend** (NestJS API) and **frontend** (React + Vite) for the SaaS application.

---

## Table of Contents
- [Project Structure](#project-structure)
- [Backend (NestJS)](#backend-nestjs)
- [Frontend (React + Vite)](#frontend-react--vite)
- [Development Setup](#development-setup)
- [Rules & Conventions](#rules--conventions)
- [Resources](#resources)
- [License](#license)

---

## Project Structure

```
saas-app/
├── backend/         # All APIs & auth (NestJS)
├── frontend/        # React client (Vite)
├── rules/           # Project rules and conventions
├── .env             # Environment variables
├── docker-compose.yml
└── README.md        # This file
```

---

## Backend (NestJS)

The backend is built with [NestJS](https://nestjs.com/), a progressive Node.js framework for building efficient and scalable server-side applications.

### Setup & Run
```bash
cd backend
npm install

# development
npm run start

# watch mode
yarn start:dev

# production
npm run start:prod
```

### Testing
```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

### Deployment
See [NestJS deployment docs](https://docs.nestjs.com/deployment).

---

## Frontend (React + Vite)

The frontend is a [React](https://react.dev/) app bootstrapped with [Vite](https://vitejs.dev/).

### Setup & Run
```bash
cd frontend
npm install
npm run dev
```

### Linting & Formatting
- ESLint and Prettier are configured. See `frontend/eslint.config.js` and `frontend/.prettierrc`.
- Tailwind CSS is used for styling.

### Expanding ESLint
See the comments in `frontend/README.md` for advanced ESLint configuration.

---

## Rules & Conventions

- See the [`rules/`](./rules/) directory for detailed backend and frontend rules:
  - [`rules/BACKEND_RULES.md`](./rules/BACKEND_RULES.md)
  - [`rules/FRONTEND_RULES.md`](./rules/FRONTEND_RULES.md)

---

## Resources
- [NestJS Documentation](https://docs.nestjs.com)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## License

This project is [MIT licensed](LICENSE).
