-- Nikkel pricing GATING — run ONLY when pricing launches. Do not apply now.
-- Adds the authoritative free-tier project-count enforcement. The extension ("Start Review",
-- background.js) inserts projects directly into Supabase, bypassing the web server, so a
-- DB trigger is the only enforcement point that covers that path. Its error propagates to the
-- extension's outer catch and surfaces to the user.

-- Effective plan: past_due/paused downgrade to free until resolved (mirrors effectivePlan in web/lib/plan-limits.ts).
create or replace function billing_effective_plan(uid uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  select case
    when s.plan in ('pro', 'team') and s.subscription_status in ('past_due', 'paused') then 'free'
    when s.plan is null then 'free'
    else s.plan
  end
  from public.subscriptions s
  where s.user_id = uid;
$$;

create or replace function enforce_project_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := coalesce(new.owner_id, auth.uid());
  eff_plan text;
  cnt int;
begin
  eff_plan := billing_effective_project_plan(uid);
  if eff_plan = 'free' then
    select count(*) into cnt from public.projects where owner_id = uid;
    if cnt >= 1 then
      raise exception 'Free plan allows 1 project. Upgrade to Pro or Team for unlimited projects.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_limit_before_insert on public.projects;
create trigger projects_limit_before_insert
  before insert on public.projects
  for each row
  execute function enforce_project_limit();

-- After applying: NOTIFY pgrst, 'reload schema';