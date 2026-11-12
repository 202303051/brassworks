import { authConfig } from './policy';

export const connection = authConfig(import.meta.env);
let client;
export async function getAuthClient() {
  if (!window.isSecureContext)
    throw new Error(
      'Account sign-in requires HTTPS or localhost. Use the local demo for an HTTP phone preview.',
    );
  if (!connection.enabled || connection.error)
    throw new Error(connection.error || 'Account access is not connected yet.');
  if (!client) {
    const callback = new URLSearchParams(window.location.hash.slice(1));
    // Admin invitations have no browser-created PKCE verifier. Let the SDK
    // validate their token callback; ordinary reset requests continue using PKCE.
    const tokenCallback =
      ['invite', 'recovery'].includes(callback.get('type')) && callback.has('access_token');
    client = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(connection.url, connection.key, {
        auth: {
          storage: window.sessionStorage,
          storageKey: 'brassworks-auth',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: tokenCallback ? 'implicit' : 'pkce',
        },
      }),
    );
  }
  return client;
}
