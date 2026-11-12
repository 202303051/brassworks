# Database design — Phase 2

Three foundation migrations and `004_account_access.sql` define a single-factory PostgreSQL database compatible with Supabase. Phase 3 adds optional account access; shared factory-data integration remains Phase 4. The factory demo continues to use IndexedDB.

## Records

| Table             | Purpose                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| `profiles`        | Auth user UUID, name, role, activation and soft deletion                          |
| `master_lists`    | Typed company, grade, billet size, rod size and material options                  |
| `heats`           | Heat identity, shift, furnace, dates, times and generated melting minutes         |
| `heat_materials`  | Material rows and charge weights linked to a heat                                 |
| `spectro_results` | Chemistry, target grade, zinc mode and result status                              |
| `billet_entries`  | Receipts by company, grade and billet size, linked or custom heat                 |
| `rod_plans`       | Shape, dimensions, party, target weight, priority and status                      |
| `rod_production`  | Matching stock consumption, optional plan, actual/scrap kg and generated recovery |
| `app_config`      | Singleton minimum supported app version and maintenance flag                      |
| `audit_log`       | Actor, operation, time and complete before/after record values                    |

Each table includes UUID identity and creation/update/deletion metadata. `profiles.id` references `auth.users.id`. The database stamps actor/time fields rather than trusting client-supplied audit identity. Foreign keys and live-parent/type checks prevent invalid links; labels, finite dates, integer counts, positive weights, percentages and shape dimensions have database constraints.

Heat numbers are indexed but intentionally not unique: the original workflow permits an explicitly acknowledged duplicate. Spectro results allow only one live result per heat. Master names are unique per type ignoring case while live.

## Stock and concurrency

`public.billet_stock` computes receipts minus consumption for each exact company/grade/size group. It also reports receipts for the current IST date. `public.get_billet_stock()` exposes the same result, and `public.heat_charge_totals` sums live material charges. These views use `security_invoker`, so the caller's table policies still apply.

A private, unexposed stock-balance table backs the write-time invariant. Receipt and production triggers apply signed deltas with atomic row updates and reject any result below zero. Editing, moving groups, soft deletion and restore adjust the old and new contributions within the same transaction. A failed change rolls back both the record and its counter/audit changes. Clients cannot directly read or modify the private counters.

The user-cap trigger similarly updates a locked singleton counter. Activation, deactivation, soft deletion and restore are counted transactionally; two requests competing for the final user slot cannot both succeed.

## Access policy

Roles are read from active, nondeleted profiles joined to verified Supabase users. Browser-supplied role claims do not select permissions. Admin access additionally requires the signed `aal2` MFA assurance claim. An inactive, unverified or missing profile receives no factory data access.

| Role                | Read                                   | Write                                                |
| ------------------- | -------------------------------------- | ---------------------------------------------------- |
| Admin               | All records, deleted records and audit | Factory records, profiles and configuration; restore |
| Manager             | Live factory records                   | All four factory sections and master maintenance     |
| Furnace operator    | Live factory records                   | Furnace records; add master options                  |
| Production operator | Live factory records                   | Billets, plans and production; add master options    |
| Viewer              | Live factory records                   | None                                                 |

RLS is enabled and forced on every public table. Anonymous access is denied. Authenticated users receive insert/update privileges only where policies permit, with no authenticated hard-delete or truncate grant. Clients must use `public.soft_delete_record(table_name, record_id)` for deletion. This authenticated RPC checks a fixed table whitelist and the current verified role, locks the selected row, then performs the audited `deleted_at` update. It returns `false` for a missing or already-deleted record. Stock, relationship and audit triggers still run. Direct soft-delete updates by non-Admin clients can be rejected because the resulting row is intentionally hidden by RLS; the RPC preserves that hidden-row rule.

Admin can restore an eligible record by updating `deleted_at` to `null`; the restore trigger rejects other roles, and relation/stock constraints must still pass. Operators can add master options but cannot rewrite or delete existing shared master records. Profile updates and application configuration are restricted to Admin, preventing self-assigned roles.

The audit table has no authenticated write policy or write grant. Trusted triggers append records; update/delete/truncate are blocked. All definer functions have a fixed empty search path and explicit grants. The service role remains a privileged server-only maintenance identity; it must never appear in browser variables or application bundles.

## Boundaries

This is a single-factory access model, not tenant isolation. Active users can read live records across the factory; role policies limit writes by department. The application audit covers database record changes, including profile/role changes. Authentication events use [Supabase Auth audit logs](https://supabase.com/docs/guides/auth/audit-logs); they are not fabricated by browser inserts into the application audit table. Verify hosted capture and retention when connecting staging.

The database defines update/maintenance configuration, but the current UI does not yet enforce a forced-update screen. Auth invitation settings, MFA enrollment, session security, realtime and shared cloud queries are not delivered by these migrations. Run the isolated tests and review [validation](validation.md) before applying migrations to a separate staging project.
