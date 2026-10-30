begin;

-- Keep this deployable migration aligned with ../step28_profile_name_limits.sql.
create or replace function public.enforce_profile_name_limits()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' or new.display_name is distinct from old.display_name then
    new.display_name:=btrim(coalesce(new.display_name,''));
    if char_length(new.display_name)<1 or char_length(new.display_name)>8 then
      raise exception '이름은 1~8자로 입력해 주세요.' using errcode='23514';
    end if;
  end if;
  if tg_op='INSERT' or new.lab_name is distinct from old.lab_name then
    new.lab_name:=btrim(coalesce(new.lab_name,''));
    if char_length(new.lab_name)<1 or char_length(new.lab_name)>12 then
      raise exception '공간 이름은 1~12자로 입력해 주세요.' using errcode='23514';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_name_limits on public.profiles;
create trigger profiles_name_limits
before insert or update of display_name,lab_name on public.profiles
for each row execute function public.enforce_profile_name_limits();

revoke all on function public.enforce_profile_name_limits() from public,anon,authenticated;

-- Abort deployment if the remote profile trigger or its insert validation is
-- not active. The temporary probe never touches a user's profile row.
create temp table step28_profile_name_probe(display_name text,lab_name text) on commit drop;
create trigger step28_profile_name_probe_trigger before insert or update of display_name,lab_name
on step28_profile_name_probe for each row execute function public.enforce_profile_name_limits();
insert into step28_profile_name_probe values('가나다라마바사아','가나다라마바사아자차카타');
do $$
begin
  begin
    insert into step28_profile_name_probe values('123456789','공간');
    raise exception 'step28 display-name validation probe failed';
  exception when check_violation then null;
  end;
  begin
    insert into step28_profile_name_probe values('사용자','1234567890123');
    raise exception 'step28 lab-name validation probe failed';
  exception when check_violation then null;
  end;
  if not exists(
    select 1 from pg_trigger
    where tgname='profiles_name_limits'
      and tgrelid='public.profiles'::regclass
      and not tgisinternal
  ) then raise exception 'step28 profiles trigger verification failed';
  end if;
end $$;

commit;
