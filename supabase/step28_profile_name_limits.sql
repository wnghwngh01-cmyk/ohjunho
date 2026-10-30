begin;

-- Preserve existing profile values. Enforce the new limits only when a name is
-- inserted or actually changed, so unrelated profile updates keep working.
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

commit;
