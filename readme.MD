# PHSAMS — Present Hoon Sir Attendance Management System

PHSAMS is a full-stack, QR-code-based attendance and academic management system built for coaching institutes / classroom batches. It supports three separate user roles — **Super Admin / Admin**, **Faculty**, and **Student** — each with their own login, dashboard, and permission scope. Attendance is captured either by students scanning a live QR code from their own device, or manually by an admin/faculty. The system also handles batch management, assignments & submissions, reports, and email/SMS notifications.

**Live deployment:** https://present-hoon-sir-dfhv.onrender.com

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Repository Structure](#repository-structure)
5. [Database Schema](#database-schema)
6. [Authentication & Roles](#authentication--roles)
7. [API Reference](#api-reference)
8. [Frontend Routes](#frontend-routes)
9. [QR Attendance Flow](#qr-attendance-flow)
10. [Assignments Flow](#assignments-flow)
11. [Environment Variables](#environment-variables)
12. [Local Development Setup](#local-development-setup)
13. [Deployment (Render)](#deployment-render)
14. [Known Utility / Migration Scripts](#known-utility--migration-scripts)

---

## Features

- **Three-role system**: Super Admin, Admin, Faculty, Student — each with isolated login and permissions.
- **QR-based attendance**: A time-limited QR session is generated per batch; students scan it and self-mark attendance from their own device.
- **Manual attendance editing**: Admins/faculty can view and correct attendance for any date.
- **Batch management**: Create, archive, restore, and configure batches (including QR validity duration).
- **Student management**: Add/edit/delete students, set login credentials, blacklist students, per-batch or per-admin student lists.
- **Faculty management**: Super Admin creates faculty accounts, assigns batches to faculty, manages faculty collaborators.
- **Assignments & submissions**: Faculty post assignments (PDF, stored on Google Drive); students submit work; faculty grade/review submissions.
- **Reports**: Per-batch and per-student attendance reports, attendance matrix view, exportable data (xlsx/PDF via `xlsx` and `jspdf` on the frontend).
- **Notifications**: Email (via SMTP / Nodemailer-style mailer) and SMS notifications, toggle-able per admin.
- **Password management**: Token-based "set password" / "reset password" flows for admins, faculty, and students.
- **Contact form**: Public contact form on the marketing landing page.
- **Dark/light theme** support on the frontend (`ThemeContext`).

---

## Tech Stack

### Backend
- **Node.js** + **Express 5**
- **PostgreSQL** (via `pg`), using raw SQL (no ORM)
- **JWT** (`jsonwebtoken`) for auth, **bcrypt** for password hashing
- **Multer** for file upload handling (assignment PDFs / submissions)
- **Google APIs (`googleapis`)** — Google Drive integration for storing assignment/submission files
- **QRCode (`qrcode`)** — server-side QR code generation
- **Nodemailer-style mailer / `@emailjs/nodejs`** — email notifications
- **dotenv**, **cors**, **uuid**

### Frontend
- **React 18** + **React Router v6** (`BrowserRouter`)
- **Vite** — build tool & dev server
- **Tailwind CSS** — styling
- **jspdf** + `jspdf-autotable` — client-side PDF report export
- **xlsx** — client-side Excel export

### Infrastructure
- Deployed on **Render** (frontend as a static site with SPA rewrite rule; backend as a web service)
- **PostgreSQL** database (Render Postgres or any managed Postgres)
- **Google Drive** used as file storage for assignments/submissions (no local/S3 file storage)

---

## Architecture Overview

```
┌─────────────────────────────┐        HTTPS (REST/JSON)        ┌──────────────────────────────┐
│   Frontend (React + Vite)   │ ───────────────────────────────▶│   Backend (Node + Express)    │
│   Render Static Site        │◀─────────────────────────────── │   Render Web Service          │
│   present-hoon-sir-dfhv...  │                                  │   /api/*                     │
└─────────────────────────────┘                                  └───────────────┬──────────────┘
        │  BrowserRouter (client-side routing)                                   │
        │  _redirects: /* → /index.html (200)                                   │
        ▼                                                                        ▼
  3 portals rendered from one SPA:                                     ┌─────────────────┐
   • Admin/Super Admin (/dashboard, /admins, ...)                       │  PostgreSQL DB  │
   • Faculty (/faculty/login, /faculty/portal)                         └─────────────────┘
   • Student (/student/login, /student/portal)                                 │
                                                                                  ▼
                                                                        ┌─────────────────┐
                                                                        │  Google Drive   │
                                                                        │ (assignment &   │
                                                                        │ submission PDFs)│
                                                                        └─────────────────┘
                                                                                  │
                                                                        ┌─────────────────┐
                                                                        │  SMTP / Email   │
                                                                        │  & SMS provider │
                                                                        └─────────────────┘
```

**Key architectural points:**

- The frontend is a **single-page application (SPA)**. All three portals (Admin, Faculty, Student) live in one React app and are split by route + guarded by role-specific "protected route" components (`ProtectedRoute`, `FacultyProtectedRoute`, `StudentProtectedRoute`), each backed by its own React Context (`AuthContext`, `FacultyAuthContext`, `StudentAuthContext`) that stores the JWT and user info (likely in memory/localStorage).
- Because it's a client-side-routed SPA hosted as a **static site**, the host (Render) must be configured to rewrite all unknown paths to `/index.html` (done via `_redirects` / dashboard rewrite rule) — otherwise deep links like `/student/login` 404 at the host level before React Router ever runs.
- The backend is a **stateless REST API** (`/api/...`) — no server-rendered views, no session cookies. Auth is via **JWT bearer tokens**, verified per-request by middleware (`verifyToken`, `verifyAdminOrFaculty`, `verifyStudentToken`, `verifyFacultyToken`, `requireRole`).
- The database is accessed with **raw SQL** via the `pg` driver (`backend/src/config/db.js`), with the full schema defined in `backend/src/config/schema.sql`. There is no migration framework in use — instead, one-off `migrate-*.js` scripts are run manually against the DB when the schema changes.
- File uploads (assignment PDFs, student submissions) are **not stored on the server's disk** — they're uploaded via Multer into memory/temp storage and then pushed to **Google Drive** via a service account/OAuth refresh token (`googleDrive.js` util), with the Drive file ID/URL persisted in Postgres.
- CORS is locked down to a single allowed origin (`FRONTEND_URL` env var) plus `localhost:3000` for local dev.

---

## Repository Structure

```
PHSAMS/
├── backend/
│   ├── src/
│   │   ├── index.js                  # Express app entry point
│   │   ├── config/
│   │   │   ├── db.js                 # PostgreSQL connection pool
│   │   │   └── schema.sql            # Full DB schema (source of truth)
│   │   ├── controllers/              # Business logic per resource
│   │   │   ├── authController.js             # Admin/super-admin login & password reset
│   │   │   ├── adminController.js            # Admin CRUD, notification toggles
│   │   │   ├── batchController.js             # Batch CRUD, archive/restore, admin assignment
│   │   │   ├── studentController.js           # Student CRUD, credentials, blacklist
│   │   │   ├── studentAuthController.js        # Student login, own attendance/assignments
│   │   │   ├── facultyController.js            # Faculty CRUD, collaborators, batch access
│   │   │   ├── facultyAuthController.js        # Faculty login & password reset
│   │   │   ├── facultyPortalController.js      # Faculty's assignments/submissions/students view
│   │   │   ├── attendanceController.js         # Get/save attendance for a batch+date
│   │   │   ├── qrController.js                 # QR session generation, scan/submit, session reports
│   │   │   ├── reportController.js             # Batch/student reports, attendance matrix
│   │   │   └── contactController.js            # Public contact form submission
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification + role guards
│   │   │   └── upload.js             # Multer config for PDF uploads
│   │   ├── routes/                   # One router per resource, mounted under /api/*
│   │   └── utils/
│   │       ├── dateUtils.js
│   │       ├── htmlEscape.js
│   │       ├── mailer.js             # Email sending
│   │       ├── smsSender.js          # SMS sending
│   │       └── googleDrive.js        # Google Drive upload/fetch helpers
│   ├── *.js (root)                   # One-off scripts: seed-superadmin, migrate-*, check-*, test-*
│   ├── package.json
│   └── .env                          # Local environment config (not committed in production)
│
└── frontend/
    ├── src/
    │   ├── main.jsx                  # App bootstrap, wraps app in BrowserRouter + Context providers
    │   ├── App.jsx                   # All route definitions (see Frontend Routes below)
    │   ├── api/client.js             # Centralized fetch/axios-style API client
    │   ├── context/
    │   │   ├── AuthContext.jsx           # Admin/super-admin auth state
    │   │   ├── FacultyAuthContext.jsx    # Faculty auth state
    │   │   ├── StudentAuthContext.jsx    # Student auth state
    │   │   └── ThemeContext.jsx          # Light/dark theme
    │   ├── components/
    │   │   ├── Layout.jsx, Sidebar.jsx, Footer.jsx, Logo.jsx
    │   │   ├── ProtectedRoute.jsx         # Guards admin routes
    │   │   ├── FacultyProtectedRoute.jsx  # Guards faculty routes
    │   │   ├── StudentProtectedRoute.jsx  # Guards student routes
    │   │   ├── AttendancePie.jsx          # Attendance chart
    │   │   └── ContactModal.jsx
    │   ├── pages/                    # One component per screen (Dashboard, Login, Students, Reports, StudentPortal, FacultyPortal, etc.)
    │   ├── hooks/useSelectedBatch.js
    │   └── utils/date.js
    ├── public/
    │   ├── _redirects                # SPA rewrite rule for Render static hosting
    │   ├── favicon.svg, robots.txt, sitemap.xml
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Database Schema

All tables are defined in `backend/src/config/schema.sql`. Summary of entities and relationships:

| Table | Purpose |
|---|---|
| `admins` | Super admins and admins (differentiated by `role`). Holds notification preferences and password-reset tokens. |
| `batches` | A class/batch, owned/created by an admin. Has configurable `qr_validity_minutes` and can be archived. |
| `batch_admins` | Many-to-many: which admins can manage which batches (collaboration). |
| `students` | Student records, scoped to a `batch_id`. Has its own `login_id`/`password_hash` for the student portal, plus blacklist flag. `urn` is unique per batch (case-insensitive via `CITEXT`). |
| `qr_sessions` | One row per "Generate QR" action — a time-boxed token tied to a batch. |
| `attendance` | One row per student per date, `status` (`present`/`absent`), `method` (`qr`/`manual`), linked to the `qr_session` if applicable. Unique per `(student_id, date)`. |
| `qr_submissions` | Logs every scan/submission against a QR session (used to enforce a device cooldown — max 2 submissions per 15 minutes per device). |
| `faculties` | Faculty accounts, created by an admin, can be activated/deactivated. |
| `faculty_admins` | Many-to-many: which admins can manage a given faculty. |
| `faculty_batches` | Many-to-many: which batches a faculty can access. |
| `assignments` | Posted by a faculty for a batch; file lives in Google Drive (`drive_file_id`/`drive_file_url`). |
| `assignment_submissions` | A student's submission against an assignment; also stored in Google Drive; has a review `status` (`pending`/`completed`/`incomplete`) and `remark`. Unique per `(assignment_id, student_id)`. |

Indexes exist on the common lookup paths: `attendance(batch_id, date)`, `students(batch_id)`, `qr_submissions(device_token, submitted_at)`, `faculty_batches(faculty_id)`, `faculty_admins(admin_id)`, `assignments(batch_id)`, `assignment_submissions(assignment_id)`, `assignment_submissions(student_id)`.

---

## Authentication & Roles

There are **three completely separate auth systems**, each with its own login endpoint, JWT payload/secret usage, and middleware guard:

| Role | Login endpoint | Middleware guard | Notes |
|---|---|---|---|
| Admin / Super Admin | `POST /api/auth/login` | `verifyToken` (+ `requireRole('super_admin')` for restricted routes) | Super Admin can manage other admins; both can manage batches/students/faculty within their access. |
| Faculty | `POST /api/faculty-auth/login` | `verifyFacultyToken` | Scoped to their assigned batches only. |
| Student | `POST /api/student-auth/login` | `verifyStudentToken` | Can only see their own attendance/assignments. |

Shared middleware (`backend/src/middleware/auth.js`):
- `verifyToken` — validates an admin/super-admin JWT.
- `requireRole(role)` — restricts a route to a specific admin role (e.g., `super_admin`).
- `verifyAdminOrFaculty` — allows either an admin or a faculty JWT (used for attendance & QR routes, since both roles can take attendance).
- `verifyFacultyToken` / `verifyStudentToken` — validate faculty/student JWTs respectively.

Password handling:
- Passwords are hashed with **bcrypt**.
- New admins/faculty/students are issued a **password-reset token** (stored + expiry on the row) to complete first-time setup via `set-password` endpoints/pages, rather than being given a raw password directly.

---

## API Reference

All routes are prefixed with `/api`. Base URL in production is the backend's Render service URL (configured on the frontend via an API base URL, see `frontend/src/api/client.js`).

### Health
- `GET /api/health` — liveness check.

### Auth — Admin (`/api/auth`)
- `POST /login`
- `POST /change-password` — auth required
- `GET /verify-reset-token/:token`
- `POST /set-password`

### Admins (`/api/admins`)
- `GET /basic` — any authenticated admin
- `GET /me` — any authenticated admin
- `GET /:id/batches` — super admin
- `PATCH /:id/notifications` — super admin
- `PATCH /:id/sms-notifications` — super admin
- `POST /` — create admin (super admin)
- `PUT /:id` — update admin (super admin)
- `DELETE /:id` — delete admin (super admin)
- `GET /` — list admins (super admin)

### Batches (`/api/batches`) — auth required
- `GET /` — list batches
- `POST /` — create batch
- `PATCH /:id/archive`
- `PATCH /:id/restore`
- `PATCH /:id/settings`
- `POST /:id/assign-admin` — super admin
- `DELETE /:id/assign-admin/:adminId` — super admin
- `DELETE /:id` — super admin

### Students (`/api/students`) — auth required
- `GET /mine` — students created by / visible to the logged-in admin
- `GET /batch/:batchId`
- `POST /batch/:batchId`
- `POST /`
- `GET /:studentId`
- `PUT /:studentId`
- `DELETE /:studentId`
- `PATCH /:studentId/blacklist`
- `PATCH /:studentId/credentials` — sets student portal login credentials

### QR Attendance (`/api/qr`)
- `POST /batch/:batchId/generate` — admin/faculty — starts a QR session
- `GET /:sessionId/report` — admin/faculty
- `GET /:sessionId/download` — admin/faculty
- `GET /:token/status` — **public** — polled by the scan page
- `POST /:token/submit` — **public** — student submits attendance by scanning

### Attendance (`/api/attendance`) — admin/faculty
- `GET /batch/:batchId` — attendance for a batch on a given date
- `POST /batch/:batchId` — save/edit attendance for a batch on a given date

### Reports (`/api/reports`) — auth required
- `GET /batch/:batchId`
- `GET /batch/:batchId/matrix`
- `GET /student/:studentId`

### Faculty (`/api/faculties`) — auth required (admin)
- `GET /`, `POST /`, `PUT /:id`, `PATCH /:id/active`, `DELETE /:id`
- `POST /:id/collaborators`, `DELETE /:id/collaborators/:adminId`
- `GET /:id/batches`, `POST /:id/batches`, `DELETE /:id/batches/:batchId`

### Faculty Auth (`/api/faculty-auth`)
- `POST /login`
- `GET /verify-reset-token/:token`
- `POST /set-password`
- `POST /change-password` — auth required

### Faculty Portal (`/api/faculty-portal`) — faculty auth required
- `GET /batches` — batches assigned to this faculty
- `GET /batches/:batchId/students`
- `GET /batches/:batchId/assignments`
- `POST /batches/:batchId/assignments` — upload assignment PDF
- `DELETE /assignments/:id`
- `GET /assignments/:id/submissions`
- `PATCH /submissions/:id` — grade/review a submission

### Student Auth (`/api/student-auth`)
- `POST /login` — public
- `GET /me` — student auth required — own attendance
- `GET /assignments` — student auth required
- `POST /assignments/:assignmentId/submit` — student auth required — upload submission file

### Contact (`/api/contact`)
- `POST /` — public — marketing/landing page contact form

---

## Frontend Routes

Defined in `frontend/src/App.jsx`, wrapped in `BrowserRouter` (`main.jsx`):

| Path | Page | Access |
|---|---|---|
| `/` | Landing | Public |
| `/login` | Admin/Super Admin login | Public |
| `/set-password/:token` | Admin password setup | Public |
| `/scan/:token` | QR scan / attendance submission page | Public |
| `/student/login` | Student login | Public |
| `/student/portal` | Student portal (attendance, assignments) | Student-protected |
| `/dashboard` | Admin dashboard | Admin-protected |
| `/batches/new` | Add batch | Admin-protected |
| `/students` | Manage students | Admin-protected |
| `/students/:id/settings` | Student settings | Admin-protected |
| `/generate-qr` | Generate QR session | Admin-protected |
| `/edit-attendance` | Manually edit attendance | Admin-protected |
| `/reports` | Reports (batch/student, export) | Admin-protected |
| `/admins` | Manage admins | Admin-protected |
| `/admins/:id/settings` | Admin settings | Admin-protected |
| `/faculties` | Manage faculty | Admin-protected |
| `/faculties/:id/settings` | Faculty settings | Admin-protected |
| `/settings` | Admin's own settings | Admin-protected |
| `/faculty/login` | Faculty login | Public |
| `/faculty/set-password/:token` | Faculty password setup | Public |
| `/faculty/portal` | Faculty portal (assignments, submissions, students) | Faculty-protected |

> Because this is a client-side-routed SPA on a static host, all of the above paths depend on the host rewriting unknown paths to `/index.html` (see `frontend/public/_redirects` and the Render "Redirects/Rewrites" rule) — otherwise direct navigation/refresh on any non-root path 404s at the host level.

---

## QR Attendance Flow

1. An admin/faculty opens **Generate QR** for a batch → `POST /api/qr/batch/:batchId/generate`. The backend creates a `qr_sessions` row with a random `session_token` and an `expires_at` based on the batch's `qr_validity_minutes`, and returns a QR code (image) encoding a URL like `/scan/:token`.
2. Students scan the QR with their phone camera, which opens `/scan/:token` in the frontend (`ScanAttendance.jsx`).
3. The page polls `GET /api/qr/:token/status` (public) to confirm the session is still valid/active.
4. The student submits their details via `POST /api/qr/:token/submit` (public). The backend:
   - Validates the session hasn't expired.
   - Matches the student against the batch's student list.
   - Enforces a **cooldown**: at most 2 submissions per device per 15 minutes (tracked in `qr_submissions` via `device_token`), to reduce proxy/duplicate submissions.
   - Inserts/updates the `attendance` row for that student+date with `method = 'qr'`.
5. Admin/faculty can view a live/summary report of who has checked in via `GET /api/qr/:sessionId/report`, and download it via `GET /api/qr/:sessionId/download`.
6. Any student missed by QR (didn't scan, technical issue, etc.) can be corrected manually via **Edit Attendance** (`/api/attendance/batch/:batchId`), recorded with `method = 'manual'`.

---

## Assignments Flow

1. Faculty creates an assignment for one of their assigned batches (`POST /api/faculty-portal/batches/:batchId/assignments`), uploading a PDF via Multer. The file is pushed to **Google Drive** (`googleDrive.js`) and the Drive file ID/URL is stored in the `assignments` table.
2. Students see assignments for their batch via `GET /api/student-auth/assignments`.
3. Students submit their work via `POST /api/student-auth/assignments/:assignmentId/submit`, also uploaded to Google Drive, recorded in `assignment_submissions`.
4. Faculty reviews submissions (`GET /api/faculty-portal/assignments/:id/submissions`) and grades them (`PATCH /api/faculty-portal/submissions/:id`), setting a `status` (`completed`/`incomplete`) and optional `remark`.

---

## Environment Variables

Backend (`backend/.env`):

| Variable | Purpose |
|---|---|
| `PORT` | Port the Express server listens on (Render sets this automatically in production) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign/verify JWTs |
| `NODE_ENV` | `development` / `production` |
| `FRONTEND_URL` | The deployed frontend origin, used for CORS allow-list |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Outgoing email (SMTP) credentials |
| `CONTACT_RECEIVER_EMAIL` | Where contact-form submissions are sent |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Google OAuth credentials for Drive API access |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Root Drive folder under which assignment/submission files are stored |

Frontend: uses a Vite env variable (check `frontend/src/api/client.js`) to point to the deployed backend's base API URL, e.g. `VITE_API_URL`.

> **Note:** Never commit real secrets to version control. Rotate any credentials that may have been exposed via a committed `.env` file.

---

## Local Development Setup

### Prerequisites
- Node.js (LTS)
- A PostgreSQL database
- (Optional, for full functionality) SMTP credentials and a Google Cloud project with Drive API + OAuth credentials

### Backend

```bash
cd backend
npm install
# create/populate .env using the table above
node run-schema.js          # or: psql $DATABASE_URL -f src/config/schema.sql
node seed-superadmin.js     # creates the first super_admin account
npm run dev                 # nodemon src/index.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev                 # starts Vite dev server on port 3000
```

The frontend dev server proxies/points to the backend via its API client config — set the appropriate `VITE_API_URL` (or equivalent) to `http://localhost:5000` (or your backend's `PORT`).

---

## Deployment (Render)

The app is deployed as **two separate Render services**:

1. **Frontend — Static Site**
   - Build command: `npm install && npm run build` (from `frontend/`)
   - Publish directory: `frontend/dist`
   - **SPA routing fix**: since the app uses `BrowserRouter`, Render must rewrite all unmatched paths to `index.html`, otherwise direct navigation to any nested route (e.g. `/student/login`) 404s. This is handled via:
     - `frontend/public/_redirects` containing: `/*    /index.html   200`, **and/or**
     - Render Dashboard → Static Site → **Redirects/Rewrites** tab → rule `/*` → `/index.html` (Rewrite)

2. **Backend — Web Service**
   - Build command: `npm install` (from `backend/`)
   - Start command: `npm start` (`node src/index.js`)
   - All environment variables from the table above configured in the Render service's **Environment** tab.
   - Connected to a managed PostgreSQL instance (`DATABASE_URL`).

`FRONTEND_URL` on the backend must exactly match the deployed frontend origin, since CORS is strictly allow-listed.

---

## Known Utility / Migration Scripts

Located at the root of `backend/` — run manually against the target database when needed (no automated migration runner is used):

- `seed-superadmin.js` — creates the initial super admin account.
- `run-schema.js` — applies `src/config/schema.sql` to the database.
- `migrate-add-*.js` (sms-notifications, student-created-by, admin-password-reset, submission-names, email-notifications, student-auth, batch-archive, faculty) — incremental schema changes, each corresponding to a feature added after the initial schema.
- `migrate-urn-citext.js`, `migrate-urn-strip-whitespace.js`, `migrate-urn-per-batch-unique.js` — fixes/changes to how student URNs are stored/validated.
- `migrate-timestamptz.js` — timestamp column type migration.
- `check-schema.js`, `check-students-schema.js`, `check-qr-schema.js`, `check-db.js`, `check-admins.js` — inspection scripts to verify current DB state.
- `get-google-refresh-token.js` — one-time helper to obtain a Google OAuth refresh token for Drive access.
- `test-*.js` (student-crud, batch-crud, qr-flow, reports, qr-download, login, admin-crud, attendance-edit) — manual/ad-hoc test scripts exercising the API end-to-end (not a formal test suite/framework).

> **Recommendation:** Since there's no formal migration framework, when working with a new environment, run `schema.sql` first, then apply the `migrate-*.js` scripts **in the order that matches when features were added** (check each script for `IF NOT EXISTS` guards before assuming safe re-runs).
