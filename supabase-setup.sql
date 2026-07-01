-- ═══════════════════════════════════════════════
--  ELEKTRON — настройка отзывов в Supabase
--  supabase.com → New project → SQL Editor → вставь и Run
-- ═══════════════════════════════════════════════

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating smallint not null check (rating between 1 and 5),
  text text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists reviews_status_idx on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "reviews_insert_pending" on public.reviews;
drop policy if exists "reviews_select_approved" on public.reviews;
drop policy if exists "reviews_select_admin" on public.reviews;
drop policy if exists "reviews_update_admin" on public.reviews;
drop policy if exists "reviews_delete_admin" on public.reviews;

-- Клиенты могут только отправить отзыв (статус pending)
create policy "reviews_insert_pending"
  on public.reviews for insert
  to anon, authenticated
  with check (status = 'pending');

-- Все видят только одобренные отзывы
create policy "reviews_select_approved"
  on public.reviews for select
  to anon
  using (status = 'approved');

-- Админ (вошёл по email) видит все
create policy "reviews_select_admin"
  on public.reviews for select
  to authenticated
  using (true);

-- Админ может одобрить или отклонить
create policy "reviews_update_admin"
  on public.reviews for update
  to authenticated
  using (true)
  with check (status in ('approved', 'rejected'));

-- Админ может удалить
create policy "reviews_delete_admin"
  on public.reviews for delete
  to authenticated
  using (true);

-- После SQL:
-- 1. Settings → API → скопируй URL и anon public key в js/config.js
-- 2. Authentication → Users → Add user (твой email + пароль для входа в admin.html)
