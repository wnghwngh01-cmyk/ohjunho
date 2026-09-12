begin;

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('record','project','work')),
  source_id uuid not null,
  audience text not null default 'public' check (audience in ('public','followers')),
  title text not null,
  body text not null default '',
  meta jsonb not null default '{}'::jsonb,
  cover_path text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create table if not exists public.publication_likes (
  publication_id uuid not null references public.publications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (publication_id, user_id)
);
create table if not exists public.publication_comments (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '',
  status text not null default 'open' check (status in ('open','planned','done')),
  created_at timestamptz not null default now()
);
create table if not exists public.feature_votes (
  feature_id uuid not null references public.feature_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feature_id, user_id)
);
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  target_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.security_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.publications enable row level security;
alter table public.follows enable row level security;
alter table public.publication_likes enable row level security;
alter table public.publication_comments enable row level security;
alter table public.blocks enable row level security;
alter table public.feature_requests enable row level security;
alter table public.feature_votes enable row level security;
alter table public.content_reports enable row level security;
alter table public.security_reports enable row level security;

drop policy if exists publications_owner_all on public.publications;
create policy publications_owner_all on public.publications for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists follows_owner_all on public.follows;
create policy follows_owner_all on public.follows for all to authenticated using (follower_id=auth.uid()) with check (follower_id=auth.uid());
drop policy if exists likes_owner_all on public.publication_likes;
create policy likes_owner_all on public.publication_likes for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists comments_insert_own on public.publication_comments;
create policy comments_insert_own on public.publication_comments for insert to authenticated with check (user_id=auth.uid());
drop policy if exists comments_delete_own on public.publication_comments;
create policy comments_delete_own on public.publication_comments for delete to authenticated using (user_id=auth.uid());
drop policy if exists blocks_owner_all on public.blocks;
create policy blocks_owner_all on public.blocks for all to authenticated using (blocker_id=auth.uid()) with check (blocker_id=auth.uid());
drop policy if exists features_insert_own on public.feature_requests;
create policy features_insert_own on public.feature_requests for insert to authenticated with check (user_id=auth.uid());
drop policy if exists votes_owner_all on public.feature_votes;
create policy votes_owner_all on public.feature_votes for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists reports_insert_own on public.content_reports;
create policy reports_insert_own on public.content_reports for insert to authenticated with check (reporter_id=auth.uid());
drop policy if exists security_reports_insert_own on public.security_reports;
create policy security_reports_insert_own on public.security_reports for insert to authenticated with check (user_id=auth.uid());

create or replace function public.get_publication_feed(p_mode text default 'discover', p_limit integer default 50)
returns table(id uuid,user_id uuid,source_type text,source_id uuid,audience text,title text,body text,meta jsonb,cover_path text,published_at timestamptz,display_name text,lab_name text,slug text,following_author boolean,liked_by_me boolean,like_count bigint,comment_count bigint)
language sql security definer set search_path=public stable as $$
  select p.id,p.user_id,p.source_type,p.source_id,p.audience,p.title,p.body,p.meta,p.cover_path,p.published_at,
    coalesce(pr.display_name,'사용자'),coalesce(pr.lab_name,'하루를 담다'),pr.slug,
    exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=p.user_id),
    exists(select 1 from publication_likes l where l.publication_id=p.id and l.user_id=auth.uid()),
    (select count(*) from publication_likes l where l.publication_id=p.id),
    (select count(*) from publication_comments c where c.publication_id=p.id)
  from publications p join profiles pr on pr.id=p.user_id
  where pr.public_profile=true
    and (p.audience='public' or (p.audience='followers' and exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=p.user_id)) or p.user_id=auth.uid())
    and not exists(select 1 from blocks b where (b.blocker_id=auth.uid() and b.blocked_id=p.user_id) or (b.blocker_id=p.user_id and b.blocked_id=auth.uid()))
    and (p_mode<>'following' or p.user_id=auth.uid() or exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=p.user_id))
  order by p.published_at desc limit least(greatest(coalesce(p_limit,50),1),100)
$$;
create or replace function public.get_publication_comments(p_publication uuid)
returns table(id uuid,user_id uuid,body text,created_at timestamptz,display_name text)
language sql security definer set search_path=public stable as $$
  select c.id,c.user_id,c.body,c.created_at,coalesce(pr.display_name,'사용자') from publication_comments c join profiles pr on pr.id=c.user_id where c.publication_id=p_publication order by c.created_at
$$;
create or replace function public.get_blocked_users()
returns table(id uuid,display_name text,lab_name text)
language sql security definer set search_path=public stable as $$
  select pr.id,pr.display_name,pr.lab_name from blocks b join profiles pr on pr.id=b.blocked_id where b.blocker_id=auth.uid() order by b.created_at desc
$$;
create or replace function public.get_feature_feed(p_limit integer default 100)
returns table(id uuid,user_id uuid,title text,body text,status text,created_at timestamptz,display_name text,voted_by_me boolean,vote_count bigint)
language sql security definer set search_path=public stable as $$
  select f.id,f.user_id,f.title,f.body,f.status,f.created_at,coalesce(pr.display_name,'사용자'),exists(select 1 from feature_votes v where v.feature_id=f.id and v.user_id=auth.uid()),(select count(*) from feature_votes v where v.feature_id=f.id) from feature_requests f join profiles pr on pr.id=f.user_id order by f.created_at desc limit least(greatest(coalesce(p_limit,100),1),200)
$$;

grant execute on function public.get_publication_feed(text,integer) to authenticated;
grant execute on function public.get_publication_comments(uuid) to authenticated;
grant execute on function public.get_blocked_users() to authenticated;
grant execute on function public.get_feature_feed(integer) to authenticated;
grant select,insert,update,delete on public.publications,public.follows,public.publication_likes,public.publication_comments,public.blocks,public.feature_requests,public.feature_votes,public.content_reports,public.security_reports to authenticated;

commit;
