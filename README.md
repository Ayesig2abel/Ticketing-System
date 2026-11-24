# kabsTech Helpdesk

React helpdesk for tickets, agents, assets, knowledge base, and messenger bots. The UI talks to **Supabase** for auth and data. A small **Express** server on port **8787** holds secrets (Anthropic API key, Supabase service role) and proxies invites, deletes, chat, and WhatsApp intake.

There is no other getting-started guide in this repo. This document is the local runbook: environment, database, how to start both processes, and what to do when login, invites, or bots fail.

## Architecture

```
Browser (Vite, usually http://localhost:5173)
  ├── Supabase (anon/publishable key) → Auth, Postgres, Realtime
  └── /api/*  ──Vite proxy──►  Express (http://localhost:8787)
                                 ├── Anthropic Messages API (messenger bots)
                                 ├── Supabase Auth Admin (invite / delete users)
                                 └── Twilio WhatsApp webhook + in-memory queue
```

`npm run dev` starts only Vite. Invites, account deletes, WhatsApp tickets, and (for some pages) AI chat need the Express process as well. Use `npm run dev:all`.

## Prerequisites

- Node.js 18 or newer
- npm (this tree already includes `node_modules` if you copied the full folder)
- A [Supabase](https://supabase.com) project
- Optional: an [Anthropic](https://console.anthropic.com/settings/keys) API key (messenger bots)
- Optional: Twilio WhatsApp sandbox + a public tunnel such as ngrok (incoming tickets from WhatsApp)

## Setup

### 1. Install dependencies

From the project root (`Final Product`):

```bash
npm install
```

### 2. Frontend environment (project root)

Copy `.env.example` to `.env` and fill in values from **Supabase Dashboard → Settings → API**:

| Variable | Where it comes from |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Publishable / anon key (`sb_publishable_…` or the legacy `anon` JWT) |

The client reads these in `src/app/lib/supabase.ts`. If either is missing, the app throws on load.

Do **not** put the service role key in this file.

Vite only picks up `VITE_*` variables at **startup**. Restart the dev server after editing `.env`.

### 3. Backend environment (`server/.env`)

Copy `server/.env.example` to `server/.env`:

| Variable | Required for | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Messenger bots | `sk-ant-…` |
| `PORT` | Express listen port | Default `8787` |
| `SUPABASE_URL` | Invite / delete agent or user | Same URL as the frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Invite / delete agent or user | Secret. Never prefix with `VITE_` |

The server loads `server/.env` by absolute path, so it works whether you run `npm run server` from the repo root or `node server/index.js`.

### 4. Database schema

In the Supabase SQL Editor, run **`supabase-schema-v2.sql`** (not the older `supabase-schema.sql`). v2 adds `profiles`, `agents`, `managed_users`, RLS stubs, realtime on tickets, and a trigger that creates a `profiles` row when an Auth user is created.

The app treats end users as role **`customer`**. v2’s check constraint only allows `'admin' | 'agent' | 'user'`. After applying v2, run this so sign-up and user management match the UI:

```sql
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'agent', 'user', 'customer'));
```

If `alter publication supabase_realtime add table tickets` errors because the table is already in the publication, you can ignore that line.

### 5. Auth URLs in Supabase

**Authentication → URL configuration:**

- **Site URL:** `http://localhost:5173`
- **Redirect URLs** (add all of these for local work):
  - `http://localhost:5173/`
  - `http://localhost:5173/forgot-password`
  - `http://localhost:5173/dashboard`

Invite and recovery emails land on `/forgot-password`, which reads the hash token and lets the person set a password.

For local development, either:

- disable **Confirm email** under Authentication → Providers → Email, or
- configure SMTP so confirmation and invite emails actually arrive.

Without one of those, new accounts stay unusable.

### 6. First admin

Self-register at `/register` (creates Auth user + `profiles` row with role `customer`). Then promote yourself in SQL:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Sign out and sign in again so `AuthContext` reloads the role. Admin-only routes are `/agents`, `/users`, and `/settings`.

## Usage

### Start the app

```bash
npm run dev:all
```

That runs Express and Vite together (`concurrently`). Open the URL Vite prints (typically `http://localhost:5173`).

| Script | What it starts |
| --- | --- |
| `npm run dev` | Vite only (UI + `/api` proxy if Express is already up) |
| `npm run server` | Express only on `http://localhost:8787` |
| `npm run dev:all` | Both (what you want day to day) |
| `npm run build` | Production Vite bundle |

Confirm the backend log shows `Chat proxy server running at http://localhost:8787`. Warnings about missing keys mean bots or invites will fail until `server/.env` is complete.

### Day-to-day flows

1. **Log in** at `/` with a user that has a `profiles` row and `is_active = true`.
2. **Customers** use dashboard, raise ticket, my tickets, messenger, knowledge base.
3. **Agents** also get `/tickets` and `/assets`.
4. **Admins** invite people from **Agents** and **Users**. Those pages `POST` to `/api/invite-agent` and `/api/invite-user`. The server calls Supabase Auth **invite**, which emails a link. The invitee opens the link, lands on `/forgot-password`, sets a password, then logs in.
5. **Messenger bots** (`Support Bot`, `Billing Agent`, `Routing Bot`) `POST` to `http://localhost:8787/api/chat`. They need `ANTHROPIC_API_KEY`.
6. **WhatsApp intake** (optional): Settings page documents ngrok + Twilio. Incoming webhooks hit `POST /api/whatsapp/webhook`. The UI polls `http://localhost:8787/api/whatsapp/pending` and turns messages into tickets. The queue is **in memory** and is cleared when Express restarts.

Vite proxies same-origin `/api/*` to port 8787. Messenger and WhatsApp polling currently call `localhost:8787` directly, so Express must be running even if you only opened the Vite URL.

## Troubleshooting

**Blank screen / “Missing Supabase credentials”**  
Root `.env` is missing, misnamed, or you used `SUPABASE_URL` instead of `VITE_SUPABASE_URL`. Restart Vite after fixing it.

**Login succeeds then you bounce back to login, or “suspended or its profile setup failed”**  
Auth worked but `profiles` is missing, `is_active` is false, or the trigger never ran. Check `auth.users` vs `public.profiles` for that UUID. Re-run the `handle_new_user` trigger from v2, or insert the profile row by hand.

**Register / invite fails with a check constraint on `profiles.role`**  
The UI writes `customer`; v2 SQL only allowed `user`. Apply the `profiles_role_check` alter from Setup step 4.

**Cannot open `/agents`, `/users`, `/settings`**  
Your `profiles.role` is not `admin`. Promote with the SQL update in Setup step 6, then log in again.

**Invite or delete returns 500 about `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`**  
Those belong in `server/.env`, not the root `.env`. Restart Express after editing. Confirm the terminal that ran `npm run server` has no warning about those variables.

**Invite email never arrives**  
Supabase Auth needs working email (built-in testing limits or custom SMTP). Confirm redirect URLs include `/forgot-password`. Check Authentication → Users for an invited user even if mail failed.

**`/api/invite-agent` 404 in the browser Network tab**  
Only Vite is running. Start `npm run dev:all` (or `npm run server` in a second terminal).

**Bots: “Server is missing ANTHROPIC_API_KEY” or 502**  
Put a real `sk-ant-…` key in `server/.env`. A publishable Supabase key will not work here. Watch the Express console for Anthropic error bodies.

**CORS / failed fetch to `localhost:8787` from the UI**  
Express is down, or `PORT` is not `8787`. Messenger and WhatsApp poll that host directly (they do not use the Vite proxy).

**WhatsApp tickets vanish after a restart**  
Expected: `pendingWhatsappTickets` is in-memory only. Keep Express running while testing; ngrok must target **8787**, webhook path `/api/whatsapp/webhook`.

**Realtime ticket updates do not show**  
Confirm the publication lines in v2 succeeded. Replication is off unless the table is in `supabase_realtime`.

**Google sign-in does nothing useful**  
`loginWithGoogle` is wired, but you still need Google enabled in Supabase Auth and matching redirect URLs. Email/password is the supported local path.

**Two schema files — which one?**  
Use **v2**. v1 has tickets/assets/KB only and no `profiles` trigger. Running v1 first then v2 is OK (`create table if not exists`); still apply the role-check fix.

## Security notes

- Service role and Anthropic keys stay in `server/.env` only.
- RLS is currently `allow all for now` on every table. Treat the anon key as able to read/write all app tables until you tighten policies.
- Do not commit `.env` or `server/.env`.
