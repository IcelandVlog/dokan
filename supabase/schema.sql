-- ============================================================
-- DOKAN — Supabase schema
-- Run in: Supabase dashboard → SQL Editor → New query.
-- Safe to re-run (uses "if not exists" / "drop policy if exists").
-- Then run supabase/seed.sql to load the 14 demo products.
-- Then make yourself an admin (see "Make an admin" at the bottom).
-- ============================================================

-- ---------- tables ----------

-- One profile per Supabase Auth user (created automatically, see trigger below).
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id           text primary key,
  name         text not null,
  category     text not null,
  price        numeric(10, 2) not null check (price >= 0),
  stock        integer not null default 0 check (stock >= 0),
  image        text,
  description  text,
  created_at   timestamptz not null default now()
);

-- Product details: gallery images, brand and original (struck-through) price.
-- Safe to re-run on an existing database.
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists compare_price numeric(10, 2) check (compare_price >= 0);
alter table public.products add column if not exists colors jsonb not null default '[]'::jsonb;

create table if not exists public.orders (
  id              text primary key,
  user_id         uuid references auth.users (id) on delete set null,
  user_email      text not null,
  customer_name   text not null,
  phone           text not null,
  address         text not null,
  payment_method  text not null,
  items           jsonb not null,
  total           numeric(10, 2) not null check (total >= 0),
  status          text not null default 'Processing' check (status in ('Processing', 'Confirmed')),
  created_at      timestamptz not null default now()
);

-- ---------- auto-create a profile on sign-up ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- admin check ----------
-- True when the signed-in user's profile has role = 'admin'.
-- security definer so it can read profiles without tripping RLS.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- row-level security ----------
-- Who can do what:
--   anyone (even signed out): read products
--   signed-in customer:       read own profile, place orders for themselves,
--                             read own orders
--   admin (signed-in, role admin): everything else — manage products,
--                             read all profiles and orders, confirm orders

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders   enable row level security;

-- Clear out policies from earlier versions of this file.
drop policy if exists "profiles: read" on public.profiles;
drop policy if exists "products: read" on public.products;
drop policy if exists "products: insert (admin)" on public.products;
drop policy if exists "products: update (admin)" on public.products;
drop policy if exists "products: delete (admin)" on public.products;
drop policy if exists "orders: customer inserts own" on public.orders;
drop policy if exists "orders: read (admin panel + customer history)" on public.orders;
drop policy if exists "orders: status update (admin)" on public.orders;

-- profiles
drop policy if exists "profiles: own or admin read" on public.profiles;
create policy "profiles: own or admin read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- products
drop policy if exists "products: public read" on public.products;
create policy "products: public read"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "products: admin insert" on public.products;
create policy "products: admin insert"
  on public.products for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "products: admin update" on public.products;
create policy "products: admin update"
  on public.products for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products: admin delete" on public.products;
create policy "products: admin delete"
  on public.products for delete
  to authenticated
  using (public.is_admin());

-- orders
drop policy if exists "orders: customer inserts own" on public.orders;
create policy "orders: customer inserts own"
  on public.orders for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and user_email = (auth.jwt() ->> 'email')
  );

drop policy if exists "orders: own or admin read" on public.orders;
create policy "orders: own or admin read"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders: admin status update" on public.orders;
create policy "orders: admin status update"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- sellers ----------
-- A seller is a profile with role = 'seller'. Sellers manage only the
-- products they own (products.seller_id = their user id).
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('customer', 'seller', 'admin'));

alter table public.products add column if not exists seller_id uuid references auth.users (id) on delete set null;

create or replace function public.is_seller()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'seller'
  );
$$;

drop policy if exists "products: admin insert" on public.products;
drop policy if exists "products: admin update" on public.products;
drop policy if exists "products: admin delete" on public.products;
drop policy if exists "products: staff insert" on public.products;
drop policy if exists "products: staff update" on public.products;
drop policy if exists "products: staff delete" on public.products;

create policy "products: staff insert"
  on public.products for insert
  to authenticated
  with check (public.is_admin() or (public.is_seller() and seller_id = auth.uid()));

create policy "products: staff update"
  on public.products for update
  to authenticated
  using (public.is_admin() or (public.is_seller() and seller_id = auth.uid()))
  with check (public.is_admin() or (public.is_seller() and seller_id = auth.uid()));

create policy "products: staff delete"
  on public.products for delete
  to authenticated
  using (public.is_admin() or (public.is_seller() and seller_id = auth.uid()));

-- Seller applications: anyone can apply (as pending); only admins read or decide.
-- Approval itself runs in the approve-seller Edge Function with the service role.
create table if not exists public.seller_applications (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  email        text not null,
  phone        text not null,
  shop_name    text not null,
  category     text not null,
  address      text not null,
  about        text not null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  seller_id    uuid references auth.users (id) on delete set null,
  login_email  text,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz
);

alter table public.seller_applications enable row level security;

drop policy if exists "seller applications: anyone can apply" on public.seller_applications;
create policy "seller applications: anyone can apply"
  on public.seller_applications for insert
  to anon, authenticated
  with check (status = 'pending' and seller_id is null and login_email is null and decided_at is null);

drop policy if exists "seller applications: admin read" on public.seller_applications;
create policy "seller applications: admin read"
  on public.seller_applications for select
  to authenticated
  using (public.is_admin());

drop policy if exists "seller applications: admin update" on public.seller_applications;
create policy "seller applications: admin update"
  on public.seller_applications for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- Make an admin ----------
-- 1. Create the admin account: sign up on the site (or Authentication →
--    Users → Add user in the dashboard) with the email you want.
-- 2. Then run this, using that email:
--
--    update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- Sign out and back in on the Admin page with that email and password.
