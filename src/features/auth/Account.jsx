import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthProvider';
import { getAuthClient } from './client';
import { passwordError, ROLES } from './policy';

const inputClass =
  'min-h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring';

function Input({ label, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <input {...props} className={inputClass} />
    </label>
  );
}

function PasswordForm({ run, busy }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const auth = useAuth();
  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        run(async () => {
          const error = passwordError(password, confirm);
          if (error) throw new Error(error);
          await auth.setPassword(password);
          setPassword('');
          setConfirm('');
        }, 'Your password has been saved.');
      }}
    >
      <p className="text-sm text-muted-foreground">
        Choose a unique password with 12–128 characters.
      </p>
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <Button type="submit" disabled={busy} className="min-h-12">
        {busy ? 'Saving…' : 'Save password'}
      </Button>
    </form>
  );
}

function MfaForm({ run, busy }) {
  const auth = useAuth();
  const [factors, setFactors] = useState(null);
  const [factorId, setFactorId] = useState('');
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState('');
  useEffect(() => {
    let active = true;
    getAuthClient()
      .then((client) => client.auth.mfa.listFactors())
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setFactors([]);
        else {
          const verified = data.totp.filter((factor) => factor.status === 'verified');
          setFactors(verified);
          setFactorId(verified[0]?.id || '');
        }
      })
      .catch(() => {
        if (active) setFactors([]);
      });
    return () => {
      active = false;
    };
  }, []);
  const enroll = () =>
    run(async () => {
      const client = await getAuthClient();
      const { data: listed, error: listError } = await client.auth.mfa.listFactors();
      if (listError) throw listError;
      // Remove only this feature's abandoned, unverified enrollments; never verified factors.
      for (const factor of listed.all.filter(
        (item) => item.status === 'unverified' && item.friendly_name === 'Brassworks authenticator',
      )) {
        const { error } = await client.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw error;
      }
      const { data, error } = await client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Brassworks authenticator',
      });
      if (error) throw error;
      setEnrollment(data);
      setFactorId(data.id);
    });
  return (
    <div className="grid gap-5">
      <p className="text-sm leading-6 text-muted-foreground">
        {auth.profile?.role === 'admin'
          ? 'Administrators must verify an authenticator code before accessing the factory.'
          : 'Verify your authenticator code to finish signing in.'}
      </p>
      {factors === null ? (
        <p role="status">Checking authenticators…</p>
      ) : factors.length === 0 && !enrollment ? (
        <Button className="min-h-12" onClick={enroll} disabled={busy}>
          Set up authenticator
        </Button>
      ) : null}
      {enrollment && (
        <div className="grid gap-3 rounded-lg border border-border p-4">
          <p className="text-sm">
            Scan this QR code in your authenticator app, then enter its six-digit code.
          </p>
          <img
            className="mx-auto size-52 max-w-full bg-white p-2"
            src={
              enrollment.totp.qr_code.startsWith('data:image/svg+xml;')
                ? enrollment.totp.qr_code
                : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.totp.qr_code)}`
            }
            alt="Authenticator setup QR code"
          />
          <details>
            <summary className="cursor-pointer py-3 text-sm">Enter setup key manually</summary>
            <code className="break-all text-sm">{enrollment.totp.secret}</code>
          </details>
          <p className="text-xs text-muted-foreground">
            Keep the setup key private. Administrator recovery requires the project owner; this app
            does not issue recovery codes.
          </p>
        </div>
      )}
      {factors?.length > 1 && (
        <label className="grid gap-2 text-sm">
          Authenticator
          <select
            className={inputClass}
            value={factorId}
            onChange={(e) => setFactorId(e.target.value)}
          >
            {factors.map((factor) => (
              <option key={factor.id} value={factor.id}>
                {factor.friendly_name || 'Authenticator'}
              </option>
            ))}
          </select>
        </label>
      )}
      {factorId && (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const client = await getAuthClient();
              const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
              if (error)
                throw new Error(
                  'That code could not be verified. Try the current code from your authenticator.',
                );
              setCode('');
              setEnrollment(null);
              await auth.refresh();
            });
          }}
        >
          <Input
            label="Authenticator code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <Button type="submit" className="min-h-12" disabled={busy}>
            Verify code
          </Button>
        </form>
      )}
    </div>
  );
}

export default function Account() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const run = async (action, success = '') => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (success) setNotice(success);
    } catch (failure) {
      setError(failure?.message || 'The request could not be completed. Retry shortly.');
    } finally {
      setBusy(false);
    }
  };
  const title =
    auth.status === 'mfa'
      ? 'Verify your identity'
      : auth.status === 'password'
        ? 'Set your password'
        : auth.status === 'ready'
          ? 'Your account'
          : auth.status === 'demo'
            ? 'Account access'
            : mode === 'reset'
              ? 'Reset your password'
              : 'Sign in to Brassworks';
  return (
    <section className="mx-auto max-w-lg">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Factory access
      </p>
      <h1 className="mt-3 font-heading text-4xl font-bold uppercase sm:text-5xl">{title}</h1>
      <div className="mt-6 grid gap-5 rounded-xl border border-border bg-card p-5 sm:p-7">
        {(error || auth.message) && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
          >
            {error || auth.message}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-md bg-success-muted p-3 text-sm text-success">
            {notice}
          </p>
        )}
        {auth.status === 'demo' ? (
          <>
            <p className="text-sm leading-7 text-muted-foreground">
              Factory accounts are not connected yet. You can continue using the local demo; records
              stay in this browser.
            </p>
            <Button asChild className="min-h-12">
              <Link to="/">Open factory workspace</Link>
            </Button>
          </>
        ) : auth.status === 'loading' ? (
          <p role="status">Verifying account…</p>
        ) : auth.status === 'anonymous' ? (
          <>
            <p className="text-sm text-muted-foreground">
              Access is by invitation from your factory administrator.
            </p>
            <form
              className="grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                run(async () => {
                  const client = await getAuthClient();
                  if (mode === 'reset') {
                    const { error: resetError } = await client.auth.resetPasswordForEmail(
                      email.trim(),
                      { redirectTo: window.location.origin + '/account' },
                    );
                    if (resetError)
                      throw new Error(
                        'The reset request could not be sent. Wait a moment and try again.',
                      );
                    setNotice(
                      'If this email has an account, a reset link will arrive shortly. Open it in this browser.',
                    );
                  } else {
                    const { error: loginError } = await client.auth.signInWithPassword({
                      email: email.trim(),
                      password,
                    });
                    setPassword('');
                    if (loginError)
                      throw new Error(
                        'Sign-in failed. Check your email and password, or contact your administrator.',
                      );
                    await auth.refresh();
                  }
                });
              }}
            >
              <Input
                label="Email address"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {mode === 'signin' && (
                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
              <Button type="submit" disabled={busy} className="min-h-12">
                {busy ? 'Please wait…' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
              </Button>
            </form>
            <Button
              variant="ghost"
              className="min-h-12"
              onClick={() => {
                setMode(mode === 'signin' ? 'reset' : 'signin');
                setError('');
                setNotice('');
              }}
            >
              {mode === 'signin' ? 'Forgot password?' : 'Back to sign in'}
            </Button>
          </>
        ) : auth.status === 'mfa' ? (
          <MfaForm run={run} busy={busy} />
        ) : auth.status === 'password' ? (
          <PasswordForm run={run} busy={busy} />
        ) : auth.status === 'ready' ? (
          <>
            <div>
              <p className="font-semibold">{auth.profile.full_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {auth.email} · {ROLES[auth.profile.role]}
              </p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Sessions stay in this tab and expire after 30 minutes idle or eight hours. Factory
              records are still saved only in this browser.
            </p>
            <Button asChild className="min-h-12">
              <Link to="/">Open factory workspace</Link>
            </Button>
            {auth.profile.role === 'admin' && (
              <Button asChild variant="outline" className="min-h-12">
                <Link to="/team">Manage team access</Link>
              </Button>
            )}
            <details>
              <summary className="cursor-pointer py-3 font-semibold">Change password</summary>
              <PasswordForm run={run} busy={busy} />
            </details>
            <Button
              variant="outline"
              className="min-h-12"
              disabled={busy}
              onClick={() => run(() => auth.signOut('global'))}
            >
              Sign out on all devices
            </Button>
          </>
        ) : (
          <Button className="min-h-12" disabled={busy} onClick={() => run(auth.refresh)}>
            Check access again
          </Button>
        )}
        {auth.configured && !['anonymous', 'loading'].includes(auth.status) && (
          <Button
            variant="ghost"
            className="min-h-12"
            disabled={busy}
            onClick={() => run(() => auth.signOut())}
          >
            Sign out of this tab
          </Button>
        )}
      </div>
    </section>
  );
}
