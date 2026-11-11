# Database setup — Phase 2

The web demo does not need a database or environment variables to run. This guide prepares the PostgreSQL schema for later authentication and cloud-data phases.

## Run the isolated tests first

Install Node 24 LTS and Docker Desktop, or another local Docker engine. Start Docker, then run from the repository:

```sh
npm ci
npm run test:database
```

The runner uses a pinned PostgreSQL 17 image. It creates a fresh network-isolated container, loads the local Supabase auth test shim, applies all numbered migrations in order, loads fake seed data and executes SQL plus concurrent-write checks. It removes the container at the end. No ports are published and no remote database URL is accepted.

Docker must be available at its ordinary local socket. A first run may download the PostgreSQL image. The test shim at `supabase/tests/000_bootstrap.sql` simulates Supabase auth only for this disposable database. **Never run that file, the test SQL or the concurrency fixtures on a hosted project or a database holding real records.**

Expected successful output ends with `Database constraints, policies, triggers and concurrent-write checks passed.` Actual executed results are in [validation](validation.md).

## Create a separate Supabase staging project

1. Create a Supabase account and a new project dedicated to staging. Save the database password in your password manager.
2. Keep public signup disabled. Do not add public application credentials yet; the current demo has no cloud connection.
3. In the project's SQL Editor, run these complete migration files in order:
   - `supabase/migrations/001_factory_schema.sql`
   - `supabase/migrations/002_integrity_and_audit.sql`
   - `supabase/migrations/003_row_level_security.sql`
4. Check that all application tables have RLS enabled. The `private` schema must remain outside the exposed API schemas.
5. Optionally run `supabase/seed.sql` in this **staging** project for fake Indian factory samples. It does not create `auth.users` accounts or real invitations. Omit it from production.

Each migration is transactional. Stop on any error and inspect it before applying the next file. Do not rerun a successful schema migration as though it were a seed script.

### Supabase CLI alternative

Install the Supabase CLI using its official installation instructions. From the repository:

```sh
supabase init
supabase login
supabase link
supabase db push --dry-run
supabase db push
```

Run `supabase init` only when a local `supabase/config.toml` has not already been generated. `supabase link` interactively selects the project and requests its database password. Verify that the selected project is staging before confirming the push. The CLI reads the three numbered migration files and tracks the versions it applied. Keep local CLI credentials out of Git.

The SQL Editor and CLI are alternative deployment methods. Choose one and preserve its migration history; do not apply the same new schema twice through different methods. When using the SQL Editor, track the applied filenames in your project runbook.

## Bootstrap the first administrator

There is deliberately no public self-registration or default Admin password in the migrations or seed.

1. In the Supabase dashboard's Auth Users section, create or invite your intended administrator and complete email verification.
2. In SQL Editor, identify that exact account:

```sql
select id, email, email_confirmed_at
from auth.users
order by created_at;
```

3. Create a `public.profiles` row using that selected account's UUID as `id`, your administrator's name as `full_name`, `admin` as `role`, and `true` as `is_active`. Use a privileged SQL Editor session, and leave creation/update metadata to the database triggers. Do not grant Admin to a different account merely because it appears first in the query.
4. Enroll the administrator in Supabase TOTP MFA and obtain an `aal2` session before accessing the database through the authenticated API. Admin policies intentionally reject an `aal1` session. The application UI for this enrollment/sign-in arrives in Phase 3.

A SQL Editor session is privileged database maintenance, not an example of browser permissions. Do not weaken RLS, spoof assurance claims or place a service-role key in the application to bypass the MFA requirement.

## Later connection and verification

Phase 3 supplies invite-only authentication and session controls. Phase 4 connects the factory UI to these tables. Until then, saving records in the browser does not write to Supabase, and changing `app_config` does not block the demo's launch.

Hosted settings and real Supabase JWT/PostgREST behavior must be verified on your staging project when it is connected. The isolated tests execute PostgreSQL policies with a local auth shim; they do not send real verification email, enroll MFA or prove hosted backup settings.

Before production, configure supported backup/PITR options, restrict Auth redirect URLs to your real application origins, and complete the later release/security checks. No hosted project or production data is changed by the local test command.
