const roles = ['admin', 'manager', 'furnace_operator', 'production_operator', 'viewer'];

export function invitation(body) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !['email', 'full_name', 'role'].includes(key))
  )
    return null;
  const { email, full_name, role } = body;
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  )
    return null;
  if (
    typeof full_name !== 'string' ||
    !full_name.trim() ||
    full_name.trim().length > 100 ||
    /[\u0000-\u001f\u007f]/.test(full_name) ||
    !roles.includes(role)
  )
    return null;
  return { email: email.trim().toLowerCase(), full_name: full_name.trim(), role };
}

// No client-supplied role claims, redirect URL or service credentials are trusted.
export function inviteHandler({ origins, callerClient, adminClient }) {
  return async (request) => {
    const origin = request.headers.get('origin');
    const allowed = origins.includes(origin);
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      ...(allowed
        ? {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
          }
        : {}),
    };
    const reply = (status, error) =>
      new Response(JSON.stringify(error ? { error } : { sent: true }), { status, headers });
    if (!allowed) return reply(403, 'Origin not allowed');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, 'Use POST');
    const authorization = request.headers.get('authorization');
    if (!authorization?.match(/^Bearer [^\s]+$/)) return reply(401, 'Sign in required');
    try {
      const caller = callerClient(authorization);
      const {
        data: { user },
        error: authError,
      } = await caller.auth.getUser();
      if (authError || !user?.email_confirmed_at) return reply(401, 'Verified sign-in required');
      // This caller-scoped SELECT is checked by the existing Admin aal2 policy.
      const { data: actor, error: accessError } = await caller
        .from('profiles')
        .select('id,role,is_active')
        .eq('id', user.id)
        .is('deleted_at', null)
        .single();
      if (accessError || actor?.role !== 'admin' || !actor.is_active)
        return reply(403, 'Verified administrator MFA required');
      const text = await request.text();
      if (text.length > 4096) return reply(413, 'Invitation too large');
      let body;
      try {
        body = invitation(JSON.parse(text));
      } catch {
        return reply(400, 'Invalid invitation');
      }
      if (!body) return reply(400, 'Invalid invitation');
      const { count, error: countError } = await caller
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null);
      if (countError || count === null) return reply(503, 'Cannot verify available places');
      if (count >= 20) return reply(409, 'No active places available');
      const admin = adminClient();
      const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(body.email, {
        redirectTo: origin + '/account',
        data: { full_name: body.full_name },
      });
      if (inviteError || !data?.user?.id) return reply(400, 'Invitation could not be sent');
      // Caller-scoped INSERT attributes the audited change to the real Admin.
      const { error: profileError } = await caller
        .from('profiles')
        .insert({ id: data.user.id, full_name: body.full_name, role: body.role, is_active: true });
      if (profileError) {
        // Never delete an Auth identity here: an invitation can target an existing
        // pending identity. Without an active profile it has no factory access.
        return reply(
          409,
          'Profile creation failed; project owner must review the incomplete invitation before retrying',
        );
      }
      return reply(200);
    } catch {
      return reply(503, 'Invitation service unavailable');
    }
  };
}
