begin;

create or replace function public.restore_my_data(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_version integer;
  v_source_uid uuid;
  v_key text;
  v_count integer;
  v_total integer := 0;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_backup is null or jsonb_typeof(p_backup) <> 'object' then
    raise exception '올바른 JSON 백업 파일이 아닙니다.';
  end if;
  if pg_column_size(p_backup) > 10485760 then
    raise exception '백업 파일은 10MB 이하여야 합니다.';
  end if;

  v_version := nullif(p_backup->>'version','')::integer;
  if v_version <> 3 then
    raise exception '지원하지 않는 백업 버전입니다.';
  end if;
  if jsonb_typeof(p_backup->'profiles') <> 'array' or jsonb_array_length(p_backup->'profiles') <> 1 then
    raise exception '백업의 계정 정보를 확인할 수 없습니다.';
  end if;
  v_source_uid := nullif(p_backup->'profiles'->0->>'id','')::uuid;
  if v_source_uid is distinct from v_uid then
    raise exception '현재 로그인한 계정에서 만든 백업만 복원할 수 있습니다.';
  end if;

  foreach v_key in array array['records','events','daily_todos','habits','habit_checks','goals','projects','ideas','works','finance_transactions'] loop
    if p_backup ? v_key and jsonb_typeof(p_backup->v_key) <> 'array' then
      raise exception '% 항목은 배열이어야 합니다.', v_key;
    end if;
    v_count := jsonb_array_length(coalesce(p_backup->v_key,'[]'::jsonb));
    if v_count > 5000 then
      raise exception '% 항목이 5000개를 초과합니다.', v_key;
    end if;
    v_total := v_total + v_count;
  end loop;
  if v_total > 20000 then
    raise exception '복원 항목은 합계 20000개 이하여야 합니다.';
  end if;

  insert into public.records(id,user_id,legacy_id,category,mood,entry_date,title,body,tags,favorite)
  select x.id,v_uid,x.legacy_id,x.category,x.mood,x.entry_date,x.title,x.body,coalesce(x.tags,'{}'),coalesce(x.favorite,false)
  from jsonb_to_recordset(coalesce(p_backup->'records','[]'::jsonb)) as x(id uuid,user_id uuid,legacy_id text,category text,mood text,entry_date date,title text,body text,tags text[],favorite boolean)
  on conflict(id) do update set legacy_id=excluded.legacy_id,category=excluded.category,mood=excluded.mood,entry_date=excluded.entry_date,title=excluded.title,body=excluded.body,tags=excluded.tags,favorite=excluded.favorite,updated_at=now()
  where records.user_id=v_uid;

  insert into public.events(id,user_id,legacy_id,name,start_date,end_date,start_time,end_time,done,important)
  select x.id,v_uid,x.legacy_id,x.name,x.start_date,x.end_date,x.start_time,x.end_time,coalesce(x.done,false),coalesce(x.important,false)
  from jsonb_to_recordset(coalesce(p_backup->'events','[]'::jsonb)) as x(id uuid,user_id uuid,legacy_id text,name text,start_date date,end_date date,start_time time,end_time time,done boolean,important boolean)
  on conflict(id) do update set legacy_id=excluded.legacy_id,name=excluded.name,start_date=excluded.start_date,end_date=excluded.end_date,start_time=excluded.start_time,end_time=excluded.end_time,done=excluded.done,important=excluded.important,updated_at=now()
  where events.user_id=v_uid;

  insert into public.daily_todos(id,user_id,todo_date,title,completed)
  select x.id,v_uid,x.todo_date,x.title,coalesce(x.completed,false)
  from jsonb_to_recordset(coalesce(p_backup->'daily_todos','[]'::jsonb)) as x(id uuid,user_id uuid,todo_date date,title text,completed boolean)
  on conflict(id) do update set todo_date=excluded.todo_date,title=excluded.title,completed=excluded.completed,updated_at=now()
  where daily_todos.user_id=v_uid;

  insert into public.habits(id,user_id,legacy_id,name,schedule,active)
  select x.id,v_uid,x.legacy_id,x.name,coalesce(x.schedule,'{"type":"daily"}'::jsonb),coalesce(x.active,true)
  from jsonb_to_recordset(coalesce(p_backup->'habits','[]'::jsonb)) as x(id uuid,user_id uuid,legacy_id text,name text,schedule jsonb,active boolean)
  on conflict(id) do update set legacy_id=excluded.legacy_id,name=excluded.name,schedule=excluded.schedule,active=excluded.active,updated_at=now()
  where habits.user_id=v_uid;

  insert into public.habit_checks(user_id,habit_id,day,completed)
  select v_uid,x.habit_id,x.day,coalesce(x.completed,false)
  from jsonb_to_recordset(coalesce(p_backup->'habit_checks','[]'::jsonb)) as x(user_id uuid,habit_id uuid,day date,completed boolean)
  where exists(select 1 from public.habits h where h.id=x.habit_id and h.user_id=v_uid)
  on conflict(habit_id,day) do update set completed=excluded.completed,updated_at=now()
  where habit_checks.user_id=v_uid;

  insert into public.goals(id,user_id,kind,period_key,title,note,deadline)
  select x.id,v_uid,x.kind,x.period_key,x.title,x.note,x.deadline
  from jsonb_to_recordset(coalesce(p_backup->'goals','[]'::jsonb)) as x(id uuid,user_id uuid,kind text,period_key text,title text,note text,deadline date)
  on conflict(id) do update set kind=excluded.kind,period_key=excluded.period_key,title=excluded.title,note=excluded.note,deadline=excluded.deadline,updated_at=now()
  where goals.user_id=v_uid;

  insert into public.projects(id,user_id,legacy_id,title,summary,status,progress,role,period,project_type,contribution,problem,process,result,learning,skills)
  select x.id,v_uid,x.legacy_id,x.title,x.summary,x.status::project_status,coalesce(x.progress,0),x.role,x.period,x.project_type,x.contribution,x.problem,x.process,x.result,x.learning,coalesce(x.skills,'{}')
  from jsonb_to_recordset(coalesce(p_backup->'projects','[]'::jsonb)) as x(id uuid,user_id uuid,legacy_id text,title text,summary text,status text,progress smallint,role text,period text,project_type text,contribution text,problem text,process text,result text,learning text,skills text[])
  on conflict(id) do update set legacy_id=excluded.legacy_id,title=excluded.title,summary=excluded.summary,status=excluded.status,progress=excluded.progress,role=excluded.role,period=excluded.period,project_type=excluded.project_type,contribution=excluded.contribution,problem=excluded.problem,process=excluded.process,result=excluded.result,learning=excluded.learning,skills=excluded.skills,updated_at=now()
  where projects.user_id=v_uid;

  insert into public.ideas(id,user_id,legacy_id,title,body,next_step,status,project_id)
  select x.id,v_uid,x.legacy_id,x.title,x.body,x.next_step,x.status::idea_status,
    case when exists(select 1 from public.projects p where p.id=x.project_id and p.user_id=v_uid) then x.project_id else null end
  from jsonb_to_recordset(coalesce(p_backup->'ideas','[]'::jsonb)) as x(id uuid,user_id uuid,legacy_id text,title text,body text,next_step text,status text,project_id uuid)
  on conflict(id) do update set legacy_id=excluded.legacy_id,title=excluded.title,body=excluded.body,next_step=excluded.next_step,status=excluded.status,project_id=excluded.project_id,updated_at=now()
  where ideas.user_id=v_uid;

  insert into public.works(id,user_id,legacy_id,category,title,description,link,file_path,file_name,file_size,file_type)
  select x.id,v_uid,x.legacy_id,x.category,x.title,x.description,x.link,null,null,null,null
  from jsonb_to_recordset(coalesce(p_backup->'works','[]'::jsonb)) as x(id uuid,user_id uuid,legacy_id text,category text,title text,description text,link text)
  on conflict(id) do update set legacy_id=excluded.legacy_id,category=excluded.category,title=excluded.title,description=excluded.description,link=excluded.link,updated_at=now()
  where works.user_id=v_uid;

  insert into public.finance_transactions(id,user_id,legacy_id,tx_type,amount,title,category,tx_date)
  select x.id,v_uid,x.legacy_id,x.tx_type,x.amount,x.title,x.category,x.tx_date
  from jsonb_to_recordset(coalesce(p_backup->'finance_transactions','[]'::jsonb)) as x(id uuid,user_id uuid,legacy_id text,tx_type text,amount numeric,title text,category text,tx_date date)
  on conflict(id) do update set legacy_id=excluded.legacy_id,tx_type=excluded.tx_type,amount=excluded.amount,title=excluded.title,category=excluded.category,tx_date=excluded.tx_date
  where finance_transactions.user_id=v_uid;

  return jsonb_build_object(
    'restored',v_total,
    'attachments_restored',false,
    'community_restored',false,
    'mode','merge'
  );
end;
$$;

revoke all on function public.restore_my_data(jsonb) from public;
grant execute on function public.restore_my_data(jsonb) to authenticated;

commit;
