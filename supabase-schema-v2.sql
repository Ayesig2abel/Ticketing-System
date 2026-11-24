-- ============================================================
-- kabsTech — Schema v2 (run in Supabase SQL Editor)
-- Run the DROP block first if you need a clean slate
-- ============================================================

-- Optional: drop everything and start clean
-- drop table if exists ticket_attachments cascade;
-- drop table if exists ticket_comments cascade;
-- drop table if exists tickets cascade;
-- drop table if exists assets cascade;
-- drop table if exists kb_articles cascade;
-- drop table if exists agents cascade;
-- drop table if exists managed_users cascade;
-- drop table if exists profiles cascade;

-- ─── Profiles (linked to Supabase Auth) ─────────────────────
create table if not exists profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  email      text not null unique,
  name       text not null,
  role       text not null default 'user' check (role in ('admin','agent','user')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Tickets ────────────────────────────────────────────────
create table if not exists tickets (
  id                text primary key,
  subject           text not null,
  details           text,
  customer          text not null,
  email             text not null,
  agent             text not null default 'Unassigned',
  agent_avatar      text not null default 'UA',
  agent_color       text not null default '#9ca3af',
  category          text not null,
  subcategory       text,
  sub_subcategory   text,
  status            text not null default 'Open',
  priority          text not null default 'Medium',
  source            text not null default 'Web',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
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
  data_url   text not null,
  created_at timestamptz not null default now()
);

-- ─── Assets ─────────────────────────────────────────────────
create table if not exists assets (
  id                  text primary key,
  name                text not null,
  type                text not null,
  make                text not null,
  model               text not null,
  serial_number       text,
  status              text not null default 'Active',
  assigned_to         text,
  assigned_name       text,
  department          text,
  purchase_date       text,
  warranty_expiry     text,
  notes               text,
  last_seen           text,
  linked_ticket_ids   text[] default '{}',
  date_added          text not null
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

-- ─── Agents ─────────────────────────────────────────────────
create table if not exists agents (
  id           text primary key,
  name         text not null,
  email        text not null unique,
  avatar       text not null default 'AG',
  color        text not null default '#5f63f2',
  role         text not null default 'L1 Support',
  status       text not null default 'Active',
  department   text not null default 'Operations',
  queue        text not null default 'General Queue',
  category     text not null default 'General Inquiry',
  last_active  text not null default 'Never',
  date_added   text not null,
  permissions  jsonb not null default '{"raiseOnBehalf":false,"closeTickets":false,"viewAllQueues":false,"viewAssignedOnly":true}'::jsonb
);

-- ─── Managed Users (customers) ──────────────────────────────
create table if not exists managed_users (
  id                      text primary key,
  name                    text not null,
  email                   text not null unique,
  phone                   text default '',
  address                 text default '',
  employer_id             text default '',
  department              text default 'Operations',
  status                  text not null default 'Active',
  date_registered         text not null,
  assigned_agent          text default 'Support Bot',
  assigned_agent_color    text default '#5f63f2',
  assigned_agent_initials text default 'SB',
  avatar                  text default 'U',
  color                   text default '#9ca3af'
);

-- ─── Row Level Security ──────────────────────────────────────
alter table profiles          enable row level security;
alter table tickets           enable row level security;
alter table ticket_comments   enable row level security;
alter table ticket_attachments enable row level security;
alter table assets            enable row level security;
alter table kb_articles       enable row level security;
alter table agents            enable row level security;
alter table managed_users     enable row level security;

-- Allow all operations for now (tighten once auth is fully live)
do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='allow all for now') then
    create policy "allow all for now" on profiles for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='tickets' and policyname='allow all for now') then
    create policy "allow all for now" on tickets for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='ticket_comments' and policyname='allow all for now') then
    create policy "allow all for now" on ticket_comments for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='ticket_attachments' and policyname='allow all for now') then
    create policy "allow all for now" on ticket_attachments for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='assets' and policyname='allow all for now') then
    create policy "allow all for now" on assets for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='kb_articles' and policyname='allow all for now') then
    create policy "allow all for now" on kb_articles for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='agents' and policyname='allow all for now') then
    create policy "allow all for now" on agents for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='managed_users' and policyname='allow all for now') then
    create policy "allow all for now" on managed_users for all using (true) with check (true);
  end if;
end $$;

-- ─── Realtime ────────────────────────────────────────────────
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table ticket_comments;

-- ─── Auto-create profile on signup ──────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
