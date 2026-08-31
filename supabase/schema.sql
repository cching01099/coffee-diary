-- Run this once in Supabase Dashboard → SQL Editor → New query.

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null,
  bean text,
  art text,
  note text,
  photo text,
  photo_position text,
  created_at timestamptz not null default now()
);
create index entries_user_date_idx on public.entries (user_id, date_key);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null,
  bean_brand text,
  bean_weight numeric,
  bean_price numeric,
  milk_brand text,
  milk_volume numeric,
  milk_price numeric,
  created_at timestamptz not null default now()
);
create index purchases_user_date_idx on public.purchases (user_id, date_key);

-- per-user custom option chips (咖啡豆品牌 / 拉花圖案)
create table public.user_options (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bean_options text[] not null default array['星巴克','咖樂迪','超市','其他'],
  art_options text[] not null default array['無','愛心','鬱金香','天鵝','葉子','其他']
);

alter table public.entries enable row level security;
alter table public.purchases enable row level security;
alter table public.user_options enable row level security;

create policy "own entries" on public.entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own purchases" on public.purchases for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own options" on public.user_options for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- "Automatically expose new tables" was left off when the project was created,
-- so the authenticated role needs these grants — RLS alone isn't enough,
-- Postgres checks table-level GRANTs before it ever evaluates a row policy.
grant select, insert, update, delete on public.entries to authenticated;
grant select, insert, update, delete on public.purchases to authenticated;
grant select, insert, update, delete on public.user_options to authenticated;

-- auto-create a default options row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_options (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
