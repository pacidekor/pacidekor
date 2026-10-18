# H29 verification matrix (po opravách 2026-10-18)

Environment notes:
- SQL: local Postgres 18.6 (`h29_verify` on `127.0.0.1:54329`), synthetic copies of 083/082/071 only
- APP: Next+PostgREST izolovaný stack **neběžel** v tomto kole → HTTP kontroly BLOCKED
- Production migration / deploy / activate: **not run**

| ID | Verdict | Environment | Evidence |
| --- | --- | --- | --- |
| SQL migration applied | PASS | local Postgres `h29_verify` | `sql-results.json` |
| SQL activate happy path + exact images/shared/map | PASS | same | structured JSON read-back |
| SQL one guard miss → no writes | PASS | same | cause `guard mismatch`; snapshots identical |
| SQL mid-archive failure rolls back target | PASS | same | self-redirect; pre name restored |
| SQL capture post + build conditional revert | PASS | same | `backup-post.json`, `revert-from-backup.sql` |
| SQL revert restores exact backup-pre | PASS | same | images/shared/map deep-equal |
| SQL later edit blocks revert | PASS | same | post-guard mismatch; no partial writes |
| SQL null post_*_updated_at refuses | PASS | same | template `revert.sql` |
| SQL FK/CHECK/trigger (expected cause) | PASS | same | specific error patterns |
| SQL guards match expected-pre | PASS | same | `check-guards-against-expected.mjs` |
| SQL guards mismatch STOP (no rewrite) | PASS | same | exit 1 + STOP diffs |
| UNIT orderProductGallery | PASS | node | `verify-isolated.mjs` (not browser zoom) |
| SIMULATION archive/cart/order/activate/revert | PASS | node | labeled SIMULATION |
| Fallback schema-missing only | PASS | node | `fallback-condition.test.mjs` |
| Shared-photo refs fail-closed + pagination | PASS | node unit | `product-image-refs.test.mjs` (no Storage) |
| In-tx post capture + write-once activation | PASS | local Postgres | `run-activate-capture.mjs` / sql-results |
| Revert generator rejects tampered map | PASS | node unit | `activation-artifacts.test.mjs` |
| Focused tsc (changed modules) | PASS | tsc -p focused | product-image-refs + products-admin-server |
| next build compile | PASS | next 16.2.10 | Compiled successfully; full TS phase hung → BLOCKED |
| APP HTTP 307 / PDP / list / order | BLOCKED | — | ports 3000/3001/3002 down; stack not restarted |
| Supabase branch / prod write | BLOCKED | — | not used; cost/prod forbidden |

## Fallback condition (exact)

`isArchiveSchemaMissing(message, code?)` in `src/lib/product-archive-schema.ts`:

- **true** only if message names column `archived_at` / `redirect_to_product_id` **and** says it does not exist / could not find (or PG code `42703` for those columns)
- **false** (fail-closed) for timeout, permission, JWT, network, 502/503/504, canceling statement, etc.

Deploy order unchanged: migration → code → check-guards → data activate → capture-post. H07 untouched.
