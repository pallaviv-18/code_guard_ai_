create table if not exists public.public_page_views (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  route text not null check (char_length(route) between 1 and 200),
  viewed_at timestamptz not null default now()
);

create table if not exists public.public_viewer_sessions (
  session_id uuid primary key,
  visitor_id uuid not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists public_page_views_viewed_at_idx
  on public.public_page_views (viewed_at desc);
create index if not exists public_page_views_visitor_viewed_at_idx
  on public.public_page_views (visitor_id, viewed_at desc);
create index if not exists public_viewer_sessions_last_seen_at_idx
  on public.public_viewer_sessions (last_seen_at desc);

alter table public.public_page_views enable row level security;
alter table public.public_viewer_sessions enable row level security;

revoke all on public.public_page_views from public, anon, authenticated;
revoke all on public.public_viewer_sessions from public, anon, authenticated;

create or replace function public.heartbeat_public_viewer(
  p_visitor_id uuid,
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_visitor_id is null or p_session_id is null then
    raise exception 'Visitor and session identifiers are required';
  end if;

  insert into public.public_viewer_sessions (session_id, visitor_id)
  values (p_session_id, p_visitor_id)
  on conflict (session_id) do update
    set last_seen_at = now();

  delete from public.public_viewer_sessions
  where last_seen_at < now() - interval '1 day';
end;
$$;

create or replace function public.track_public_view(
  p_visitor_id uuid,
  p_session_id uuid,
  p_route text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_route is null or char_length(p_route) < 1 or char_length(p_route) > 200 then
    raise exception 'Route must contain between 1 and 200 characters';
  end if;

  perform public.heartbeat_public_viewer(p_visitor_id, p_session_id);
  insert into public.public_page_views (visitor_id, route)
  values (p_visitor_id, p_route);

  delete from public.public_page_views
  where viewed_at < now() - interval '90 days';
end;
$$;

create or replace function public.get_public_visitor_stats(p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with selected_range as (
    select greatest(1, least(coalesce(p_days, 7), 90)) as days
  ),
  summary as (
    select
      count(*)::integer as total_views,
      count(distinct visitor_id)::integer as unique_visitors
    from public.public_page_views, selected_range
    where viewed_at >= now() - make_interval(days => selected_range.days)
  ),
  active as (
    select count(distinct visitor_id)::integer as active_viewers
    from public.public_viewer_sessions
    where last_seen_at >= now() - interval '90 seconds'
  ),
  daily as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', days.date::text,
          'views', coalesce(counts.views, 0),
          'unique_visitors', coalesce(counts.unique_visitors, 0)
        ) order by days.date
      ),
      '[]'::jsonb
    ) as data
    from (
      select generate_series(
        current_date - ((select days from selected_range) - 1),
        current_date,
        interval '1 day'
      )::date as date
    ) days
    left join lateral (
      select
        count(*)::integer as views,
        count(distinct visitor_id)::integer as unique_visitors
      from public.public_page_views
      where viewed_at >= days.date::timestamptz
        and viewed_at < (days.date + 1)::timestamptz
    ) counts on true
  )
  select jsonb_build_object(
    'active_viewers', active.active_viewers,
    'total_views', summary.total_views,
    'unique_visitors', summary.unique_visitors,
    'daily', daily.data
  )
  from active, summary, daily;
$$;

revoke all on function public.heartbeat_public_viewer(uuid, uuid) from public, anon, authenticated;
revoke all on function public.track_public_view(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.get_public_visitor_stats(integer) from public, anon, authenticated;
grant execute on function public.heartbeat_public_viewer(uuid, uuid) to service_role;
grant execute on function public.track_public_view(uuid, uuid, text) to service_role;
grant execute on function public.get_public_visitor_stats(integer) to service_role;
