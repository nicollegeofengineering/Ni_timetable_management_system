# College Timetable System — Phase 1 Setup

## 1. Backend

```
cd server
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — local or Atlas connection string
- `JWT_SECRET` — any long random string
- `ADMIN_EMAIL` — the one email allowed to log in
- `SMTP_USER` / `SMTP_PASS` — Gmail address + [App Password](https://myaccount.google.com/apppasswords) (not your normal password)

Create the single admin record, then start the API:

```
npm run seed
npm run dev
```

Runs on `http://localhost:5000`.

## 2. Frontend

```
cd client
npm install
cp .env.local.example .env.local
npm run dev
```

Runs on `http://localhost:3000`. Visiting `/` redirects to `/login`.

## 3. Test the OTP flow

1. Go to `http://localhost:3000/login`
2. Enter the `ADMIN_EMAIL` you set in `.env`
3. Check that inbox for the 6-digit OTP
4. Enter it — you land on `/dashboard` with sidebar + navbar + stat cards

Cookie-based JWT session lasts 7 days (`COOKIE_NAME` in `.env`).

## What's built (Phase 1)

- Express + MongoDB backend, single hardcoded admin
- Email OTP login (5 min expiry, 60s resend cooldown, 5 wrong-attempt lockout, rate limiting on both endpoints)
- httpOnly JWT cookie session, `/api/auth/me` guard
- Next.js dashboard shell: sidebar (all Phase 2+ nav links stubbed in), navbar, stat cards
- Dashboard stat cards call `/api/dashboard/stats`, which doesn't exist yet — cards show `--` until Phase 2 wires up Departments/Staff/Subjects/Halls/Academic Year/Timetable counts

## Not yet built

Everything module-specific: Departments, Staff, Subjects, Halls, Academic Years, Master Timetable, conflict detection, exports, Settings page. That's Phases 2–4 from the spec.
