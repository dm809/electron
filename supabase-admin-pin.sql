-- ═══════════════════════════════════════════════
--  ELEKTRON — вход по PIN (запусти после supabase-setup.sql)
--  SQL Editor → New query → Run
-- ═══════════════════════════════════════════════

create table if not exists public.admin_secrets (
  id int primary key default 1 check (id = 1),
  pin text not null default '472891'
);

insert into public.admin_secrets (id, pin) values (1, '472891')
on conflict (id) do nothing;

create or replace function public.admin_check_pin(p_pin text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_secrets where id = 1 and pin = p_pin
  );
$$;

create or replace function public.admin_get_reviews(p_pin text, p_status text)
returns setof public.reviews
language plpgsql
security definer
set search_path = public
as $$
begin
  if not admin_check_pin(p_pin) then
    raise exception 'invalid pin';
  end if;
  return query
    select * from public.reviews
    where status = p_status
    order by created_at desc;
end;
$$;

create or replace function public.admin_set_status(p_pin text, p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not admin_check_pin(p_pin) then
    raise exception 'invalid pin';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status';
  end if;
  update public.reviews set status = p_status where id = p_id;
end;
$$;

create or replace function public.admin_delete_review(p_pin text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not admin_check_pin(p_pin) then
    raise exception 'invalid pin';
  end if;
  delete from public.reviews where id = p_id;
end;
$$;

grant execute on function public.admin_check_pin(text) to anon, authenticated;
grant execute on function public.admin_get_reviews(text, text) to anon, authenticated;
grant execute on function public.admin_set_status(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_delete_review(text, uuid) to anon, authenticated;

-- PIN по умолчанию: 472891
-- Сменить: Table Editor → admin_secrets → pin
