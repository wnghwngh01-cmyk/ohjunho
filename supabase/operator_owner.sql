-- Explicit owner activation only, after step13–15 and approval.
begin;
do $$ begin
 if not exists(select 1 from auth.users where id='d099abb9-8d20-4c52-a176-dada5fe77e01' and email='wnghwngh01@gmail.com' and email_confirmed_at is not null) then
   raise exception '지정된 운영자 계정과 이메일 인증 상태를 확인하세요.';
 end if;
 if exists(select 1 from admin_private.operators where user_id<>'d099abb9-8d20-4c52-a176-dada5fe77e01') then
   raise exception '다른 운영자가 등록되어 있습니다. 자동 변경하지 않습니다.';
 end if;
 insert into admin_private.operators(user_id) values('d099abb9-8d20-4c52-a176-dada5fe77e01') on conflict do nothing;
end $$;
commit;
