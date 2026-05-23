-- =========================================================
-- DDING PLUG STYLE BETA v11 schema
-- 기존 DB가 꼬여도 덮어쓸 수 있도록 보강형으로 작성됨
-- 유지 기능: profiles, market_prices, market_price_logs, notices
-- =========================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text,
  username text,
  avatar_url text,
  email text,
  korean_nickname text,
  minecraft_id text,
  minecraft_uuid text,
  minecraft_avatar_url text,
  privacy_agreed_at timestamptz,
  privacy_policy_version text,
  mod_policy_agreed_at timestamptz,
  mod_policy_version text,
  profile_completed_at timestamptz,
  role text default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists discord_id text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists korean_nickname text;
alter table public.profiles add column if not exists minecraft_id text;
alter table public.profiles add column if not exists minecraft_uuid text;
alter table public.profiles add column if not exists minecraft_avatar_url text;
alter table public.profiles add column if not exists privacy_agreed_at timestamptz;
alter table public.profiles add column if not exists privacy_policy_version text;
alter table public.profiles add column if not exists mod_policy_agreed_at timestamptz;
alter table public.profiles add column if not exists mod_policy_version text;
alter table public.profiles add column if not exists profile_completed_at timestamptz;
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- ---------- market_prices ----------
create table if not exists public.market_prices (
  id bigserial primary key,
  item_key text unique not null,
  item_name text not null,
  category text,
  price numeric default 0,
  price_max numeric default 0,
  price_change integer,
  update_cycle text default 'daily',
  updated_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.market_prices add column if not exists item_key text;
alter table public.market_prices add column if not exists item_name text;
alter table public.market_prices add column if not exists category text;
alter table public.market_prices add column if not exists price numeric default 0;
alter table public.market_prices add column if not exists price_max numeric default 0;
alter table public.market_prices add column if not exists price_change integer;
alter table public.market_prices add column if not exists update_cycle text default 'daily';
alter table public.market_prices add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.market_prices add column if not exists checked_at timestamptz default now();
alter table public.market_prices add column if not exists created_at timestamptz default now();
alter table public.market_prices add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'market_prices_item_key_unique'
  ) and not exists (
    select 1 from pg_constraint where conname = 'market_prices_item_key_key'
  ) then
    alter table public.market_prices add constraint market_prices_item_key_unique unique (item_key);
  end if;
end $$;

-- ---------- market_price_logs ----------
create table if not exists public.market_price_logs (
  id bigserial primary key,
  item_key text,
  item_name text,
  category text,
  old_price numeric,
  new_price numeric,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.market_price_logs add column if not exists item_key text;
alter table public.market_price_logs add column if not exists item_name text;
alter table public.market_price_logs add column if not exists category text;
alter table public.market_price_logs add column if not exists old_price numeric;
alter table public.market_price_logs add column if not exists new_price numeric;
alter table public.market_price_logs add column if not exists changed_by uuid references auth.users(id) on delete set null;
alter table public.market_price_logs add column if not exists created_at timestamptz default now();

-- Minecraft Mod / API 제보 추적용
alter table public.market_price_logs add column if not exists source text default 'web';
alter table public.market_price_logs add column if not exists reporter_minecraft_id text;
alter table public.market_price_logs add column if not exists raw_payload jsonb;

-- ---------- notices ----------
create table if not exists public.notices (
  id bigserial primary key,
  title text not null,
  content text,
  is_pinned boolean not null default false,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notices add column if not exists title text;
alter table public.notices add column if not exists content text;
alter table public.notices add column if not exists is_pinned boolean not null default false;
alter table public.notices add column if not exists is_published boolean not null default true;
alter table public.notices add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.notices add column if not exists created_at timestamptz not null default now();
alter table public.notices add column if not exists updated_at timestamptz not null default now();

-- ---------- helper functions ----------
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('owner','admin')
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_market_prices_updated_at on public.market_prices;
create trigger set_market_prices_updated_at
before update on public.market_prices
for each row execute function public.set_updated_at();

-- 로그인 유저 자동 profile 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    discord_id,
    username,
    avatar_url,
    email,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'provider_id', new.raw_user_meta_data->>'sub'),
    coalesce(
      new.raw_user_meta_data->>'global_name',
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new.email,
    'user'
  )
  on conflict (id) do update set
    discord_id = coalesce(excluded.discord_id, public.profiles.discord_id),
    username = coalesce(public.profiles.username, excluded.username),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    email = coalesce(public.profiles.email, excluded.email),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 시세 변경 + 로그 저장을 한 번에 처리
create or replace function public.update_market_price(
  target_item_key text,
  target_price numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data public.market_prices%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  select * into row_data
  from public.market_prices
  where item_key = target_item_key
  for update;

  if not found then
    raise exception 'Market item not found';
  end if;

  if target_price < 0 then
    raise exception 'Invalid price';
  end if;

  if row_data.price_max > 0 and target_price > row_data.price_max then
    raise exception '잘못된 시세를 입력했습니다.';
  end if;

  if coalesce(row_data.price,0) = coalesce(target_price,0) then
    return;
  end if;

  update public.market_prices
  set price = target_price,
      price_change = null,
      updated_by = auth.uid(),
      checked_at = now(),
      updated_at = now()
  where item_key = target_item_key;

  insert into public.market_price_logs (
    item_key,
    item_name,
    category,
    old_price,
    new_price,
    changed_by,
    source
  ) values (
    row_data.item_key,
    row_data.item_name,
    row_data.category,
    row_data.price,
    target_price,
    auth.uid(),
    'web'
  );
end;
$$;

-- 공지 작성/삭제를 관리자 권한으로 안정 처리
create or replace function public.create_notice(
  notice_title text,
  notice_content text default ''
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id bigint;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can create notices';
  end if;

  insert into public.notices (title, content, is_published, created_by)
  values (notice_title, notice_content, true, auth.uid())
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.delete_notice(notice_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can delete notices';
  end if;

  delete from public.notices where id = notice_id;
end;
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.market_prices enable row level security;
alter table public.market_price_logs enable row level security;
alter table public.notices enable row level security;

-- profiles policies
drop policy if exists "Anyone can read profiles" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Admins can read profiles" on public.profiles for select to authenticated using ((select public.is_admin_user()));
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- [SECURITY FIX] role 컬럼 셀프 변경 차단 트리거
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id = auth.uid() and new.role is distinct from old.role then
    raise exception 'role 변경은 관리자만 가능합니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_self_escalation on public.profiles;
create trigger prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- market policies
drop policy if exists "Anyone can read market prices" on public.market_prices;
drop policy if exists "Logged in users can insert market prices" on public.market_prices;
drop policy if exists "Logged in users can update market prices" on public.market_prices;
create policy "Anyone can read market prices" on public.market_prices for select to anon, authenticated using (category in ('craft','cooking'));
-- Direct insert/update is intentionally not exposed. Authenticated users must use update_market_price(),
-- which validates the item and writes a matching audit log in the same transaction.

-- log policies
drop policy if exists "Anyone can read market price logs" on public.market_price_logs;
drop policy if exists "Admins can read market price logs" on public.market_price_logs;
drop policy if exists "Logged in users can insert market price logs" on public.market_price_logs;
create policy "Admins can read market price logs" on public.market_price_logs for select to authenticated using ((select public.is_admin_user()));
-- Public latest-log display is served by /api/market-latest with a safe field allowlist.
-- Direct log inserts are intentionally blocked; update_market_price() and the server-side Mod API write logs.

-- notices policies
drop policy if exists "Anyone can read published notices" on public.notices;
drop policy if exists "Admins can insert notices" on public.notices;
drop policy if exists "Admins can update notices" on public.notices;
drop policy if exists "Admins can delete notices" on public.notices;
create policy "Anyone can read published notices" on public.notices for select to anon, authenticated using (is_published = true);
create policy "Admins can insert notices" on public.notices for insert to authenticated with check ((select public.is_admin_user()));
create policy "Admins can update notices" on public.notices for update to authenticated using ((select public.is_admin_user())) with check ((select public.is_admin_user()));
create policy "Admins can delete notices" on public.notices for delete to authenticated using ((select public.is_admin_user()));

-- ---------- Seed market data ----------
insert into public.market_prices (item_key,item_name,category,price,price_max,update_cycle,checked_at,updated_at) values
('shell_brooch','조개껍데기 브로치','craft',0,50000,'daily',now(),now()),
('blue_perfume_bottle','푸른 향수병','craft',0,150000,'daily',now(),now()),
('mother_of_pearl_mirror','자개 손거울','craft',0,300000,'daily',now(),now()),
('pink_hairpin','분홍 헤어핀','craft',0,500000,'daily',now(),now()),
('mother_of_pearl_fan','자개 부채','craft',0,700000,'daily',now(),now()),
('black_pearl_watch','흑진주 시계','craft',0,1000000,'daily',now(),now()),
('tomato_spaghetti','토마토 스파게티','cooking',0,864,'every_3_days',now(),now()),
('onion_ring','어니언 링','cooking',0,1026,'every_3_days',now(),now()),
('garlic_cake','갈릭 케이크','cooking',0,756,'every_3_days',now(),now()),
('pork_tomato_stew','삼겹살 토마토 찌개','cooking',0,2039,'every_3_days',now(),now()),
('three_color_icecream','삼색 아이스크림','cooking',0,3022,'every_3_days',now(),now()),
('garlic_lamb_hotdog','마늘 양갈비 핫도그','cooking',0,1713,'every_3_days',now(),now()),
('sweet_cereal','달콤 시리얼','cooking',0,2578,'every_3_days',now(),now()),
('roast_chicken_pie','로스트 치킨 파이','cooking',0,2134,'every_3_days',now(),now()),
('sweet_chicken_burger','스윗 치킨 햄버거','cooking',0,3234,'every_3_days',now(),now()),
('tomato_pineapple_pizza','토마토 파인애플 피자','cooking',0,3077,'every_3_days',now(),now()),
('onion_soup','양파 수프','cooking',0,3797,'every_3_days',now(),now()),
('herb_pork_steam','허브 삼겹살 찜','cooking',0,2982,'every_3_days',now(),now()),
('tomato_lasagna','토마토 라자냐','cooking',0,4177,'every_3_days',now(),now()),
('deep_cream_pane','딥 크림 빠네','cooking',0,3837,'every_3_days',now(),now()),
('triple_beef_skewer','트리플 소갈비 꼬치','cooking',0,4307,'every_3_days',now(),now())
on conflict (item_key) do update set
  item_name=excluded.item_name,
  category=excluded.category,
  price_max=excluded.price_max,
  update_cycle=excluded.update_cycle,
  updated_at=now();

-- ---------- v12 compatibility grants ----------
revoke execute on function public.update_market_price(text, numeric) from public, anon;
revoke execute on function public.create_notice(text, text) from public, anon;
revoke execute on function public.delete_notice(bigint) from public, anon;
revoke execute on function public.is_admin_user() from public, anon;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_role_self_escalation() from public, anon, authenticated;
grant execute on function public.update_market_price(text, numeric) to authenticated;
grant execute on function public.create_notice(text, text) to authenticated;
grant execute on function public.delete_notice(bigint) to authenticated;
grant execute on function public.is_admin_user() to authenticated;

-- profiles upsert/select 권한 보강
-- PostgREST schema cache 갱신을 위해 SQL 실행 후 10~30초 뒤 새로고침하세요.

-- ---------- mod version config ----------
create table if not exists public.mod_version_config (
  id text primary key default 'ddingplug',
  latest_version text not null default '0.1.0',
  minecraft_version text not null default '1.21.4',
  fabric_loader text not null default '0.16.10+',
  fabric_api text not null default '0.119.2+1.21.4',
  download_url text not null default 'https://ddingplug.vercel.app/download',
  release_note text not null default '공식 0.1.0 배포판',
  required boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mod_version_config_singleton check (id = 'ddingplug')
);

alter table public.mod_version_config add column if not exists latest_version text not null default '0.1.0';
alter table public.mod_version_config add column if not exists minecraft_version text not null default '1.21.4';
alter table public.mod_version_config add column if not exists fabric_loader text not null default '0.16.10+';
alter table public.mod_version_config add column if not exists fabric_api text not null default '0.119.2+1.21.4';
alter table public.mod_version_config add column if not exists download_url text not null default 'https://ddingplug.vercel.app/download';
alter table public.mod_version_config add column if not exists release_note text not null default '공식 0.1.0 배포판';
alter table public.mod_version_config add column if not exists required boolean not null default false;
alter table public.mod_version_config add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.mod_version_config add column if not exists created_at timestamptz not null default now();
alter table public.mod_version_config add column if not exists updated_at timestamptz not null default now();

alter table public.mod_version_config alter column latest_version set default '0.1.0';
alter table public.mod_version_config alter column release_note set default '공식 0.1.0 배포판';

insert into public.mod_version_config (
  id,
  latest_version,
  minecraft_version,
  fabric_loader,
  fabric_api,
  download_url,
  release_note,
  required
)
values (
  'ddingplug',
  '0.1.0',
  '1.21.4',
  '0.16.10+',
  '0.119.2+1.21.4',
  'https://ddingplug.vercel.app/download',
  '공식 0.1.0 배포판',
  false
)
on conflict (id) do nothing;

drop trigger if exists set_mod_version_config_updated_at on public.mod_version_config;
create trigger set_mod_version_config_updated_at
before update on public.mod_version_config
for each row execute function public.set_updated_at();

alter table public.mod_version_config enable row level security;
drop policy if exists "Anyone can read mod version config" on public.mod_version_config;
drop policy if exists "Admins can read mod version config" on public.mod_version_config;
drop policy if exists "Admins can insert mod version config" on public.mod_version_config;
drop policy if exists "Admins can update mod version config" on public.mod_version_config;
create policy "Admins can read mod version config" on public.mod_version_config for select to authenticated using ((select public.is_admin_user()));
create policy "Admins can insert mod version config" on public.mod_version_config for insert to authenticated with check ((select public.is_admin_user()));
create policy "Admins can update mod version config" on public.mod_version_config for update to authenticated using ((select public.is_admin_user())) with check ((select public.is_admin_user()));

revoke select, insert, update, delete on table public.mod_version_config from public, anon;
revoke delete on table public.mod_version_config from authenticated;
grant select on table public.mod_version_config to authenticated;
grant insert, update on table public.mod_version_config to authenticated;

-- ---------- downloads ----------
create table if not exists public.downloads (
  id bigserial primary key,
  title text not null,
  description text,
  file_name text not null,
  file_type text,
  file_size bigint default 0,
  file_data text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.downloads add column if not exists title text;
alter table public.downloads add column if not exists description text;
alter table public.downloads add column if not exists file_name text;
alter table public.downloads add column if not exists file_type text;
alter table public.downloads add column if not exists file_size bigint default 0;
alter table public.downloads add column if not exists file_data text;
alter table public.downloads add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.downloads add column if not exists created_at timestamptz not null default now();
alter table public.downloads add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_downloads_updated_at on public.downloads;
create trigger set_downloads_updated_at
before update on public.downloads
for each row execute function public.set_updated_at();

alter table public.downloads enable row level security;

drop policy if exists "Anyone can read downloads" on public.downloads;
drop policy if exists "Admins can insert downloads" on public.downloads;
drop policy if exists "Admins can update downloads" on public.downloads;
drop policy if exists "Admins can delete downloads" on public.downloads;

create policy "Anyone can read downloads" on public.downloads for select to anon, authenticated using (true);
create policy "Admins can insert downloads" on public.downloads for insert to authenticated with check ((select public.is_admin_user()));
create policy "Admins can update downloads" on public.downloads for update to authenticated using ((select public.is_admin_user())) with check ((select public.is_admin_user()));
create policy "Admins can delete downloads" on public.downloads for delete to authenticated using ((select public.is_admin_user()));

-- ---------- v19 ocean personal settings ----------
create table if not exists public.user_ocean_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_ocean_settings add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.user_ocean_settings add column if not exists created_at timestamptz not null default now();
alter table public.user_ocean_settings add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_user_ocean_settings_updated_at on public.user_ocean_settings;
create trigger set_user_ocean_settings_updated_at
before update on public.user_ocean_settings
for each row execute function public.set_updated_at();

alter table public.user_ocean_settings enable row level security;
drop policy if exists "Users can read own ocean settings" on public.user_ocean_settings;
drop policy if exists "Users can insert own ocean settings" on public.user_ocean_settings;
drop policy if exists "Users can update own ocean settings" on public.user_ocean_settings;
create policy "Users can read own ocean settings" on public.user_ocean_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own ocean settings" on public.user_ocean_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own ocean settings" on public.user_ocean_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------- v29 expert feature maintenance locks ----------
create table if not exists public.feature_locks (
  feature_key text primary key check (feature_key in ('mining','farming','ocean','hunting')),
  is_locked boolean not null default false,
  message text not null default '현재 점검중입니다.',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feature_locks add column if not exists is_locked boolean not null default false;
alter table public.feature_locks add column if not exists message text not null default '현재 점검중입니다.';
alter table public.feature_locks add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.feature_locks add column if not exists created_at timestamptz not null default now();
alter table public.feature_locks add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_feature_locks_updated_at on public.feature_locks;
create trigger set_feature_locks_updated_at
before update on public.feature_locks
for each row execute function public.set_updated_at();

insert into public.feature_locks (feature_key, is_locked, message) values
('mining', false, '채광 콘텐츠는 현재 점검중입니다.'),
('farming', false, '재배 콘텐츠는 현재 점검중입니다.'),
('ocean', false, '해양 콘텐츠는 현재 점검중입니다.'),
('hunting', false, '사냥 콘텐츠는 현재 점검중입니다.')
on conflict (feature_key) do nothing;

create or replace function public.set_feature_lock(
  target_feature_key text,
  target_is_locked boolean,
  target_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can change feature locks';
  end if;

  if target_feature_key not in ('mining','farming','ocean','hunting') then
    raise exception 'Invalid feature key';
  end if;

  insert into public.feature_locks (feature_key, is_locked, message, updated_by, updated_at)
  values (
    target_feature_key,
    target_is_locked,
    coalesce(nullif(target_message,''), '현재 점검중입니다.'),
    auth.uid(),
    now()
  )
  on conflict (feature_key) do update set
    is_locked = excluded.is_locked,
    message = excluded.message,
    updated_by = auth.uid(),
    updated_at = now();
end;
$$;

alter table public.feature_locks enable row level security;
drop policy if exists "Anyone can read feature locks" on public.feature_locks;
drop policy if exists "Admins can insert feature locks" on public.feature_locks;
drop policy if exists "Admins can update feature locks" on public.feature_locks;
drop policy if exists "Admins can delete feature locks" on public.feature_locks;
create policy "Anyone can read feature locks" on public.feature_locks for select to anon, authenticated using (true);
create policy "Admins can insert feature locks" on public.feature_locks for insert to authenticated with check ((select public.is_admin_user()));
create policy "Admins can update feature locks" on public.feature_locks for update to authenticated using ((select public.is_admin_user())) with check ((select public.is_admin_user()));
create policy "Admins can delete feature locks" on public.feature_locks for delete to authenticated using ((select public.is_admin_user()));

revoke execute on function public.set_feature_lock(text, boolean, text) from public, anon;
grant execute on function public.set_feature_lock(text, boolean, text) to authenticated;

-- ---------- merchant ledger ----------
create table if not exists public.merchant_trades (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null default current_date,
  item_name text not null default '',
  quantity numeric(12,2) not null default 1,
  buy_unit_price numeric(14,2) not null default 0,
  expected_sell_price numeric(14,2),
  sell_unit_price numeric(14,2),
  sale_method text not null default 'direct',
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchant_trades_quantity_positive check (quantity > 0),
  constraint merchant_trades_buy_nonnegative check (buy_unit_price >= 0),
  constraint merchant_trades_expected_sell_nonnegative check (expected_sell_price is null or expected_sell_price >= 0),
  constraint merchant_trades_sell_nonnegative check (sell_unit_price is null or sell_unit_price >= 0),
  constraint merchant_trades_sale_method_valid check (sale_method in ('direct','shop'))
);

alter table public.merchant_trades add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.merchant_trades add column if not exists trade_date date not null default current_date;
alter table public.merchant_trades add column if not exists item_name text not null default '';
alter table public.merchant_trades add column if not exists quantity numeric(12,2) not null default 1;
alter table public.merchant_trades add column if not exists buy_unit_price numeric(14,2) not null default 0;
alter table public.merchant_trades add column if not exists expected_sell_price numeric(14,2);
alter table public.merchant_trades add column if not exists sell_unit_price numeric(14,2);
alter table public.merchant_trades add column if not exists sale_method text not null default 'direct';
alter table public.merchant_trades add column if not exists memo text not null default '';
alter table public.merchant_trades add column if not exists created_at timestamptz not null default now();
alter table public.merchant_trades add column if not exists updated_at timestamptz not null default now();

create index if not exists merchant_trades_user_date_idx
  on public.merchant_trades (user_id, trade_date desc, id desc);

drop trigger if exists set_merchant_trades_updated_at on public.merchant_trades;
create trigger set_merchant_trades_updated_at
before update on public.merchant_trades
for each row execute function public.set_updated_at();

alter table public.merchant_trades enable row level security;
drop policy if exists "Admins can read own merchant trades" on public.merchant_trades;
drop policy if exists "Admins can insert own merchant trades" on public.merchant_trades;
drop policy if exists "Admins can update own merchant trades" on public.merchant_trades;
drop policy if exists "Admins can delete own merchant trades" on public.merchant_trades;
create policy "Admins can read own merchant trades" on public.merchant_trades
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_admin_user()));
create policy "Admins can insert own merchant trades" on public.merchant_trades
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_admin_user()));
create policy "Admins can update own merchant trades" on public.merchant_trades
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_admin_user()))
  with check ((select auth.uid()) = user_id and (select public.is_admin_user()));
create policy "Admins can delete own merchant trades" on public.merchant_trades
  for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_admin_user()));

revoke all on public.merchant_trades from anon;
grant select, insert, update, delete on public.merchant_trades to authenticated;
grant usage, select on sequence public.merchant_trades_id_seq to authenticated;

-- ---------- merchant buy plans ----------
create table if not exists public.merchant_buy_plans (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_name text not null default '',
  average_price numeric(14,2) not null default 0,
  target_buy_price numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchant_buy_plans_average_nonnegative check (average_price >= 0),
  constraint merchant_buy_plans_target_nonnegative check (target_buy_price >= 0)
);

alter table public.merchant_buy_plans add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.merchant_buy_plans add column if not exists item_name text not null default '';
alter table public.merchant_buy_plans add column if not exists average_price numeric(14,2) not null default 0;
alter table public.merchant_buy_plans add column if not exists target_buy_price numeric(14,2) not null default 0;
alter table public.merchant_buy_plans add column if not exists created_at timestamptz not null default now();
alter table public.merchant_buy_plans add column if not exists updated_at timestamptz not null default now();

create index if not exists merchant_buy_plans_user_id_idx
  on public.merchant_buy_plans (user_id, id);

drop trigger if exists set_merchant_buy_plans_updated_at on public.merchant_buy_plans;
create trigger set_merchant_buy_plans_updated_at
before update on public.merchant_buy_plans
for each row execute function public.set_updated_at();

alter table public.merchant_buy_plans enable row level security;
drop policy if exists "Admins can read own merchant buy plans" on public.merchant_buy_plans;
drop policy if exists "Admins can insert own merchant buy plans" on public.merchant_buy_plans;
drop policy if exists "Admins can update own merchant buy plans" on public.merchant_buy_plans;
drop policy if exists "Admins can delete own merchant buy plans" on public.merchant_buy_plans;
create policy "Admins can read own merchant buy plans" on public.merchant_buy_plans
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_admin_user()));
create policy "Admins can insert own merchant buy plans" on public.merchant_buy_plans
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_admin_user()));
create policy "Admins can update own merchant buy plans" on public.merchant_buy_plans
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_admin_user()))
  with check ((select auth.uid()) = user_id and (select public.is_admin_user()));
create policy "Admins can delete own merchant buy plans" on public.merchant_buy_plans
  for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_admin_user()));

revoke all on public.merchant_buy_plans from anon;
grant select, insert, update, delete on public.merchant_buy_plans to authenticated;
grant usage, select on sequence public.merchant_buy_plans_id_seq to authenticated;
