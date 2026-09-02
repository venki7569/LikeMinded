# LikeMinded

An AI-powered social network that connects people by their interests, skills, goals and
communities. Built as a monorepo: a React client, an Express/MongoDB API, and a Python
microservice for the machine-learning features.

## Status

The project is being built module by module, in the order below. Each module is finished —
API, UI, validation, error handling and tests — before the next one starts.

| #   | Module              | Status         |
| --- | ------------------- | -------------- |
| 1   | Project setup       | Done           |
| 2   | Authentication      | Done           |
| 3   | User profiles       | Done           |
| 4   | Friend system       | Done           |
| 5   | Communities         | Planned        |
| 6   | Posts / feed        | Planned        |
| 7   | Notifications       | Planned        |
| 8   | Real-time chat      | Planned        |
| 9   | Events              | Planned        |
| 10  | AI matching         | Planned        |
| 11  | Semantic search     | Planned        |
| 12  | Toxicity detection  | Planned        |
| 13  | Sentiment analysis  | Planned        |
| 14  | Admin dashboard     | Planned        |
| 15  | Testing + deployment| Planned        |

Modules 10–13 will reuse the TF-IDF, embedding and clustering code from the earlier
prototype now kept in [`legacy/`](./legacy).

## Tech stack

| Layer      | Choices                                                                     |
| ---------- | --------------------------------------------------------------------------- |
| Client     | React 19, Vite, React Router, Redux Toolkit, Tailwind CSS v4, React Hook Form, Framer Motion |
| API        | Node.js, Express 4, Mongoose, Zod, JWT, Winston, Swagger (OpenAPI 3)        |
| Database   | MongoDB (Atlas in production)                                               |
| AI service | Python, FastAPI, Sentence-Transformers, scikit-learn, FAISS *(module 10)*    |
| Testing    | Vitest, Supertest, mongodb-memory-server, Testing Library                   |

## Repository layout

```
like/
├── client/                 React single-page app
│   └── src/
│       ├── app/            Store and router
│       ├── components/     atoms → molecules → organisms
│       ├── features/       auth, profile, connections, theme, ui
│       ├── layouts/        AuthLayout, AppLayout
│       ├── pages/          Dashboard, error pages
│       ├── routes/         Route guards
│       └── services/       Axios client with token refresh
├── server/                 Express REST API
│   └── src/
│       ├── config/         env, database, logger, swagger
│       ├── controllers/    HTTP layer
│       ├── services/       Business logic
│       ├── models/         Mongoose schemas
│       ├── middleware/     auth, validation, rate limits, errors
│       ├── validators/     Zod request schemas
│       ├── routes/         Route definitions + OpenAPI annotations
│       └── utils/          ApiError, asyncHandler, response envelope
├── docs/                   Architecture, database, deployment, environment
└── legacy/                 Earlier FastAPI matching prototype (reference only)
```

## Quick start

Requires Node.js 20+. MongoDB is optional for local development thanks to an in-memory mode.

```bash
# 1. API
cd server
npm install
cp .env.example .env        # then edit the secrets
npm run dev:memory          # or: npm run dev  (uses MONGODB_URI)

# 2. Client, in a second terminal
cd client
npm install
cp .env.example .env
npm run dev
```

| URL                             | What it is                          |
| ------------------------------- | ----------------------------------- |
| http://localhost:5173           | Client app                          |
| http://localhost:5000/api/v1    | REST API                            |
| http://localhost:5000/api-docs  | Swagger UI                          |
| http://localhost:5000/api/v1/health | Health and database status      |

`npm run dev:memory` boots a disposable in-memory MongoDB, so you can use the app before
setting up Atlas. Its data is discarded when the process stops.

Without SMTP credentials the API prints verification and reset emails to the server log
instead of sending them — copy the link from the console to complete those flows locally.

## Scripts

| Command                             | Description                          |
| ----------------------------------- | ------------------------------------ |
| `npm --prefix server run dev`       | API with file watching               |
| `npm --prefix server run dev:memory`| API with a disposable database       |
| `npm --prefix server test`          | API tests (integration + unit)       |
| `npm --prefix client run dev`       | Client dev server                    |
| `npm --prefix client run build`     | Production client build              |
| `npm --prefix client test`          | Component and store tests            |
| `npm test`                          | Both test suites                     |

## Friend system

Authenticated routes under `/api/v1`:

- `POST /connections/requests` — send (or accept a reciprocal pending request)
- `GET /connections/requests/incoming` and `/outgoing` — paginated
- `POST /connections/requests/:id/accept|reject|cancel`
- `GET /connections` — accepted connections
- `DELETE /connections/:userId` — remove
- `GET /connections/status/:userId` — `none` | `outgoing_pending` | `incoming_pending` | `connected` | `blocked`
- `POST /connections/blocks`, `GET /connections/blocks`, `DELETE /connections/blocks/:userId`
- `GET /people` — discovery (search + filters, no AI ranking yet)

Client pages: `/people`, `/requests`, `/connections`. Connection controls also sit on
public profiles.

## Tests

```
server   121 passing   auth + profiles + connections (requests, blocks, discovery, mutuals)
client   51 passing    components, auth, profile, connection button and request actions
```

The API suite runs against `mongodb-memory-server` and a mocked mailer, so it needs no
database, no SMTP server and no network access.

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) — request flow, layering, module boundaries
- [Database](./docs/DATABASE.md) — schemas, indexes, ER diagram
- [Environment](./docs/ENVIRONMENT.md) — every variable and how to generate secrets
- [Deployment](./docs/DEPLOYMENT.md) — Vercel, Render, Atlas, Cloudinary, CI/CD
- API reference — Swagger UI at `/api-docs`, raw spec at `/api-docs.json`

## License

MIT
