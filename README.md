# Rent Bauchi — V1

A connected full-stack hackathon build based on the supplied Rent Bauchi product journey.

## Architecture

- Public/Renter/Owner website: `/public`
- Separate Admin portal: `/admin`
- API/backend: `/backend`
- Renter ↔ Admin ↔ Owner intermediary workflow
- JWT role protection on the backend
- Admin registration requires an invitation token
- Profile pictures for all roles
- Owner NIN upload is admin-only
- Property photo/video uploads
- Property approval workflow
- Interested-renter workflow
- Admin request workflow for enquiry, inspection, payment and other issues
- Scroll reveal animations
- Responsive design
- Local SQLite persistence via better-sqlite3 (`backend/data/rent-bauchi.db`)
- Rate-limited auth routes + request body validation (security hardening)
- Nodemailer password-reset email (demo fallback returns the token when SMTP is unconfigured)
- Interactive Leaflet/OSM map on the property detail page (with geocoding + Bauchi fallback)
- Property photo gallery with thumbnails + lightbox
- Live search, sort-by-price and "Load more" pagination on the public browse page
- Admin analytics dashboard with Chart.js (listings/requests trends, property types, request & property status, platform revenue)

## Admin access

Renters and owners sign up through the public website — there are no demo accounts.

The first Admin account is created through first-run setup: open the Admin portal
(or `/setup.html`) and create the initial administrator. If `SETUP_KEY` is set in
the backend environment, that key is required. Once an Admin exists, further
Admins are invitation-only.

Admin portal is intentionally separate:
- Local admin URL: `http://localhost:5000/admin/`
- There is no Admin link in the public website.

### Admin invitation flow

An existing admin creates an invitation from the Admin panel. The invite token is then given to the new admin. The new admin registers at:

`/admin/register.html?invite=TOKEN`

The backend rejects admin registration without a valid unused invite.

## Run locally

Requires Node.js 22 or newer (see `backend/package.json` `engines`).

### Backend (also serves both frontends)
```bash
cd backend
cp .env.example .env   # then edit values (JWT_SECRET, SMTP, ...)
npm install
npm start
```

The Express server serves the API **and** both frontend portals from one process:

- Public website: `http://localhost:5000`
- Admin portal: `http://localhost:5000/admin/`

### Tests
```bash
cd backend
npm test
```

The automated suite (`node --test`) covers auth, role guards, the property approval workflow, save/unsave, renter requests and the password reset flow. Tests run against an isolated temp SQLite database and never touch the real `backend/data/rent-bauchi.db`.

### Password reset
`/forgot-password.html` walks through a two-step reset. The backend generates a 6-digit reset code and emails it via SMTP. In demo mode (no SMTP configured) it returns the code directly in the API response so it can be copied into the second step.

### Alternative: static file server (optional)
You can serve the frontend separately, then the frontend still calls the API at `http://localhost:5000`:

```bash
cd public
npx serve . -l 3000
```

Public website: `http://localhost:3000` · Admin: `http://localhost:3000/admin/`

Uploaded images and profile pictures are always served by the backend, so keep `npm start` running even when using `serve` for the pages.

## GitHub

This project is structured as a normal GitHub repository. Static frontend files can be pushed directly to GitHub. For a live deployed version, the Node backend must also be deployed to a backend host and the frontend API URL changed from localhost to that deployed API URL.

The frontend automatically calls the API on the **same origin** (`/api`) when the backend serves it, so deployed URLs work with no configuration. For local development where the frontend is served separately (e.g. `npx serve` on port 3000, or opening a file directly), it falls back to `http://localhost:5000/api`. To override for any setup, set `window.API_BASE` before `public/js/app.js` and `admin/js/app.js` load (e.g. `window.API_BASE = "https://api.example.com/api"`). Image URLs for uploaded media automatically resolve against that base.

Do not commit:
- `backend/data/rent-bauchi.db` (and its `-wal`/`-shm` sidecar files)
- files inside `backend/uploads/`
- `.env` (only `.env.example` is tracked)

## Deployment

Copy `backend/.env.example` to `backend/.env` and set real values. Key variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Port the server listens on (hosts usually inject this). |
| `JWT_SECRET` | **Required in production.** Long random string. The server refuses to start in production with a weak/default value. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `APP_URL` | Public URL of the deployment. |
| `CORS_ORIGINS` | Comma-separated allowed browser origins, or `*` for any (default). |
| `SETUP_KEY` | Optional key required to create the first admin. |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | Nodemailer SMTP. Leave `SMTP_USER`/`SMTP_PASS` blank for demo mode (reset code returned in the API response). |
| `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME` | Brevo HTTP email API — works where SMTP is blocked (e.g. Render free). Free: 300 emails/day, no domain required; verify the sender email once in the Brevo dashboard. When set, reset codes are emailed instead of returned. |
| `DB_FILE` / `UPLOAD_DIR` | Override where the SQLite DB and uploads live. |
| `STATIC_MAX_AGE` | Browser cache max-age for non-HTML static assets (e.g. `7d`). HTML is always revalidated. |
| `DB_CHECKPOINT_MS` | How often the SQLite WAL is checkpointed to the main DB file (default `60000`). |

### Persistence

The app uses a local SQLite file plus the `uploads/` folder. On most hosts the
container filesystem is **ephemeral** — data is lost on redeploy unless you mount
a persistent disk and point `DB_FILE`/`UPLOAD_DIR` at it. The server checkpoints
the WAL every `DB_CHECKPOINT_MS` and performs a full checkpoint on `SIGTERM`/`SIGINT`
so committed data is flushed on graceful shutdown.

### Docker

```bash
docker build -t rent-bauchi .
docker run -p 5000:5000 --env-file backend/.env \
  -v rent-bauchi-data:/app/backend/data \
  -v rent-bauchi-uploads:/app/backend/uploads \
  rent-bauchi
```

### Render (free tier)

`render.yaml` is included as a Render blueprint using the **Free** instance type.
Push to GitHub, then Render → **New → Blueprint** → pick the repo. Render reads
`render.yaml` and generates `JWT_SECRET` automatically. You'll get a URL like
`https://rent-bauchi.onrender.com`.

**Free-tier caveats (important):**
- The filesystem is **ephemeral**. The SQLite DB and `uploads/` are reset on every
  restart, redeploy, or 15-minute idle spin-down, and the first-run admin must be
  recreated after a reset. Use it for demos, not real data.
- Outbound SMTP is blocked, so SMTP email won't work. Set **`BREVO_API_KEY`** and
  **`BREVO_FROM_EMAIL`** (free at brevo.com, no domain needed — verify the sender
  email once) to send reset codes to users' inboxes. Without it, reset runs in
  demo mode and returns the code in the API response.
- First load after a sleep takes ~1 minute.

For durable data, either upgrade to `plan: starter` and attach the persistent
disk (see the commented block in `render.yaml`), or move the DB/uploads to
external storage.

The repo ships a demo seed (`backend/data/db.seed.json`: a renter, two agents,
and two approved listings) with its photos in `backend/data/seed-uploads/`. On
boot the server seeds the database when it is empty and copies those photos into
`UPLOAD_DIR`, so a fresh/ephemeral deploy still shows listings. No admin is
seeded, so the first admin is created via `/setup.html`. Replace or clear the
seed for a clean production start.

### Railway / Heroku

- A `Procfile` is included for platforms that use it: `web: node backend/src/server.js`.
- Set `JWT_SECRET`, `SMTP_*` and `APP_URL` in the host dashboard.

### Production checklist

- [ ] `JWT_SECRET` set to a strong random value (not the placeholder).
- [ ] `NODE_ENV=production`.
- [ ] Persistent disk mounted for `DB_FILE` and `UPLOAD_DIR` (skip only for throwaway demos).
- [ ] `CORS_ORIGINS` restricted to your real domains (unless serving frontends from the same origin).
- [ ] SMTP credentials configured, or accept demo-mode reset codes.
- [ ] Rotate any credentials that were ever committed or shared.



## Role boundary
The browser URL is not the security boundary by itself. Every protected Admin API route checks the JWT role server-side. A renter/owner token receives HTTP 403 from `/api/admin/*`, even if the user manually types an Admin URL.
