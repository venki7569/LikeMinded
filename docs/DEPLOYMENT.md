# Deployment

Target topology: client on Vercel, API on Render, database on MongoDB Atlas, media on
Cloudinary, and the AI service on Render as a second service once module 10 lands.

```mermaid
flowchart LR
    U[Browser] --> V[Vercel<br/>static client]
    V -- "XHR to VITE_API_URL" --> R[Render<br/>Express API]
    R --> A[(MongoDB Atlas)]
    R --> M[SMTP provider]
    U -- "signed upload" --> CL[Cloudinary]
    R -. "module 10" .-> AI[Render<br/>FastAPI service]
```

## 1. MongoDB Atlas

1. Create a free M0 cluster in the region nearest your API.
2. Add a database user with **Read and write to any database** — not an admin role.
3. Network access: add Render's outbound IPs, or `0.0.0.0/0` if you rely on credentials
   alone. Prefer pinned IPs where the plan allows it.
4. Copy the connection string and append the database name:
   `mongodb+srv://user:pass@cluster.mongodb.net/likeminded`.

URL-encode any special characters in the password, or the driver will misparse the URI.

## 2. API on Render

Create a **Web Service** pointed at this repository.

| Setting        | Value            |
| -------------- | ---------------- |
| Root directory | `server`         |
| Build command  | `npm ci`         |
| Start command  | `npm start`      |
| Health check   | `/api/v1/health` |
| Node version   | 20 or newer      |

Environment variables to set (see [ENVIRONMENT.md](./ENVIRONMENT.md) for all of them):

```
NODE_ENV=production
MONGODB_URI=<atlas uri>
JWT_ACCESS_SECRET=<48 random bytes, hex>
JWT_REFRESH_SECRET=<different 48 random bytes>
COOKIE_SECRET=<another 48 random bytes>
COOKIE_SECURE=true
CLIENT_ORIGINS=https://<your-app>.vercel.app
CLIENT_URL=https://<your-app>.vercel.app
SMTP_HOST=<provider>
SMTP_USER=<user>
SMTP_PASSWORD=<password>
```

The app already calls `app.set('trust proxy', 1)`, which Render's proxy requires for
correct client IPs — without it every request looks like it comes from one address and
rate limiting would throttle all users together.

## 3. Client on Vercel

| Setting          | Value      |
| ---------------- | ---------- |
| Root directory   | `client`   |
| Framework preset | Vite       |
| Build command    | `npm run build` |
| Output directory | `dist`     |

Set `VITE_API_URL=https://<your-api>.onrender.com/api/v1`.

Because the SPA uses client-side routing, add a rewrite so deep links such as
`/reset-password` reach `index.html` instead of 404-ing. Create `client/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Cross-site cookies

Client and API sit on different domains, so the refresh cookie is cross-site. It works
only when all three hold:

- `COOKIE_SECURE=true`, which sets `SameSite=None; Secure`
- API served over HTTPS
- `CLIENT_ORIGINS` contains the exact client origin, and CORS runs with `credentials: true`

A wildcard CORS origin is invalid with credentials — the browser will refuse the response.

## 4. Cloudinary *(module 3)*

Create a product environment, then store `CLOUD_NAME`, `API_KEY` and `API_SECRET` on the
API only. Uploads will be signed server-side so the secret never reaches the browser.

## 5. CI/CD

`.github/workflows/ci.yml` runs on every push and pull request: both test suites plus a
production client build. Vercel and Render each auto-deploy from `main` on green.

Enable branch protection on `main` requiring the CI check, so a failing suite cannot ship.

## Post-deploy verification

```bash
curl https://<your-api>.onrender.com/api/v1/health
```

Expect `{"success":true,...,"database":"connected"}`. Then in the browser:

1. Register an account and confirm the verification email arrives.
2. Open the emailed link and confirm the account shows as verified.
3. Reload the app — you should stay signed in, proving the refresh cookie survives.
4. Request a password reset and complete it.
5. Open `/api-docs` and confirm the reference renders.

## Operational notes

- Render free instances sleep when idle, so the first request after a pause is slow. The
  health check endpoint is cheap enough to use as a keep-alive ping.
- Logs are JSON in production (Winston), ready to forward to a log drain.
- `SIGTERM` triggers a graceful shutdown: stop accepting connections, close MongoDB, exit,
  with a 10-second hard cap so a stuck connection cannot block a deploy.
- Expired tokens are removed automatically by the TTL index; no cleanup job is needed.
