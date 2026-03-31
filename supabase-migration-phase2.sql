-- ============================================================
-- ClassBack — Phase 2 SQL Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. PROFILES UPDATE
-- Add avatar_url column to profiles
alter table public.profiles 
add column if not exists avatar_url text;

-- ============================================================

-- 2. USER_SPACES
-- Junction table for "joined" or "selected" spaces
create table if not exists public.user_spaces (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  space_id   uuid not null references public.spaces(id) on delete cascade,
  class_id   uuid not null references public.classes(id) on delete cascade,
  joined_at  timestamptz default now(),
  unique(user_id, space_id)
);

alter table public.user_spaces enable row level security;

-- Users can view their own selected spaces
create policy "Users can view own joined spaces" on public.user_spaces
  for select using (auth.uid() = user_id);

-- Admins can view all selections in their classes (optional, but useful)
create policy "Admins can view class selections" on public.user_spaces
  for select using (
    auth.uid() = (select admin_id from public.classes where id = class_id)
  );

-- Users can join/leave spaces
create policy "Users can join spaces" on public.user_spaces
  for insert with check (auth.uid() = user_id);

create policy "Users can leave spaces" on public.user_spaces
  for delete using (auth.uid() = user_id);

-- ============================================================
