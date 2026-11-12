export const ROLES = {
  admin: 'Administrator',
  manager: 'Manager',
  furnace_operator: 'Furnace operator',
  production_operator: 'Production operator',
  viewer: 'Viewer',
};
export const IDLE_MS = 30 * 60 * 1000;
export const SESSION_MS = 8 * 60 * 60 * 1000;

export function authConfig(env) {
  const url = (env.VITE_SUPABASE_URL || '').trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!url && !key) return { enabled: false };
  try {
    const parsed = new URL(url);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (
      !['https:', ...(loopback ? ['http:'] : [])].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== '/'
    )
      throw new Error();
    let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
    if (!publicKey && key.split('.').length === 3) {
      const payload = JSON.parse(
        globalThis.atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      );
      publicKey = payload.role === 'anon';
    }
    if (!publicKey) throw new Error();
    return { enabled: true, url: parsed.origin, key };
  } catch {
    return {
      enabled: true,
      error:
        'Account configuration is incomplete or invalid. Ask the owner to check the public connection settings.',
    };
  }
}

export function canWrite(role, entity) {
  if (entity === 'masters')
    return ['admin', 'manager', 'furnace_operator', 'production_operator'].includes(role);
  if (!['heats', 'billets', 'plans', 'outputs'].includes(entity)) return false;
  if (role === 'admin' || role === 'manager') return true;
  if (entity === 'heats') return role === 'furnace_operator';
  return ['billets', 'plans', 'outputs'].includes(entity) && role === 'production_operator';
}

export function validProfile(profile, user) {
  return Boolean(
    user?.email_confirmed_at && profile?.id === user.id && Object.hasOwn(ROLES, profile.role),
  );
}

export function passwordError(password, confirmation) {
  if (password.length < 12 || password.length > 128)
    return 'Use 12–128 characters for your password.';
  if (password !== confirmation) return 'The passwords do not match.';
  return '';
}

export function sessionExpired(started, active, now = Date.now()) {
  return (
    !Number.isFinite(started) ||
    !Number.isFinite(active) ||
    started > now ||
    active > now ||
    now - started >= SESSION_MS ||
    now - active >= IDLE_MS
  );
}

export function writeEntity(path) {
  const match = path.match(/^\/(furnace|billets|plans|output)\/(?:new|[^/]+\/edit)\/?$/);
  return match
    ? { furnace: 'heats', billets: 'billets', plans: 'plans', output: 'outputs' }[match[1]]
    : null;
}
