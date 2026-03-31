-- ============================================================
-- ClassBack — Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  role       text not null check (role in ('alumno', 'admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Users can read any profile, only update their own
create policy "Public profiles are viewable" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile skeleton on new auth user (optional trigger)
-- (We handle this in the app's signUp flow instead)

-- ============================================================

-- 2. CLASSES
create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text unique not null,
  password   text not null,
  admin_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.classes enable row level security;

-- Everyone can read classes (to join by code)
create policy "Classes are viewable" on public.classes
  for select using (true);

-- Only admins can insert their own classes
create policy "Admins can create classes" on public.classes
  for insert with check (auth.uid() = admin_id);

-- Only the admin of the class can update/delete
create policy "Admin can manage own classes" on public.classes
  for all using (auth.uid() = admin_id);

-- ============================================================

-- 3. SPACES
create table if not exists public.spaces (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

alter table public.spaces enable row level security;

create policy "Spaces are viewable" on public.spaces
  for select using (true);

create policy "Admin can manage spaces" on public.spaces
  for all using (
    auth.uid() = (select admin_id from public.classes where id = class_id)
  );

-- ============================================================

-- 4. CLASS_MEMBERS
create table if not exists public.class_members (
  id        uuid primary key default gen_random_uuid(),
  class_id  uuid not null references public.classes(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(class_id, user_id)
);

alter table public.class_members enable row level security;

create policy "Members viewable" on public.class_members
  for select using (true);

create policy "Users can join classes" on public.class_members
  for insert with check (auth.uid() = user_id);

create policy "Users can leave classes" on public.class_members
  for delete using (auth.uid() = user_id);

-- ============================================================

-- 5. MESSAGES
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text,
  image_url  text,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Messages are viewable" on public.messages
  for select using (true);

create policy "Authenticated users can send messages" on public.messages
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own messages" on public.messages
  for delete using (auth.uid() = user_id);

-- Enable Realtime on messages
alter publication supabase_realtime add table public.messages;
