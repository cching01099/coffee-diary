-- Run this once in Supabase Dashboard → SQL Editor → New query.

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  bean text,
  roast text,
  art text,
  note text,
  photo text,
  photo_thumb text,
  photo_position text,
  photo_zoom numeric,
  created_at timestamptz not null default now()
);
create index entries_user_date_idx on public.entries (user_id, date_key);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
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

-- maps a LINE user (sub claim) to the Supabase auth user created for them.
-- Written only by api/line-auth-callback.js via the service role key, since
-- LINE Login is handled by our own backend rather than Supabase's built-in
-- OIDC support (LINE's web login signs ID tokens with HS256, which mismatches
-- the ES256 its discovery document advertises and breaks Supabase's OIDC client).
create table public.line_identities (
  line_sub text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- public profile info shown on community posts/replies — auth.users itself
-- isn't queryable from the client, so this mirrors the bits we need to show.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text
);

-- community forum: posts, likes, replies. Posts/replies reference
-- public.profiles (rather than auth.users directly) so PostgREST can embed
-- author info in one query, e.g. `.select('*, profiles(display_name)')`.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  content text,
  photos text[] not null default '{}',
  photo_thumbs text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint posts_photos_limit check (array_length(photos, 1) is null or array_length(photos, 1) <= 5),
  constraint posts_photo_thumbs_limit check (array_length(photo_thumbs, 1) is null or array_length(photo_thumbs, 1) <= 5)
);
create index posts_created_at_idx on public.posts (created_at desc);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index post_replies_post_id_idx on public.post_replies (post_id, created_at);

-- one row per like/reply someone else made on your post — populated only by
-- the triggers below (not directly insertable), so notifications can't be
-- spoofed by inserting a fake "so-and-so liked your post" row.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(user_id) on delete cascade,
  actor_id uuid not null references public.profiles(user_id) on delete cascade,
  type text not null check (type in ('like', 'reply')),
  post_id uuid not null references public.posts(id) on delete cascade,
  reply_id uuid references public.post_replies(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

alter table public.entries enable row level security;
alter table public.purchases enable row level security;
alter table public.user_options enable row level security;
alter table public.line_identities enable row level security;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_replies enable row level security;
alter table public.notifications enable row level security;

create policy "own entries" on public.entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own purchases" on public.purchases for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own options" on public.user_options for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- community forum is public: anyone (including signed-out visitors) can read,
-- but writes are restricted to the row's own owner.
create policy "profiles are publicly readable" on public.profiles for select using (true);
create policy "own profile" on public.profiles for update using (auth.uid() = user_id);

create policy "posts are publicly readable" on public.posts for select using (true);
create policy "own posts insert" on public.posts for insert with check (auth.uid() = user_id);
create policy "own posts update" on public.posts for update using (auth.uid() = user_id);
create policy "own posts delete" on public.posts for delete using (auth.uid() = user_id);

create policy "likes are publicly readable" on public.post_likes for select using (true);
create policy "own likes insert" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "own likes delete" on public.post_likes for delete using (auth.uid() = user_id);

create policy "replies are publicly readable" on public.post_replies for select using (true);
create policy "own replies insert" on public.post_replies for insert with check (auth.uid() = user_id);
create policy "own replies delete" on public.post_replies for delete using (auth.uid() = user_id);

-- notifications are private — only the recipient can see or mark them read.
-- No insert policy: rows are only ever created by the trigger functions
-- below, which run as security definer and bypass RLS.
create policy "own notifications select" on public.notifications for select using (auth.uid() = recipient_id);
create policy "own notifications update" on public.notifications for update using (auth.uid() = recipient_id);

-- "Automatically expose new tables" was left off when the project was created,
-- so the authenticated role needs these grants — RLS alone isn't enough,
-- Postgres checks table-level GRANTs before it ever evaluates a row policy.
grant select, insert, update, delete on public.entries to authenticated;
grant select, insert, update, delete on public.purchases to authenticated;
grant select, insert, update, delete on public.user_options to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, delete on public.post_replies to authenticated;
grant select, update on public.notifications to authenticated;

-- the community forum is readable while signed out too
grant select on public.profiles to anon;
grant select on public.posts to anon;
grant select on public.post_likes to anon;
grant select on public.post_replies to anon;

-- "Automatically expose new tables" doesn't cover Realtime either — a table
-- has to be explicitly added to this publication or postgres_changes
-- subscribers (the post detail page's live like/reply updates) never
-- receive anything for it, even though the subscribe() call itself succeeds.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_likes'
  ) then
    alter publication supabase_realtime add table public.post_likes;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_replies'
  ) then
    alter publication supabase_realtime add table public.post_replies;
  end if;
end $$;

-- service_role bypasses RLS but still needs the same table-level GRANT —
-- required by one-off maintenance scripts (e.g. scripts/backfill-photo-thumbs.mjs)
-- and by api/line-auth-callback.js, which both use the service role key
-- instead of a logged-in user's session.
grant select, update on public.entries to service_role;
grant select, insert on public.line_identities to service_role;

-- auto-create a default options row + public profile whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_options (user_id) values (new.id);
  insert into public.profiles (user_id, display_name, avatar_url)
    values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill profiles for users who signed up before this trigger existed —
-- posts.user_id references profiles(user_id), so without this they can't post
insert into public.profiles (user_id, display_name, avatar_url)
select id, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (user_id) do nothing;

-- auto-create a notification when someone (other than the post's own
-- author) likes or replies to a post — done via trigger rather than in
-- application code so it can't be forgotten/bypassed from any client.
-- Unliking doesn't retract the notification; that's an intentional
-- simplification, same as most apps.
create or replace function public.notify_on_like()
returns trigger as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner is distinct from new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (post_owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_post_like_created
  after insert on public.post_likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_reply()
returns trigger as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner is distinct from new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id, reply_id)
    values (post_owner, new.user_id, 'reply', new.post_id, new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_post_reply_created
  after insert on public.post_replies
  for each row execute function public.notify_on_reply();

-- Storage: coffee-photos bucket, path format is "<user_id>/<filename>"
-- Select is required even though the bucket is public — public only lets
-- anyone download a file by its known URL, bypassing RLS on that one path.
-- Management operations like remove()/list() still query storage.objects
-- through normal RLS, so without this, the app can upload/replace its own
-- files but can never find them again to delete/list — remove() just
-- silently matches nothing (200 OK, empty result, no error).
create policy "users can view their own coffee photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can upload their own coffee photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can update their own coffee photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own coffee photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'coffee-photos' and (storage.foldername(name))[1] = auth.uid()::text);
