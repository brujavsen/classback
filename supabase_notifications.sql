-- ============================================
-- ClassBack v1.0.0 - Migration: Notifications
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('new_post', 'new_comment', 'new_reply')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete cascade,
  space_name text,
  actor_username text,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Anyone can insert notifications" on public.notifications
  for insert with check (true);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

create policy "Users can delete own notifications" on public.notifications
  for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.notifications;
