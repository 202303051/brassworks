import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { inviteHandler } from './handler.mjs';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origins = (Deno.env.get('APP_ORIGINS') || '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => {
    try {
      const parsed = new URL(value);
      return (
        parsed.origin === value &&
        (parsed.protocol === 'https:' ||
          (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)))
      );
    } catch {
      return false;
    }
  });
const options = { auth: { persistSession: false, autoRefreshToken: false } };
Deno.serve(
  inviteHandler({
    origins,
    callerClient: (authorization: string) =>
      createClient(url, anon, {
        ...options,
        global: { headers: { Authorization: authorization } },
      }),
    adminClient: () => createClient(url, service, options),
  }),
);
