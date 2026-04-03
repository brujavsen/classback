-- ============================================
-- ClassBack v1.0.0 - Migration: Feed System
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

-- 1. TABLA: posts
-- Almacena publicaciones (imágenes o PDFs) subidas en un espacio
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_url text not null,
  file_type text not null check (file_type in ('image', 'pdf')),
  caption text,
  created_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "Anyone can view posts" on public.posts
  for select using (true);

create policy "Authenticated users can insert posts" on public.posts
  for insert with check (auth.uid() = user_id);

-- Admin puede borrar cualquier post; usuarios solo los propios
create policy "Users can delete posts" on public.posts
  for delete using (
    auth.uid() = user_id
    OR exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- 2. TABLA: comments
-- Almacena comentarios y respuestas anidadas (parent_id = null → raíz)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  parent_id uuid references public.comments(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

create policy "Anyone can view comments" on public.comments
  for select using (true);

create policy "Authenticated users can comment" on public.comments
  for insert with check (auth.uid() = user_id);

-- Admin puede borrar cualquier comentario; usuarios solo los propios
create policy "Users can delete comments" on public.comments
  for delete using (
    auth.uid() = user_id
    OR exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- 3. TABLA: reactions
-- Cada usuario puede tener UNA reacción por post y UNA por comentario
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  -- 1 reacción por usuario por post
  unique (user_id, post_id),
  -- 1 reacción por usuario por comentario
  unique (user_id, comment_id)
);

alter table public.reactions enable row level security;

create policy "Anyone can view reactions" on public.reactions
  for select using (true);

create policy "Authenticated users can react" on public.reactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own reactions" on public.reactions
  for update using (auth.uid() = user_id);

create policy "Users can delete their own reactions" on public.reactions
  for delete using (auth.uid() = user_id);


-- 4. HABILITAR REALTIME para las nuevas tablas
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.reactions;
