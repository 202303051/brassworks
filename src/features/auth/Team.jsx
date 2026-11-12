import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Confirm, fieldClass } from '@/features/factory/ui';
import { getAuthClient } from './client';
import { useAuth } from './AuthProvider';
import { ROLES } from './policy';

export default function Team() {
  const auth = useAuth();
  const [people, setPeople] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [change, setChange] = useState(null);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'viewer' });
  const load = useCallback(async () => {
    const client = await getAuthClient();
    const { data, error: failure } = await client
      .from('profiles')
      .select('id,full_name,role,is_active,updated_at')
      .is('deleted_at', null)
      .order('full_name');
    if (failure)
      throw new Error('Cannot load team access. Check your connection and administrator MFA.');
    setPeople(data);
  }, []);
  useEffect(() => {
    load().catch((failure) => setError(failure.message));
  }, [load]);
  const active = people.filter((person) => person.is_active).length;
  return (
    <section>
      <Link to="/account" className="inline-flex min-h-12 items-center text-sm underline">
        Back to account
      </Link>
      <h1 className="mt-3 font-heading text-4xl font-bold uppercase sm:text-5xl">Team access</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {active} of 20 active places used. Invitations reserve an active place. Only verified,
        active accounts can enter.
      </p>
      {error && (
        <p role="alert" className="my-4 rounded-md border border-destructive/30 p-4 text-sm">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="my-4 rounded-md bg-success-muted p-4 text-sm text-success">
          {notice}
        </p>
      )}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="divide-y divide-border rounded-xl border border-border bg-card px-4">
          {people.map((person) => (
            <article key={person.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <h2 className="font-semibold">
                  {person.full_name}
                  {person.id === auth.profile.id ? ' (you)' : ''}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {person.is_active ? 'Active' : 'Inactive'} · {ROLES[person.role]}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor={'role-' + person.id}>
                  Role for {person.full_name}
                </label>
                <select
                  id={'role-' + person.id}
                  aria-label={'Role for ' + person.full_name}
                  className={fieldClass + ' max-w-52'}
                  value={person.role}
                  disabled={busy || person.id === auth.profile.id}
                  onChange={(event) =>
                    setChange({
                      person,
                      values: { role: event.target.value },
                      label: `Change ${person.full_name} to ${ROLES[event.target.value]}?`,
                    })
                  }
                >
                  {Object.entries(ROLES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  className="min-h-12"
                  disabled={
                    busy || person.id === auth.profile.id || (!person.is_active && active >= 20)
                  }
                  onClick={() =>
                    setChange({
                      person,
                      values: { is_active: !person.is_active },
                      label: `${person.is_active ? 'Deactivate' : 'Activate'} ${person.full_name}?`,
                    })
                  }
                >
                  {person.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </article>
          ))}
          {!people.length && <p className="py-6 text-sm">No team accounts loaded.</p>}
        </div>
        <form
          className="grid gap-4 rounded-xl border border-border bg-card p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError('');
            setNotice('');
            try {
              const client = await getAuthClient();
              const { error: failure } = await client.functions.invoke('invite-user', {
                body: form,
              });
              if (failure)
                throw new Error(
                  'Invitation was not completed. Check the email, available places and server function setup before retrying.',
                );
              setForm({ email: '', full_name: '', role: 'viewer' });
              setNotice('Invitation sent. The recipient must open the email and set a password.');
              await load();
            } catch (failure) {
              setError(failure.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="font-heading text-2xl font-semibold">Invite a colleague</h2>
          <label className="grid gap-2 text-sm font-semibold">
            Full name
            <input
              className={fieldClass}
              autoComplete="name"
              maxLength={100}
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Email address
            <input
              className={fieldClass}
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Role
            <select
              className={fieldClass}
              value={form.role}
              aria-label="Invitation role"
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {Object.entries(ROLES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" className="min-h-12" disabled={busy || active >= 20}>
            {busy ? 'Sending…' : 'Send invitation'}
          </Button>
        </form>
      </div>
      <Confirm
        open={Boolean(change)}
        onOpenChange={(open) => {
          if (!open) setChange(null);
        }}
        title={change?.label || 'Change access?'}
        description="This changes factory account permissions. Existing records and audit history are kept. An inactive user loses access at the next server check."
        actionLabel="Confirm access change"
        action={async () => {
          setError('');
          const client = await getAuthClient();
          const { data, error: failure } = await client
            .from('profiles')
            .update(change.values)
            .eq('id', change.person.id)
            .eq('updated_at', change.person.updated_at)
            .select('id');
          if (failure || data?.length !== 1) {
            await load();
            throw new Error(
              'Access changed elsewhere or could not be saved. Review the current team list.',
            );
          }
          setNotice('Team access updated.');
          await load();
        }}
      />
    </section>
  );
}
