# CampusReport SaaS - Enterprise Multi-Tenant incident Management

An enterprise-ready, production-grade Multi-Tenant Campus Incident & Report Management SaaS application. Built using the MERN stack with strict logical data isolation, robust JWT token rotation, Role-Based Access Control (RBAC), SLA timelines checking, and real-time synchronization.

---

## Technical Stack & Architecture

### Backend
- **Node.js** with **Express.js** (TypeScript)
- **Mongoose / MongoDB** (geo-indexing, query optimization)
- **Socket.io** (real-time communication engine)
- **Winston** (centralized production logging)
- **Zod** (strict request validation)
- **Security Middlewares**: Helmet, CORS, IP Rate Limiter, cookie-parser, compression

### Frontend
- **React** (Vite + TypeScript)
- **React Router DOM** (protected and role-restricted routing layouts)
- **Axios** (custom instance with interceptors for silent refresh token rotation)
- **React Hook Form** (validated, lightweight state fields)
- **Lucide Icons** (premium visual layout symbols)
- **Vanilla CSS System** (fully responsive, premium dark theme branding, layout assets)

---

## Directory Folder Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # Env, Database settings
│   │   ├── controllers/     # HTTP route handlers (Auth, Reports, notices...)
│   │   ├── middlewares/     # Authentication, RBAC, Zod validations, Error handler
│   │   ├── models/          # Mongoose Schema definitions
│   │   ├── routes/          # Express route setups (v1 versioning)
│   │   ├── services/        # Business logic, SLA triggers, Socket operations
│   │   ├── tests/           # Integration tests (Jest & Supertest)
│   │   ├── types/           # Request types extensions
│   │   └── utils/           # Winston logger, AppError helpers
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # Sidebar, Topbar, Modal overlays, Skeletons
│   │   ├── context/         # AuthContext provider
│   │   ├── hooks/           # useAuth, useSocket clients
│   │   ├── pages/           # Landing, Login, Signup, Dashboard, Details
│   │   ├── utils/           # Axios instance configuration
│   │   └── index.css        # Premium Vanilla CSS Design system
│   ├── tsconfig.json
│   └── Dockerfile
└── docker-compose.yml       # Production multi-service configuration orchestrator
```

---

## API Documentation

### Auth Module (`/api/v1/auth`)
- `POST /signup`: Register a new student/faculty/visitor or staff under a campus.
- `POST /login`: Standard user login, sets secure refresh cookie.
- `POST /logout`: Invalidates session and clears cookie.
- `POST /refresh`: Triggers JWT token rotation and outputs new access token.
- `GET /me`: Returns currently logged in user info.

### Campus Module (`/api/v1/campuses`)
- `GET /`: Lists registered campuses names & themes.
- `GET /slug/:slug`: Fetch settings/branding for dynamic university coloring.
- `POST /`: Onboards a new campus (Super-admin restricted).
- `PUT/:id`: Update colors/Allowed categories (Campus-admin restricted).

### Reports Module (`/api/v1/reports`)
- `POST /`: File a report (Title, description, category, building, room, coordinates).
- `GET /`: Lists reports (support pagination, category, severity, status, search filtering).
- `GET /duplicates`: Checks duplicate tickets before submitting.
- `GET /:id`: Detailed ticket specs with comments list.
- `PUT /:id`: Assign resolver, change department, or update status (Staff/Admin restricted).
- `POST /:id/upvote`: Toggle upvote validation on a ticket.
- `POST /:id/comments`: Add comment reply or internal note.

### Notices Module (`/api/v1/notices`)
- `GET /`: Active notice list.
- `POST /`: Publish notice with severity level (Staff/Admin restricted).
- `DELETE /:id`: Remove notice (Admin restricted).

---

## Setup & Running Guide

### Run Locally (Without Docker)

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   # Create a .env file based on configurations (MongoDB URI and JWT secrets)
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

### Run using Docker Compose
```bash
docker-compose up --build
```
This runs MongoDB, Redis, the Express Backend on port `5000`, and the React Frontend served via Nginx on port `80`.
