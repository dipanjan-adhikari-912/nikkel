-- Nikkel schema -- anonymous-first flow
-- Resets all tables. Run after schema changes.

drop table if exists replies cascade;
drop table if exists nikkels cascade;
drop table if exists reviews cascade;
drop table if exists projects cascade;

-- Projects (auto-created on Start Review)
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text,
  base_url text,
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

alter table projects enable row level security;

create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = owner_id);

create policy "Anyone can create projects"
  on projects for insert
  with check (true);

create policy "Owners can update projects"
  on projects for update
  using (auth.uid() = owner_id);

create policy "Anyone can view projects linked to public reviews"
  on projects for select
  using (exists (
    select 1 from reviews where reviews.project_id = projects.id and visibility = 'public'
  ));

-- Reviews (shareable links, belong to a project)
create table reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  visibility text default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now()
);

alter table reviews enable row level security;

create policy "Anyone can view public reviews"
  on reviews for select
  using (visibility = 'public');

create policy "Owners can view own reviews"
  on reviews for select
  using (auth.uid() = owner_id);

create policy "Anyone can create reviews"
  on reviews for insert
  with check (true);

create policy "Owners can update own reviews"
  on reviews for update
  using (auth.uid() = owner_id);

create index if not exists reviews_share_token_idx on reviews (share_token);
create index if not exists reviews_project_id_idx on reviews (project_id);

-- Nikkels (pins belong to a review, which belongs to a project)
create table nikkels (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews on delete cascade,
  owner_id uuid references auth.users on delete set null,
  page_url text,
  dom_selector text,
  x integer,
  y integer,
  viewport_w integer,
  viewport_h integer,
  tag text,
  element_text text,
  comment text not null,
  idx integer not null,
  created_at timestamptz not null default now()
);

alter table nikkels enable row level security;

create policy "Anyone can view nikkels"
  on nikkels for select
  using (true);

create policy "Anyone can submit nikkels"
  on nikkels for insert
  with check (true);

create policy "Owners can update nikkels"
  on nikkels for update
  using (auth.uid() = owner_id);

create index if not exists nikkels_review_id_idx on nikkels (review_id);

-- Replies (comments on nikkels)
create table replies (
  id uuid primary key default gen_random_uuid(),
  nikkel_id uuid not null references nikkels on delete cascade,
  user_id uuid references auth.users on delete set null,
  author_name text not null,
  author_email text,
  body text not null,
  is_client boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table replies enable row level security;

create policy "Anyone can view replies"
  on replies for select
  using (true);

create policy "Anyone can create replies"
  on replies for insert
  with check (true);

create policy "Authors can update own replies"
  on replies for update
  using (auth.uid() = user_id);

create index if not exists replies_nikkel_id_idx on replies (nikkel_id);
create index if not exists replies_created_at_idx on replies (nikkel_id, created_at);
