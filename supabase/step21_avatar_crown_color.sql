begin;

-- Cosmetic choice for the test site. Does not grant a paid entitlement.
alter table public.profiles
  add column if not exists avatar_crown_color text;

alter table public.profiles add constraint profiles_avatar_crown_color_check
  check (avatar_crown_color is null or avatar_crown_color in ('sage','rose','sky','lilac','gold','rainbow'));

create or replace function public.get_avatar_frames_v2(p_ids uuid[])
returns table(id uuid, avatar_frame_tier text, avatar_frame_color text, avatar_crown_color text)
language sql stable security definer set search_path=public as $$
  select p.id,p.avatar_frame_tier,p.avatar_frame_color,p.avatar_crown_color
  from public.profiles p
  where p.id = any(coalesce(p_ids,array[]::uuid[]))
    and (p.public_profile = true or p.id = auth.uid())
  limit 100
$$;
revoke all on function public.get_avatar_frames_v2(uuid[]) from public;
grant execute on function public.get_avatar_frames_v2(uuid[]) to anon, authenticated;

commit;
