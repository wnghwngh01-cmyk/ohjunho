begin;

-- The Following tab is a feed of followed people only. The user's own
-- publications remain visible in Discover and on their public profile.
create or replace function public.get_publication_feed_v2(
  p_mode text default 'discover', p_category text default 'all', p_limit integer default 50
)
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

revoke all on function public.get_publication_feed_v2(text,text,integer) from public;
grant execute on function public.get_publication_feed_v2(text,text,integer) to authenticated;

commit;
