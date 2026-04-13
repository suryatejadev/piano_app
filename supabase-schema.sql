-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Practice sessions table
create table practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  section text not null,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  duration_seconds int not null default 0,
  practiced_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- Index for fast queries
create index idx_sessions_user_date on practice_sessions(user_id, practiced_at);
create index idx_sessions_user_section on practice_sessions(user_id, section);

-- Row Level Security
alter table practice_sessions enable row level security;

create policy "Users can read own sessions"
  on practice_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on practice_sessions for insert
  with check (auth.uid() = user_id);
