import { createClient } from '@supabase/supabase-js';

export const onRequestGet: PagesFunction<any> = async (context) => {
  const { env } = context;
  const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const { data, error } = await supabaseAdmin.auth.admin.getUserById("cf0022ec-d4d8-4b0b-ae63-a388e3dd10bf");
  
  if (error) {
    return new Response(error.message, { status: 500 });
  }
  
  return new Response(JSON.stringify(data.user.user_metadata, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
};
