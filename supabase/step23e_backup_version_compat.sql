-- v4 added idea_media to export; personal-data restore still intentionally
-- excludes attachments/community. Accept both formats without weakening ownership.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.restore_my_data_before_budgets(jsonb)'::regprocedure);
 if position('if v_version <> 3 then' in definition)>0 then
  execute replace(definition,'if v_version <> 3 then','if v_version is null or v_version not in (3,4) then');
 elsif position('if v_version is null or v_version not in (3,4) then' in definition)=0 then
  raise exception 'Unexpected restore definition: inspect before applying compatibility change';
 end if;
end $$;
