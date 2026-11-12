import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { connection, getAuthClient } from './client';
import { canWrite, sessionExpired, validProfile } from './policy';

const Context = createContext(null);
const CLOCK = 'brassworks-session-clock';
const PASSWORD = 'brassworks-password-required';

export function AuthProvider({ children }) {
  const [access, setAccess] = useState({ status: connection.enabled ? 'loading' : 'demo' });
  const generation = useRef(0);
  const passwordRequired = useRef(false);
  const disposed = useRef(false);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    const commit = (value) => {
      if (!disposed.current && request === generation.current) setAccess(value);
    };
    if (connection.error) return commit({ status: 'error', message: connection.error });
    try {
      const client = await getAuthClient();
      const {
        data: { user },
        error,
      } = await client.auth.getUser();
      if (!user || error) {
        if (error && !['AuthSessionMissingError', 'AuthApiError'].includes(error.name)) {
          return commit({
            status: 'error',
            message: 'Cannot verify your account. Check your connection and retry.',
          });
        }
        return commit({ status: 'anonymous' });
      }
      const { data: profile, error: profileError } = await client.rpc('get_my_access');
      if (profileError)
        return commit({
          status: 'error',
          message: 'Cannot verify factory access. Ask the owner to check the account connection.',
        });
      if (!validProfile(profile, user))
        return commit({
          status: 'denied',
          message:
            'This account is not verified and active for this factory. Ask an administrator for access.',
        });
      const storedClock = window.sessionStorage.getItem(CLOCK);
      let clock;
      try {
        clock = JSON.parse(storedClock);
      } catch {
        /* A present but unreadable clock expires below. */
      }
      if (storedClock !== null && (!clock || sessionExpired(clock.started, clock.active))) {
        const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
        if (signOutError) throw signOutError;
        window.sessionStorage.removeItem(CLOCK);
        return commit({ status: 'anonymous', message: 'Your session expired. Sign in again.' });
      }
      if (!clock)
        window.sessionStorage.setItem(
          CLOCK,
          JSON.stringify({ started: Date.now(), active: Date.now() }),
        );
      const { data: assurance, error: assuranceError } =
        await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      const base = { profile, email: user.email };
      if (
        (profile.role === 'admin' ||
          assurance.nextLevel === 'aal2' ||
          user.factors?.some((factor) => factor.status === 'verified')) &&
        assurance.currentLevel !== 'aal2'
      ) {
        return commit({ ...base, status: 'mfa' });
      }
      if (passwordRequired.current) return commit({ ...base, status: 'password' });
      commit({ ...base, status: 'ready' });
    } catch {
      commit({
        status: 'error',
        message: 'Cannot verify your account. Check your connection and retry.',
      });
    }
  }, []);

  useEffect(() => {
    if (!connection.enabled) return;
    disposed.current = false;
    let subscription;
    let timeout;
    let live = true;
    passwordRequired.current =
      /(?:^|[&#])type=(?:invite|recovery)(?:&|$)/.test(window.location.hash) ||
      window.sessionStorage.getItem(PASSWORD) === 'true';
    getAuthClient()
      .then((client) => {
        if (!live) return;
        subscription = client.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') passwordRequired.current = true;
          if (event === 'SIGNED_OUT') {
            ++generation.current;
            passwordRequired.current = false;
            window.sessionStorage.removeItem(CLOCK);
            window.sessionStorage.removeItem(PASSWORD);
            setAccess({ status: 'anonymous' });
          } else {
            if (passwordRequired.current) window.sessionStorage.setItem(PASSWORD, 'true');
            // Never await SDK calls while its auth-state lock is held.
            window.clearTimeout(timeout);
            timeout = window.setTimeout(refresh, 0);
          }
        }).data.subscription;
        refresh();
      })
      .catch(() => {
        if (live)
          setAccess({
            status: 'error',
            message: connection.error || 'Account access is unavailable. Retry shortly.',
          });
      });
    return () => {
      live = false;
      disposed.current = true;
      ++generation.current;
      subscription?.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [refresh]);

  const signOut = useCallback(async (scope = 'local') => {
    ++generation.current;
    setAccess({ status: 'loading' });
    const client = await getAuthClient();
    const { error } = await client.auth.signOut({ scope });
    if (error) {
      setAccess({
        status: 'error',
        message: 'Sign-out could not reach the server. Retry to revoke your session.',
      });
      throw error;
    }
    window.sessionStorage.removeItem(CLOCK);
    window.sessionStorage.removeItem(PASSWORD);
    passwordRequired.current = false;
    setAccess({ status: 'anonymous' });
  }, []);

  useEffect(() => {
    if (!['ready', 'mfa', 'password'].includes(access.status)) return;
    const activity = () => {
      try {
        const clock = JSON.parse(window.sessionStorage.getItem(CLOCK));
        if (clock && !sessionExpired(clock.started, clock.active)) {
          window.sessionStorage.setItem(CLOCK, JSON.stringify({ ...clock, active: Date.now() }));
        }
      } catch {
        /* Refresh fails closed on invalid storage. */
      }
    };
    const check = () => {
      if (window.document.visibilityState !== 'hidden') refresh();
    };
    const interval = window.setInterval(check, 60000);
    window.addEventListener('pointerdown', activity);
    window.addEventListener('keydown', activity);
    window.addEventListener('focus', check);
    window.document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pointerdown', activity);
      window.removeEventListener('keydown', activity);
      window.removeEventListener('focus', check);
      window.document.removeEventListener('visibilitychange', check);
    };
  }, [access.status, refresh]);

  const setPassword = async (password) => {
    const client = await getAuthClient();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
    passwordRequired.current = false;
    window.sessionStorage.removeItem(PASSWORD);
    await refresh();
  };

  return (
    <Context.Provider
      value={{
        ...access,
        configured: connection.enabled,
        refresh,
        signOut,
        setPassword,
        canWrite: (entity) =>
          access.status === 'demo' ||
          (access.status === 'ready' && canWrite(access.profile.role, entity)),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('Account provider is missing.');
  return value;
}
