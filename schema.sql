-- Nikkel schema — full reset. Run after schema changes.

drop table if exists replies cascade;
drop table if exists nikkels cascade;
drop table if exists reviews cascade;
drop table if exists profiles cascade;
drop table if exists project_collaborators cascade;
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

create policy "authenticated_users_can_create_projects"
  on projects for insert
  with check (
    auth.uid() is not null
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "Owners can update projects"
  on projects for update
  using (auth.uid() = owner_id);

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

create policy "Anyone can view projects linked to public reviews"
  on projects for select
  using (exists (
    select 1 from reviews where reviews.project_id = projects.id and visibility = 'public'
  ));

create index if not exists reviews_share_token_idx on reviews (share_token);
create index if not exists reviews_project_id_idx on reviews (project_id);

-- Profiles (sender identity for public review pages, populated on Google sign-in)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Anyone can view profiles"
  on profiles for select
  using (true);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Project collaborators (who can access a project)
create table project_collaborators (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'collaborator' check (role in ('owner', 'collaborator')),
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table project_collaborators enable row level security;

create policy "members_can_view_collaborator_list"
  on project_collaborators for select
  using (
    auth.uid() = user_id
    or exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy "authenticated_users_can_claim_seat"
  on project_collaborators for insert
  with check (
    auth.uid() = user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

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
  screenshot_url text,
  created_at timestamptz not null default now()
);

alter table nikkels enable row level security;

create policy "Anyone can view nikkels"
  on nikkels for select
  using (true);

create policy "owner_or_collaborator_can_add_nikkels"
  on nikkels for insert
  with check (
    exists (
      select 1 from reviews r
      join projects p on p.id = r.project_id
      where r.id = review_id
        and (
          p.owner_id = auth.uid()
          or exists (select 1 from project_collaborators c where c.project_id = p.id and c.user_id = auth.uid())
        )
    )
  );

create policy "Owners can update nikkels"
  on nikkels for update
  using (auth.uid() = owner_id);

create index if not exists nikkels_review_id_idx on nikkels (review_id);

-- Project collaborators (who can access a project)
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

create policy "owner_or_collaborator_can_reply"
  on replies for insert
  with check (
    exists (
      select 1 from nikkels n
      join reviews r on r.id = n.review_id
      join projects p on p.id = r.project_id
      where n.id = nikkel_id
        and (
          p.owner_id = auth.uid()
          or exists (select 1 from project_collaborators c where c.project_id = p.id and c.user_id = auth.uid())
        )
    )
  );

create policy "Authors can update own replies"
  on replies for update
  using (auth.uid() = user_id);

create index if not exists replies_nikkel_id_idx on replies (nikkel_id);
create index if not exists replies_created_at_idx on replies (nikkel_id, created_at);

-- Track per-user per-project read state for unread badge
create table project_read_state (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table project_read_state enable row level security;

do $$ begin
  create policy "users_manage_own_read_state"
    on project_read_state for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

create or replace function get_unread_counts(uid uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  with project_ids as (
    select id from projects where owner_id = uid
    union
    select project_id from project_collaborators where user_id = uid
  ),
  read_states as (
    select project_id, last_read_at
    from project_read_state
    where user_id = uid
  ),
  unread_events as (
    -- New nikkels since last read (includes own)
    select p.id as pid from project_ids p
    join reviews rv on rv.project_id = p.id
    join nikkels n on n.review_id = rv.id
    left join read_states rs on rs.project_id = p.id
    where rs.last_read_at is null or n.created_at > rs.last_read_at

    union all

    -- New replies since last read (includes own)
    select p.id as pid from project_ids p
    join reviews rv on rv.project_id = p.id
    join nikkels n on n.review_id = rv.id
    join replies r on r.nikkel_id = n.id
    left join read_states rs on rs.project_id = p.id
    where rs.last_read_at is null or r.created_at > rs.last_read_at
  )
  select jsonb_build_object(
    'total', (select count(*) from unread_events),
    'byProject', coalesce(
      (select jsonb_object_agg(pid::text, cnt::int) from (
        select pid, count(*) as cnt from unread_events group by pid
      ) x),
      '{}'::jsonb
    )
  ) into result;
  return result;
end;
$$;

-- RPC: delete a project and all children in one transaction (avoid slow multi-round-trip deletes)
create or replace function delete_project(pid uuid, uid uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  _review_ids uuid[];
  _nikkel_ids uuid[];
begin
  if not exists (select 1 from projects where id = pid and owner_id = uid) then
    return jsonb_build_object('error', 'Not found or not authorized');
  end if;
  -- Bulk delete bottom-up (much faster than relying on ON DELETE CASCADE triggers)
  select array_agg(id) into _review_ids from reviews where project_id = pid;
  if _review_ids is not null then
    select array_agg(id) into _nikkel_ids from nikkels where review_id = any(_review_ids);
    if _nikkel_ids is not null then
      delete from replies where nikkel_id = any(_nikkel_ids);
    end if;
    delete from nikkels where review_id = any(_review_ids);
    delete from reviews where project_id = pid;
  end if;
  delete from project_collaborators where project_id = pid;
  delete from projects where id = pid;
  return jsonb_build_object('message', 'Project deleted');
end;
$$;
