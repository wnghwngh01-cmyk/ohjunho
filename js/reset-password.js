'use strict';
(function(){
  const form=document.getElementById('resetPasswordForm');
  const password=document.getElementById('newPassword');
  const confirmation=document.getElementById('newPasswordConfirm');
  const submit=document.getElementById('resetPasswordSubmit');
  const message=document.getElementById('resetPasswordMessage');
  let recoveryReady=false;

  function setMessage(text){message.textContent=text}
  function enableForm(){
    if(recoveryReady)return;
    recoveryReady=true;
    password.disabled=false;confirmation.disabled=false;submit.disabled=false;
    setMessage('새 비밀번호를 입력해 주세요.');password.focus();
  }

  if(!window.supabase?.createClient||!window.LAB_CONFIG){
    setMessage('재설정 화면을 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.');return;
  }

  const client=window.supabase.createClient(
    window.LAB_CONFIG.SUPABASE_URL,
    window.LAB_CONFIG.SUPABASE_PUBLISHABLE_KEY,
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
  );

  client.auth.onAuthStateChange((event)=>{
    if(event==='PASSWORD_RECOVERY')enableForm();
  });

  window.setTimeout(()=>{
    if(!recoveryReady)setMessage('재설정 링크가 유효하지 않거나 만료되었습니다. 로그인 화면에서 새 링크를 요청해 주세요.');
  },5000);

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!recoveryReady)return setMessage('유효한 재설정 링크가 필요합니다.');
    if(password.value.length<8)return setMessage('새 비밀번호는 8자 이상 입력해 주세요.');
    if(password.value!==confirmation.value)return setMessage('비밀번호 확인이 일치하지 않습니다.');
    submit.disabled=true;submit.textContent='변경 중…';
    try{
      const {error}=await client.auth.updateUser({password:password.value});
      if(error)throw error;
      await client.auth.signOut();
      form.reset();password.disabled=true;confirmation.disabled=true;
      setMessage('비밀번호를 변경했습니다. 로그인 화면에서 새 비밀번호로 로그인해 주세요.');
      submit.textContent='변경 완료';
    }catch(error){
      console.error('비밀번호 변경',error);
      setMessage('비밀번호를 변경하지 못했습니다. 링크가 만료됐다면 새 링크를 요청해 주세요.');
      submit.disabled=false;submit.textContent='비밀번호 변경';
    }
  });
})();
