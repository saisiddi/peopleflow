# Dayflow 👥

**Dayflow** is a Human Resource Management System (HRMS) — every workday, perfectly aligned.

Built for an overnight hackathon: React + Vite + Tailwind frontend, FastAPI backend, Supabase (Postgres + Auth + Realtime).

## The differentiator — GPS geofence exit detection

Entry attendance comes from the company's existing fingerprint scanners (simulated for the demo via an admin button). **Exit is where Dayflow innovates**: instead of a manual check-out button people forget to press, the app polls the employee's GPS position, detects when they leave the office radius (haversine distance vs. configurable geofence), waits a 15-minute grace window to filter out lunch runs, then auto-marks the exit — client-side timer **plus** a server-side finalize loop that covers closed tabs.

## Modules

- Auth (Supabase) — sign up/in, roles: Employee and Admin/HR
- Employee & Admin dashboards
- Attendance — daily/weekly views, live geofence indicator, entry/exit source tags
- Leave & time-off — apply → approve/reject with comments, realtime status sync (Supabase Realtime), approved leave auto-marks attendance `on_leave`
- Profiles — view + role-limited edit
- Payroll — read-only for employees, editable for admins (net = base + allowances − deductions), seeded data

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Update the `office_location` row with your demo coordinates and radius

### 2. Backend (`/backend`)
```bash
python -m pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
uvicorn app.main:app --reload
```

### 3. Frontend (`/frontend`)
```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm run dev
```

### Demo flow
1. Sign up an Admin account (choose "Admin / HR" on the sign-up form) and an Employee account
2. Admin → Overview → "Simulate Fingerprint Punch" for the employee (= production biometric webhook)
3. Employee dashboard shows live state: Present → walk away (or spoof GPS in dev tools) → *Pending exit* pulsing amber → auto *Checked out* after the grace window
4. Employee applies for leave → admin approves → employee's dashboard updates instantly (no refresh)

## Status

🚧 Hackathon build — see PRD for out-of-scope items (real biometrics, native apps, payroll tax, payslips).
