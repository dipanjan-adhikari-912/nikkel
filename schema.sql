-- Nikkel schema — anonymous-first flow

-- Projects (auto-created on Start Review)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade,
  title text,
  base_url text,
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

-- Nikkels (pins)
create table if not exists nikkels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
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

create policy "Project members can view nikkels"
  on nikkels for select
  using (true);

create policy "Anyone can submit nikkels"
  on nikkels for insert
  with check (true);

create policy "Owners can update nikkels"
  on nikkels for update
  using (auth.uid() = owner_id);

-- Index for fast project pin queries
create index if not exists nikkels_project_id_idx on nikkels (project_id);
