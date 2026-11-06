begin;

create sequence if not exists public.pledge_certificate_no_seq start 1;

create table if not exists public.support_entitlements(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_amount integer not null default 0 check(total_amount>=0),
  updated_at timestamptz not null default now()
);

create table if not exists public.pledge_certificates(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  certificate_no bigint not null unique default nextval('public.pledge_certificate_no_seq'),
  issued_at timestamptz not null default now()
);

alter table public.support_entitlements enable row level security;
alter table public.pledge_certificates enable row level security;
revoke all on public.support_entitlements,public.pledge_certificates from anon,authenticated;
grant select on public.support_entitlements,public.pledge_certificates to authenticated;
drop policy if exists support_entitlements_own_read on public.support_entitlements;
create policy support_entitlements_own_read on public.support_entitlements for select to authenticated using(user_id=auth.uid());
drop policy if exists pledge_certificates_own_read on public.pledge_certificates;
create policy pledge_certificates_own_read on public.pledge_certificates for select to authenticated using(user_id=auth.uid());

create or replace function public.issue_pledge_certificate()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.total_amount>=30000 then
    insert into public.pledge_certificates(user_id) values(new.user_id) on conflict(user_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists issue_pledge_certificate_after_support on public.support_entitlements;
create trigger issue_pledge_certificate_after_support after insert or update of total_amount on public.support_entitlements for each row execute function public.issue_pledge_certificate();

create or replace function public.get_my_support_status()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'total_amount',coalesce((select total_amount from public.support_entitlements where user_id=auth.uid()),0),
    'certificate',(select jsonb_build_object('certificate_no',certificate_no,'issued_at',issued_at) from public.pledge_certificates where user_id=auth.uid())
  )
$$;
revoke all on function public.get_my_support_status() from public,anon;
grant execute on function public.get_my_support_status() to authenticated;

update public.profiles p set avatar_frame_tier='simple'
where (p.avatar_frame_tier='spectrum' and coalesce((select total_amount from public.support_entitlements s where s.user_id=p.id),0)<1000)
   or (p.avatar_frame_tier='blossom' and coalesce((select total_amount from public.support_entitlements s where s.user_id=p.id),0)<5000)
   or (p.avatar_frame_tier='crown' and coalesce((select total_amount from public.support_entitlements s where s.user_id=p.id),0)<10000);
update public.profiles p set avatar_frame_color='sage' where p.avatar_frame_color='rainbow' and coalesce((select total_amount from public.support_entitlements s where s.user_id=p.id),0)<5000;
update public.profiles p set avatar_crown_color=null where p.avatar_crown_color='rainbow' and coalesce((select total_amount from public.support_entitlements s where s.user_id=p.id),0)<5000;

create or replace function public.validate_profile_cosmetics()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare amount integer:=0; required_amount integer:=0;
begin
  select coalesce((select total_amount from public.support_entitlements where user_id=new.id),0) into amount;
  required_amount:=case new.avatar_frame_tier when 'spectrum' then 1000 when 'blossom' then 5000 when 'crown' then 10000 else 0 end;
  if amount<required_amount then raise exception '%원 이상 후원 시 이 테두리를 적용할 수 있습니다.',required_amount;end if;
  if (new.avatar_frame_color='rainbow' or new.avatar_crown_color='rainbow') and amount<5000 then raise exception '5,000원 이상 후원 시 무지개 색상을 적용할 수 있습니다.';end if;
  return new;
end $$;
drop trigger if exists validate_profile_cosmetics_before_write on public.profiles;
create trigger validate_profile_cosmetics_before_write before insert or update of avatar_frame_tier,avatar_frame_color,avatar_crown_color on public.profiles for each row execute function public.validate_profile_cosmetics();

create or replace function public.sync_support_cosmetics()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.profiles set
    avatar_frame_tier=case
      when avatar_frame_tier='crown' and new.total_amount<10000 then case when new.total_amount>=5000 then 'blossom' when new.total_amount>=1000 then 'spectrum' else 'simple' end
      when avatar_frame_tier='blossom' and new.total_amount<5000 then case when new.total_amount>=1000 then 'spectrum' else 'simple' end
      when avatar_frame_tier='spectrum' and new.total_amount<1000 then 'simple'
      else avatar_frame_tier end,
    avatar_frame_color=case when avatar_frame_color='rainbow' and new.total_amount<5000 then 'sage' else avatar_frame_color end,
    avatar_crown_color=case when avatar_crown_color='rainbow' and new.total_amount<5000 then null else avatar_crown_color end
  where id=new.user_id;
  return new;
end $$;
drop trigger if exists sync_support_cosmetics_after_write on public.support_entitlements;
create trigger sync_support_cosmetics_after_write after insert or update of total_amount on public.support_entitlements for each row execute function public.sync_support_cosmetics();

create or replace function public.normalize_today_layout(value jsonb)
returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare
  defaults constant jsonb:='[{"id":"quote","enabled":true},{"id":"events","enabled":true},{"id":"todos","enabled":true},{"id":"habits","enabled":true},{"id":"protein","enabled":false},{"id":"budget","enabled":false},{"id":"records","enabled":true}]'::jsonb;
  item jsonb; result jsonb:='[]'::jsonb; seen text[]:='{}'; raw_id text; mapped_id text; enabled boolean; position integer;
begin
  if value is null or jsonb_typeof(value)<>'array' then return defaults;end if;
  for item in select * from jsonb_array_elements(value) loop
    raw_id:=item->>'id';
    mapped_id:=case raw_id when 'quick_record' then 'records' when 'finance_entry' then 'budget' when 'finance_budget' then 'budget' else raw_id end;
    if mapped_id=any(array['quote','events','todos','habits','protein','budget','records']) and jsonb_typeof(item->'enabled')='boolean' then
      enabled:=(item->>'enabled')::boolean;position:=array_position(seen,mapped_id);
      if position is null then seen:=array_append(seen,mapped_id);result:=result||jsonb_build_array(jsonb_build_object('id',mapped_id,'enabled',enabled));
      elsif mapped_id='budget' and enabled then result:=jsonb_set(result,array[(position-1)::text,'enabled'],'true'::jsonb,true);
      end if;
    end if;
  end loop;
  for item in select * from jsonb_array_elements(defaults) loop
    if not (item->>'id'=any(seen)) then result:=result||jsonb_build_array(item);end if;
  end loop;
  return result;
end $$;

update public.profiles set today_layout=public.normalize_today_layout(today_layout);
alter table public.profiles drop constraint if exists profiles_today_layout_valid;
alter table public.profiles alter column today_layout set default public.normalize_today_layout(null),alter column today_layout set not null;
alter table public.profiles add constraint profiles_today_layout_valid check(today_layout=public.normalize_today_layout(today_layout));

commit;
