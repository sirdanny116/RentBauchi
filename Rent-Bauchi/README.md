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

## Demo accounts

Renter:
- Email: `renter@rentbauchi.test`
- Password: `123456`

Owner:
- Email: `agent@rentbauchi.test`
- Password: `123456`

Admin:
- Email: `admin@rentbauchi.test`
- Password: `Admin123`

Admin portal is intentionally separate:
- Local admin URL: `http://localhost:3000/admin/`
- There is no Admin link in the public website.

### Admin invitation flow

An existing admin creates an invitation from the Admin panel. The invite token is then given to the new admin. The new admin registers at:

`/admin/register.html?invite=TOKEN`

The backend rejects admin registration without a valid unused invite.

## Run locally

### Backend (also serves both frontends)
```bash
cd backend
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
`/forgot-password.html` walks through a two-step reset. The backend generates a reset token and (in this no-email demo) returns it directly in the API response so it can be copied into the second step.

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

To point the frontend at a deployed backend, set the `API_BASE` script variable before `public/js/app.js` and `admin/js/app.js` load (e.g. `window.API_BASE = "https://api.example.com/api"`). Image URLs for uploaded media automatically resolve against that base.

Do not commit:
- `backend/data/rent-bauchi.db` (and its `-wal`/`-shm` sidecar files)
- files inside `backend/uploads/`
- `.env`


## Role boundary
The browser URL is not the security boundary by itself. Every protected Admin API route checks the JWT role server-side. A renter/owner token receives HTTP 403 from `/api/admin/*`, even if the user manually types an Admin URL.
