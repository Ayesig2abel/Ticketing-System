-- ============================================================
-- kabsTech Helpdesk — Supabase schema
-- Run this entire file in Supabase SQL Editor → New Query
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── Tickets ────────────────────────────────────────────────
create table if not exists tickets (
  id            text primary key,
  subject       text not null,
  details       text,
  customer      text not null,
  email         text not null,
  agent         text not null default 'Unassigned',
  agent_avatar  text not null default 'UA',
  agent_color   text not null default '#9ca3af',
  category      text not null,
  subcategory   text,
  sub_subcategory text,
  status        text not null default 'Open',
  priority      text not null default 'Medium',
  source        text not null default 'Web',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Ticket Comments ────────────────────────────────────────
create table if not exists ticket_comments (
  id         text primary key,
  ticket_id  text not null references tickets(id) on delete cascade,
  author     text not null,
  role       text not null check (role in ('agent','customer')),
  text       text not null,
  created_at timestamptz not null default now()
);

-- ─── Ticket Attachments ─────────────────────────────────────
create table if not exists ticket_attachments (
  id         text primary key,
  ticket_id  text not null references tickets(id) on delete cascade,
  name       text not null,
  size       integer not null,
  type       text not null,
  -- For now storing as data URL (same as in-memory model).
  -- Swap for a Supabase Storage path once you set up a bucket.
  data_url   text not null,
  created_at timestamptz not null default now()
);

-- ─── Assets ─────────────────────────────────────────────────
create table if not exists assets (
  id               text primary key,
  name             text not null,
  type             text not null,
  make             text not null,
  model            text not null,
  serial_number    text,
  status           text not null default 'Active',
  assigned_to      text,
  assigned_name    text,
  department       text,
  purchase_date    text,
  warranty_expiry  text,
  notes            text,
  last_seen        text,
  linked_ticket_ids text[] default '{}',
  date_added       text not null
);

-- ─── Knowledge Base Articles ─────────────────────────────────
create table if not exists kb_articles (
  id         text primary key,
  title      text not null,
  content    text not null,
  category   text not null,
  tags       text[] default '{}',
  author     text not null,
  pinned     boolean not null default false,
  views      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Row Level Security ──────────────────────────────────────
-- For now we allow all operations from the anon key (matching
-- the current app's no-real-auth-yet model). Tighten these
-- once you migrate to Supabase Auth in a later step.

alter table tickets           enable row level security;
alter table ticket_comments   enable row level security;
alter table ticket_attachments enable row level security;
alter table assets            enable row level security;
alter table kb_articles       enable row level security;

create policy "allow all for now" on tickets            for all using (true) with check (true);
create policy "allow all for now" on ticket_comments    for all using (true) with check (true);
create policy "allow all for now" on ticket_attachments for all using (true) with check (true);
create policy "allow all for now" on assets             for all using (true) with check (true);
create policy "allow all for now" on kb_articles        for all using (true) with check (true);

-- ─── Realtime ────────────────────────────────────────────────
-- Lets the app receive live updates when tickets change (e.g.
-- a WhatsApp ticket arrives while an agent is looking at the list).
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table ticket_comments;
