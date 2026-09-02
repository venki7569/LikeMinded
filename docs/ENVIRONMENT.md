# Environment variables

Both apps ship a `.env.example`. Copy it to `.env` and fill in the blanks. `.env` files are
git-ignored; never commit real secrets.

The API validates its whole environment with Zod at startup (`server/src/config/env.js`).
A missing or malformed value fails the boot immediately with a list of problems, rather
than surfacing as a confusing runtime error later.

## Generating secrets

Each secret must be at least 32 characters. Generate three different values:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never reuse the same string for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and
`COOKIE_SECRET` — separate keys limit the blast radius if one leaks.

## `server/.env`

### Runtime

| Variable     | Required | Default        | Notes                                        |
| ------------ | -------- | -------------- | -------------------------------------------- |
| `NODE_ENV`   | no       | `development`  | `development` \| `test` \| `production`      |
| `PORT`       | no       | `5000`         | Hosts usually inject this                    |
| `API_PREFIX` | no       | `/api/v1`      | Must start with `/`; the refresh cookie path derives from it |

### Client

| Variable         | Required | Default                 | Notes                                  |
| ---------------- | -------- | ----------------------- | -------------------------------------- |
| `CLIENT_ORIGINS` | no       | `http://localhost:5173` | Comma-separated CORS allowlist. Any other origin is rejected |
| `CLIENT_URL`     | no       | `http://localhost:5173` | Base URL for links inside emails       |

### Database

| Variable      | Required | Notes                                                          |
| ------------- | -------- | -------------------------------------------------------------- |
| `MONGODB_URI` | **yes**  | `mongodb+srv://user:pass@cluster.mongodb.net/likeminded` on Atlas |

Not needed when running `npm run dev:memory`, which supplies its own in-memory URI.

### JWT

| Variable                 | Required | Default | Notes                                    |
| ------------------------ | -------- | ------- | ---------------------------------------- |
| `JWT_ACCESS_SECRET`      | **yes**  | —       | ≥ 32 chars                               |
| `JWT_REFRESH_SECRET`     | **yes**  | —       | ≥ 32 chars, different from the access key |
| `JWT_ACCESS_EXPIRES_IN`  | no       | `15m`   | Keep short; refresh covers the gap       |
| `JWT_REFRESH_EXPIRES_IN` | no       | `30d`   | Also sets the cookie's `maxAge`          |

### Cookies

| Variable        | Required | Default | Notes                                                    |
| --------------- | -------- | ------- | -------------------------------------------------------- |
| `COOKIE_SECRET` | **yes**  | —       | ≥ 32 chars                                               |
| `COOKIE_SECURE` | no       | `false` | Set `true` in production. Also switches `SameSite` to `none` so a Vercel client can reach a Render API |

`COOKIE_SECURE=true` over plain HTTP means the browser silently drops the cookie and
sessions never persist — the most common cause of "login works but refresh fails".

### Email

| Variable        | Required | Default | Notes                                     |
| --------------- | -------- | ------- | ----------------------------------------- |
| `SMTP_HOST`     | no       | empty   | Leave empty to log emails to the console  |
| `SMTP_PORT`     | no       | `587`   | `465` switches to implicit TLS            |
| `SMTP_USER`     | no       | —       | Required when `SMTP_HOST` is set          |
| `SMTP_PASSWORD` | no       | —       | Required when `SMTP_HOST` is set          |
| `EMAIL_FROM`    | no       | `LikeMinded <no-reply@likeminded.app>` | Sender header |

All three of host, user and password must be present before real mail is sent. Otherwise
the console transport is used, and verification links appear in the server log — which is
how you complete signup locally without an SMTP account.

### Rate limiting

| Variable                       | Default | Applies to                          |
| ------------------------------ | ------- | ----------------------------------- |
| `RATE_LIMIT_WINDOW_MINUTES`    | `15`    | Window for the two limits below     |
| `RATE_LIMIT_MAX_REQUESTS`      | `300`   | All API routes per IP               |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | `20`    | Login, register, reset per IP       |

Email-sending endpoints have a separate fixed budget of 5 per hour. Limits are skipped
when `NODE_ENV=test` so the suite is not order-dependent.

### AI microservice *(module 10)*

| Variable                | Default                 | Notes                       |
| ----------------------- | ----------------------- | --------------------------- |
| `AI_SERVICE_URL`        | `http://127.0.0.1:8000` | FastAPI base URL            |
| `AI_SERVICE_TIMEOUT_MS` | `8000`                  | Fail fast rather than block a request |

## `client/.env`

| Variable        | Default      | Notes                                                          |
| --------------- | ------------ | -------------------------------------------------------------- |
| `VITE_API_URL`  | `/api/v1`    | Relative in dev so Vite proxies to port 5000 and the app stays same-origin |
| `VITE_APP_NAME` | `LikeMinded` | Display name                                                   |

In production set the absolute API URL, e.g.
`VITE_API_URL=https://likeminded-api.onrender.com/api/v1`.

Only `VITE_`-prefixed variables reach the browser, and everything that does is public.
Never put a secret in a client `.env`.

## Checklist before deploying

- [ ] Three distinct secrets, each ≥ 32 characters, none reused from development
- [ ] `NODE_ENV=production`
- [ ] `COOKIE_SECURE=true` and the API served over HTTPS
- [ ] `CLIENT_ORIGINS` lists the exact deployed client origin, no wildcard
- [ ] `CLIENT_URL` matches the deployed client so email links resolve
- [ ] `MONGODB_URI` points at Atlas with a least-privilege database user
- [ ] Real SMTP credentials configured
