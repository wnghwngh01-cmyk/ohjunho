import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = new Set(['https://ohjunho.com', 'https://test1.ohjunho.com', 'https://test2.ohjunho.com']);
function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://ohjunho.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

async function listPaths(client: ReturnType<typeof createClient>, bucket: string, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  const queue = [prefix];
  while (queue.length) {
    const folder = queue.shift()!;
    let offset = 0;
    for (;;) {
      const { data, error } = await client.storage.from(bucket).list(folder, { limit: 100, offset });
      if (error) throw error;
      for (const item of data ?? []) {
        const path = folder + '/' + item.name;
        if (item.id) paths.push(path);
        else queue.push(path);
      }
      if (!data || data.length < 100) break;
      offset += data.length;
    }
  }
  return paths;
}

export default { async fetch(request: Request) {
  const cors = corsHeaders(request.headers.get('Origin'));
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) throw new Error('로그인이 필요합니다.');
    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== true) throw new Error('계정 삭제 확인이 필요합니다.');

    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) throw new Error('서버 환경 변수가 준비되지 않았습니다.');

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error('유효한 로그인 정보를 확인하지 못했습니다.');

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    for (const bucket of ['lab-private', 'lab-public']) {
      const paths = await listPaths(admin, bucket, user.id);
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
        if (error) throw error;
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
    return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('delete-account failed', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '계정 삭제에 실패했습니다.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
} };
