begin;

alter table public.profiles add column if not exists avatar_path text;

alter table public.profiles drop constraint if exists profiles_avatar_path_owner_check;
alter table public.profiles add constraint profiles_avatar_path_owner_check
  check (
    avatar_path is null
    or avatar_path like id::text || '/public/profile/%'
  );

drop function if exists public.get_publication_feed_v2(text,text,integer);
create function public.get_publication_feed_v2(
  p_mode text default 'discover', p_category text default 'all', p_limit integer default 50
)
returns table(id uuid,user_id uuid,source_type text,source_id uuid,audience text,title text,body text,meta jsonb,cover_path text,published_at timestamptz,display_name text,lab_name text,slug text,avatar_path text,following_author boolean,liked_by_me boolean,like_count bigint,comment_count bigint)
language sql security definer set search_path=public stable as $$
  select p.id,p.user_id,p.source_type,p.source_id,p.audience,p.title,p.body,p.meta,p.cover_path,p.published_at,
    coalesce(pr.display_name,'사용자'),coalesce(pr.lab_name,'하루를 담다'),pr.slug,pr.avatar_path,
    exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=p.user_id),
    exists(select 1 from publication_likes l where l.publication_id=p.id and l.user_id=auth.uid()),
    (select count(*) from publication_likes l where l.publication_id=p.id),
    (select count(*) from publication_comments c where c.publication_id=p.id)
  from publications p join profiles pr on pr.id=p.user_id
  where pr.public_profile=true
    and p.source_type in ('record','diary','book','community')
    and (p_category='all' or p.source_type=p_category)
    and (p.audience='public' or p.user_id=auth.uid())
    and not exists(select 1 from blocks b where (b.blocker_id=auth.uid() and b.blocked_id=p.user_id) or (b.blocker_id=p.user_id and b.blocked_id=auth.uid()))
    and (
      p_mode<>'following'
      or (
        p.user_id<>auth.uid()
        and exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=p.user_id)
      )
    )
  order by p.published_at desc limit least(greatest(coalesce(p_limit,50),1),100)
$$;

drop function if exists public.get_publication_comments_v2(uuid);
create function public.get_publication_comments_v2(p_publication uuid)
returns table(id uuid,user_id uuid,parent_id uuid,body text,created_at timestamptz,display_name text,avatar_path text,parent_display_name text)
language sql security definer set search_path=public stable as $$
  select c.id,c.user_id,c.parent_id,c.body,c.created_at,coalesce(pr.display_name,'사용자'),pr.avatar_path,coalesce(parent_profile.display_name,'')
  from publication_comments c
  join profiles pr on pr.id=c.user_id
  left join publication_comments parent on parent.id=c.parent_id
  left join profiles parent_profile on parent_profile.id=parent.user_id
  join publications p on p.id=c.publication_id
  where c.publication_id=p_publication
    and (p.audience='public' or p.user_id=auth.uid())
    and not exists(select 1 from blocks b where (b.blocker_id=auth.uid() and b.blocked_id=c.user_id) or (b.blocker_id=c.user_id and b.blocked_id=auth.uid()))
  order by c.created_at
$$;

drop function if exists public.get_blocked_users();
create function public.get_blocked_users()
returns table(id uuid,display_name text,lab_name text,avatar_path text)
language sql security definer set search_path=public stable as $$
  select pr.id,pr.display_name,pr.lab_name,pr.avatar_path
  from blocks b join profiles pr on pr.id=b.blocked_id
  where b.blocker_id=auth.uid()
  order by b.created_at desc
$$;

drop function if exists public.get_public_profile(text);
create function public.get_public_profile(p_slug text)
returns table(id uuid,display_name text,lab_name text,slug text,bio text,avatar_path text,follower_count bigint,following_count bigint)
language sql security definer set search_path=public stable as $$
  select pr.id,pr.display_name,pr.lab_name,pr.slug,pr.bio,pr.avatar_path,
    (select count(*) from follows f where f.following_id=pr.id),
    (select count(*) from follows f where f.follower_id=pr.id)
  from profiles pr
  where pr.slug=p_slug and pr.public_profile=true
  limit 1
$$;

revoke all on function public.get_publication_feed_v2(text,text,integer) from public;
revoke all on function public.get_publication_comments_v2(uuid) from public;
revoke all on function public.get_blocked_users() from public;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_publication_feed_v2(text,text,integer) to authenticated;
grant execute on function public.get_publication_comments_v2(uuid) to authenticated;
grant execute on function public.get_blocked_users() to authenticated;
grant execute on function public.get_public_profile(text) to anon,authenticated;

commit;
