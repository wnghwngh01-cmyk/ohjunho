begin;

-- The current product shares records, diaries and reading logs, plus posts
-- written directly in the Square. Keep legacy project/work rows intact for
-- recovery, but exclude them from the feed and prevent new ones.

alter table public.publications drop constraint if exists publications_source_type_check;
alter table public.publications
  add constraint publications_source_type_check
  check (source_type in ('record','diary','book','community','project','work'));

create or replace function public.reject_retired_publication_types()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.source_type in ('project','work') then
    raise exception 'retired publication type';
  end if;
  return new;
end
$$;
drop trigger if exists publications_reject_retired_types on public.publications;
create trigger publications_reject_retired_types
  before insert or update of source_type on public.publications
  for each row execute function public.reject_retired_publication_types();

alter table public.publication_comments
  add column if not exists parent_id uuid references public.publication_comments(id) on delete cascade;
create index if not exists publication_comments_parent_idx
  on public.publication_comments(publication_id,parent_id,created_at);

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
    and (p_mode<>'following' or p.user_id=auth.uid() or exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=p.user_id))
  order by p.published_at desc limit least(greatest(coalesce(p_limit,50),1),100)
$$;

create or replace function public.get_publication_comments_v2(p_publication uuid)
returns table(id uuid,user_id uuid,parent_id uuid,body text,created_at timestamptz,display_name text,parent_display_name text)
language sql security definer set search_path=public stable as $$
  select c.id,c.user_id,c.parent_id,c.body,c.created_at,coalesce(pr.display_name,'사용자'),coalesce(parent_profile.display_name,'')
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

create or replace function public.add_publication_comment(p_publication uuid,p_body text,p_parent uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid; publication_owner uuid;
begin
  if auth.uid() is null or char_length(trim(coalesce(p_body,''))) not between 1 and 2000 then raise exception 'invalid comment'; end if;
  if not exists(select 1 from profiles where id=auth.uid() and terms_accepted_at is not null) then raise exception 'community terms required'; end if;
  select p.user_id into publication_owner from publications p join profiles pr on pr.id=p.user_id where p.id=p_publication and pr.public_profile=true and p.audience='public';
  if publication_owner is null then raise exception 'publication unavailable'; end if;
  if exists(select 1 from blocks b where (b.blocker_id=auth.uid() and b.blocked_id=publication_owner) or (b.blocker_id=publication_owner and b.blocked_id=auth.uid())) then raise exception 'interaction blocked'; end if;
  if p_parent is not null and not exists(select 1 from publication_comments c where c.id=p_parent and c.publication_id=p_publication and c.parent_id is null) then raise exception 'invalid parent comment'; end if;
  insert into publication_comments(publication_id,user_id,parent_id,body) values(p_publication,auth.uid(),p_parent,trim(p_body)) returning id into new_id;
  return new_id;
end
$$;

create or replace function public.share_record_to_square(
  p_source uuid,p_kind text,p_title text,p_body text,p_meta jsonb default '{}'::jsonb,p_cover_path text default null
)
returns public.publications language plpgsql security definer set search_path=public as $$
declare source_category text; result public.publications;
begin
  if auth.uid() is null or p_kind not in ('record','diary','book') then raise exception 'invalid share type'; end if;
  if not exists(select 1 from profiles where id=auth.uid() and terms_accepted_at is not null) then raise exception 'community terms required'; end if;
  select category into source_category from records where id=p_source and user_id=auth.uid();
  if source_category is null
    or (p_kind='diary' and source_category<>'일상')
    or (p_kind='book' and source_category<>'독서')
    or (p_kind='record' and source_category in ('일상','독서')) then
    raise exception 'source mismatch';
  end if;
  update profiles set public_profile=true where id=auth.uid();
  insert into publications(user_id,source_type,source_id,audience,title,body,meta,cover_path,published_at)
  values(auth.uid(),p_kind,p_source,'public',left(trim(coalesce(p_title,'')),120),left(coalesce(p_body,''),12000),coalesce(p_meta,'{}'::jsonb),p_cover_path,now())
  on conflict(user_id,source_type,source_id) do update set audience='public',title=excluded.title,body=excluded.body,meta=excluded.meta,cover_path=excluded.cover_path,published_at=now(),updated_at=now()
  returning * into result;
  return result;
end
$$;

create or replace function public.add_community_post(p_body text)
returns public.publications language plpgsql security definer set search_path=public as $$
declare result public.publications;
begin
  if auth.uid() is null or char_length(trim(coalesce(p_body,''))) not between 1 and 6000 then raise exception 'invalid post'; end if;
  if not exists(select 1 from profiles where id=auth.uid() and terms_accepted_at is not null) then raise exception 'community terms required'; end if;
  update profiles set public_profile=true where id=auth.uid();
  insert into publications(user_id,source_type,source_id,audience,title,body,meta,published_at)
  values(auth.uid(),'community',gen_random_uuid(),'public','자유글',trim(p_body),'{}'::jsonb,now()) returning * into result;
  return result;
end
$$;

grant execute on function public.get_publication_feed_v2(text,text,integer) to authenticated;
grant execute on function public.get_publication_comments_v2(uuid) to authenticated;
grant execute on function public.add_publication_comment(uuid,text,uuid) to authenticated;
grant execute on function public.share_record_to_square(uuid,text,text,text,jsonb,text) to authenticated;
grant execute on function public.add_community_post(text) to authenticated;

commit;
