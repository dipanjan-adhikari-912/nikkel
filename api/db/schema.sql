create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id),
  full_name text,
  role text default 'member',
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  url text not null,
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now()
);

create table if not exists nikkels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  page_url text not null,
  selector text,
  coord_x float,
  coord_y float,
  element_tag text,
  element_text text,
  comment_text text not null,
  screenshot_url text,
  author_id uuid references profiles(id),
  author_name text,
  status text default 'open',
  classification text,
  severity text,
  agent_summary text,
  ticket_title text,
  ticket_description text,
  agent_processed_at timestamptz,
  jira_issue_id text,
  asana_task_id text,
  created_at timestamptz default now()
);

create table if not exists replies (
  id uuid primary key default gen_random_uuid(),
  nikkel_id uuid references nikkels(id) on delete cascade,
  author_name text not null,
  author_email text,
  text text not null,
  is_client boolean default false,
  created_at timestamptz default now()
);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  type text not null,
  credentials jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_nikkels_project_id on nikkels(project_id);
create index if not exists idx_nikkels_status on nikkels(status);
create index if not exists idx_replies_nikkel_id on replies(nikkel_id);
create index if not exists idx_projects_org_id on projects(org_id);
create index if not exists idx_projects_share_token on projects(share_token);
