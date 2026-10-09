begin;

-- Test-site cosmetics only. These values are not proof of a payment or entitlement.
alter table public.profiles
  add column if not exists avatar_frame_tier text not null default 'none',
  add column if not exists avatar_frame_color text not null default 'sage';

alter table public.profiles drop constraint if exists profiles_avatar_frame_tier_check;
alter table public.profiles add constraint profiles_avatar_frame_tier_check
  check (avatar_frame_tier in ('none','simple','spectrum','blossom','crown'));
alter table public.profiles drop constraint if exists profiles_avatar_frame_color_check;
alter table public.profiles add constraint profiles_avatar_frame_color_check
  check (avatar_frame_color in ('sage','rose','sky','lilac','gold','rainbow'));

-- The existing profile RLS still permits writes only to the owner. Only the
-- two cosmetic fields of public profiles (or the caller's own) leave this RPC.
create or replace function public.get_avatar_frames(p_ids uuid[])
returns table(id uuid, avatar_frame_tier text, avatar_frame_color text)
language sql stable security definer set search_path=public as $$
  select p.id,p.avatar_frame_tier,p.avatar_frame_color
  from public.profiles p
  where p.id = any(coalesce(p_ids,array[]::uuid[]))
    and (p.public_profile = true or p.id = auth.uid())
  limit 100
$$;
revoke all on function public.get_avatar_frames(uuid[]) from public;
grant execute on function public.get_avatar_frames(uuid[]) to anon, authenticated;

commit;
