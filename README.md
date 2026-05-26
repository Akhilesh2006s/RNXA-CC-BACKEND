# RNXA-CC-BACKEND

Node.js REST API for **RNXA Digital** (Express, MongoDB Atlas, JWT cookies).

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Health: `GET http://localhost:5000/health`

Seed user:

```bash
npm run seed:user -- your@email.com YourPassword "Your Name"
```

## Railway deploy

- **Start command:** `npm start` (also in `railway.toml`)
- Set variables below in Railway (never commit `.env`).
- If deploy **Crashed**, open **Deploy Logs** (not Build Logs) and look for `Invalid environment configuration` or `MongoDB`.

### Crash checklist

1. **JWT secrets** — each must be **32+ characters** (not `replace-with-32-char-secret`).
2. **MONGO_URI** — paste full Atlas standard `mongodb://…` URI; database name e.g. `RNXA-CC`.
3. **Atlas → Network Access** — add `0.0.0.0/0` (or Railway static IP) so cloud can connect.
4. **NODE_ENV** — must be `production` on Railway.
5. **PORT** — set `5000` or leave Railway’s injected `PORT` (app reads it automatically).

| Variable | Production |
|----------|------------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGO_URI` | Atlas standard `mongodb://…` URI (database e.g. `RNXA-CC`) |
| `JWT_ACCESS_SECRET` | New random 32+ character string |
| `JWT_REFRESH_SECRET` | New random 32+ character string |
| `ACCESS_TOKEN_TTL` | `15m` |
| `REFRESH_TOKEN_TTL` | `30d` |
| `CLIENT_ORIGIN` | `https://YOUR-frontend.vercel.app,http://localhost:3000` |
| `CLIENT_ORIGIN_SUFFIXES` | Optional: `akhilesh2006s-projects.vercel.app` |

API base: `/api/v1`
