# Blog API — Step-by-Step Presentation Guide


Health: http://localhost:3000/api/v1/health
Users: http://localhost:3000/api/v1/users
Posts: http://localhost:3000/api/v1/posts
Swagger Docs: http://localhost:3000/api-docs

## Project Overview

A production-ready RESTful Blog API built with **Express.js** and **PostgreSQL**, featuring:
- 15+ REST endpoints across 4 resources
- JWT authentication with bcrypt password hashing
- Input validation, rate limiting, and security headers
- Swagger/OpenAPI interactive documentation
- Paginated, filterable, and searchable queries
- Comprehensive test suite

---

## Architecture

```
blog-api/
├── src/
│   ├── config/          # Environment configuration
│   ├── database/        # Connection pool, migrations, seeds
│   ├── middleware/       # Auth, validation, error handling
│   ├── controllers/     # Business logic (User, Post, Comment)
│   ├── routes/          # Route definitions with Swagger docs
│   ├── validators/      # express-validator rules
│   ├── utils/           # ApiError class, helpers
│   ├── docs/            # Swagger/OpenAPI config
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── tests/               # Jest + Supertest tests
├── .env                 # Environment variables
└── blog-api.postman_collection.json
```

---

## STEP-BY-STEP PRESENTATION

### Part 1: Database Setup (Show schema design thinking)

**1. Show the Database Schema Design**
- Open `src/database/migrate.js`
- Walk through the 3 tables: **users**, **posts**, **comments**
- Highlight key design decisions:
  - `SERIAL PRIMARY KEY` — auto-incrementing IDs
  - `UNIQUE` constraints on username, email, slug
  - `REFERENCES ... ON DELETE CASCADE` — foreign keys
  - `CHECK` constraints for role and status enums
  - `TEXT[]` array type for tags (PostgreSQL-specific feature)
  - Performance indexes on frequently queried columns
  - `updated_at` trigger for automatic timestamp updates

**2. Create the Database and Run Migrations**
```bash
# In PostgreSQL CLI or pgAdmin:
CREATE DATABASE blog_api;

# Then run migration:
npm run migrate
```

**3. Seed Sample Data**
```bash
npm run seed
# Creates 5 users, 7 posts, 10 comments
# All users have password: password123
```

**4. Show Connection Pooling**
- Open `src/database/connection.js`
- Explain: pool reuses connections instead of opening one per request
- Show max=20 connections, idle timeout, error handling

---

### Part 2: Express.js Setup & Middleware (Show architecture decisions)

**5. Show Project Configuration**
- Open `src/config/index.js` — centralized config from env vars
- Open `.env` — environment variables (never commit real secrets!)

**6. Walk Through Middleware Stack**
- Open `src/app.js` and explain each middleware in order:
  1. `helmet()` — sets security HTTP headers
  2. `cors()` — enables Cross-Origin Resource Sharing
  3. `morgan('dev')` — request logging
  4. `express.json()` — parses JSON request bodies
  5. `rateLimit()` — 100 requests per 15-minute window
  6. Swagger UI — auto-generated API docs
  7. Route mounting — versioned at `/api/v1`
  8. `notFoundHandler` — catches unmatched routes
  9. `errorHandler` — centralized error responses

---

### Part 3: CRUD Endpoints (Demo each resource)

**7. Start the Server**
```bash
npm run dev
# Server runs on http://localhost:3000
# Swagger docs at http://localhost:3000/api-docs
```

**8. Demo Auth Endpoints** (show in Postman or Swagger)

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | POST | `/api/v1/auth/register` | Register new user |
| 2 | POST | `/api/v1/auth/login` | Login → get JWT token |

**Key points to highlight:**
- Password hashed with bcrypt (12 rounds) — show `user.controller.js:15`
- JWT token returned on register AND login
- Token contains userId + role
- Show validation errors (empty body, bad email, short password)

**9. Demo User Endpoints**

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 3 | GET | `/api/v1/users` | No | List all users |
| 4 | GET | `/api/v1/users/profile` | Yes | Get my profile |
| 5 | PUT | `/api/v1/users/profile` | Yes | Update my profile |
| 6 | GET | `/api/v1/users/:id` | No | Get user by ID |

**10. Demo Post Endpoints**

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 7 | GET | `/api/v1/posts` | No | List posts (paginated) |
| 8 | GET | `/api/v1/posts/:id` | No | Get post by ID |
| 9 | GET | `/api/v1/posts/slug/:slug` | No | Get post by slug |
| 10 | GET | `/api/v1/posts/user/:userId` | No | Get user's posts |
| 11 | POST | `/api/v1/posts` | Yes | Create post |
| 12 | PUT | `/api/v1/posts/:id` | Yes | Update post (owner only) |
| 13 | DELETE | `/api/v1/posts/:id` | Yes | Delete post (owner only) |

**Key features to demo:**
- **Pagination**: `?page=1&limit=5` — show pagination metadata in response
- **Filtering**: `?status=published&author_id=2`
- **Search**: `?search=Node`
- **Tag filter**: `?tag=nodejs`
- **Sorting**: `?sort=title&order=ASC`
- **Auto-slug**: Title → URL-safe slug (duplicate handling with timestamp)
- **Ownership**: Try updating another user's post → 403 Forbidden

**11. Demo Comment Endpoints**

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 14 | GET | `/api/v1/posts/:postId/comments` | No | List comments for post |
| 15 | POST | `/api/v1/posts/:postId/comments` | Yes | Add comment |
| 16 | GET | `/api/v1/comments/:id` | No | Get comment by ID |
| 17 | DELETE | `/api/v1/comments/:id` | Yes | Delete comment (owner only) |

**Key features to demo:**
- Nested comments via `parent_id`
- Comments cascade-delete when post is deleted

---

### Part 4: Authentication & Security Deep Dive

**12. JWT Flow** (Open `src/middleware/auth.js`)
1. Client sends `Authorization: Bearer <token>` header
2. Middleware extracts and verifies token with secret
3. Looks up user in database to confirm they still exist
4. Attaches `req.user` for downstream controllers
5. Returns 401 for missing/invalid/expired tokens

**13. Password Security** (Open `src/controllers/user.controller.js`)
- `bcrypt.hash(password, 12)` — 12 salt rounds
- `bcrypt.compare()` — timing-safe comparison
- Password hash NEVER returned in API responses

**14. Authorization Patterns**
- **Owner-only**: Posts/comments can only be edited/deleted by their author
- **Admin override**: Admins can edit/delete any resource
- Show the check: `if (existing.rows[0].author_id !== req.user.id && req.user.role !== 'admin')`

**15. Rate Limiting** (Open `src/app.js`)
- 100 requests per 15-minute window per IP
- Returns `429 Too Many Requests` with friendly message
- Headers: `RateLimit-*` (standard headers)

**16. Security Headers**
- `helmet()` sets: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.

---

### Part 5: Input Validation (Open validators/)

**17. Show Validation Layer**
- Open `src/validators/user.validator.js`
- Explain express-validator chain: `body('field').trim().isLength()...`
- Open `src/middleware/validate.js` — runs validations, collects errors, returns 400

**Demo validation errors:**
```json
POST /api/v1/auth/register with { "username": "a", "email": "bad" }

Response 400:
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "username", "message": "Username must be 3-50 characters" },
    { "field": "email", "message": "Must be a valid email" },
    { "field": "password", "message": "Password must be at least 6 characters" }
  ]
}
```

---

### Part 6: Error Handling (Open middleware/errorHandler.js)

**18. Centralized Error Handler**
- Custom `ApiError` class with static factory methods
- PostgreSQL error code mapping (23505 → 409 Conflict, 23503 → 400)
- Development mode: includes stack trace
- Production mode: clean error messages only

**Demo error scenarios:**
- 400: Validation error (bad input)
- 401: Missing/invalid token
- 403: Trying to edit another user's post
- 404: Non-existent resource
- 409: Duplicate username/email
- 429: Rate limit exceeded

---

### Part 7: Documentation & Testing

**19. Swagger Documentation**
- Navigate to `http://localhost:3000/api-docs`
- Show interactive "Try it out" feature
- Show the Authorize button for JWT
- Explain JSDoc annotations in route files generate the docs

**20. Postman Collection**
- Import `blog-api.postman_collection.json` into Postman
- Show auto-token-capture: login script saves token to collection variable
- Run the collection to demo all endpoints

**21. Run Tests**
```bash
npm test
# 13 tests covering: health, 404, validation, auth guards
```

---

## Quick Demo Script (5-minute version)

1. `npm run migrate` → show tables created
2. `npm run seed` → show sample data inserted
3. `npm run dev` → server starts
4. Open Swagger at `http://localhost:3000/api-docs`
5. **Register** a new user → get token
6. **Login** with seed user → get token
7. **Create a post** with token → show slug generation
8. **List posts** with `?status=published&tag=nodejs` → show filtering
9. **Add comment** to post → show nested comment support
10. **Try creating post without token** → show 401
11. **Try bad validation** → show 400 with error details
12. `npm test` → show all tests pass

---

## API Endpoint Summary (17 endpoints)

| # | Method | Endpoint | Auth | Resource |
|---|--------|----------|------|----------|
| 1 | GET | `/api/v1/health` | - | Health |
| 2 | POST | `/api/v1/auth/register` | - | Auth |
| 3 | POST | `/api/v1/auth/login` | - | Auth |
| 4 | GET | `/api/v1/users` | - | Users |
| 5 | GET | `/api/v1/users/profile` | JWT | Users |
| 6 | PUT | `/api/v1/users/profile` | JWT | Users |
| 7 | GET | `/api/v1/users/:id` | - | Users |
| 8 | GET | `/api/v1/posts` | - | Posts |
| 9 | POST | `/api/v1/posts` | JWT | Posts |
| 10 | GET | `/api/v1/posts/:id` | - | Posts |
| 11 | GET | `/api/v1/posts/slug/:slug` | - | Posts |
| 12 | GET | `/api/v1/posts/user/:userId` | - | Posts |
| 13 | PUT | `/api/v1/posts/:id` | JWT | Posts |
| 14 | DELETE | `/api/v1/posts/:id` | JWT | Posts |
| 15 | GET | `/api/v1/posts/:postId/comments` | - | Comments |
| 16 | POST | `/api/v1/posts/:postId/comments` | JWT | Comments |
| 17 | GET | `/api/v1/comments/:id` | - | Comments |
| 18 | DELETE | `/api/v1/comments/:id` | JWT | Comments |

---

## Technologies Used

| Technology | Purpose |
|-----------|---------|
| Express.js | Web framework |
| PostgreSQL | Relational database |
| pg (node-postgres) | Database driver + connection pooling |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |
| express-validator | Input validation |
| express-rate-limit | Rate limiting |
| helmet | Security headers |
| cors | Cross-Origin Resource Sharing |
| swagger-jsdoc + swagger-ui-express | API documentation |
| morgan | HTTP request logging |
| jest + supertest | Testing |
| nodemon | Development auto-reload |
