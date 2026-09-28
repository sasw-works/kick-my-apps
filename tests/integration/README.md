# Integration tests (real Postgres, real app)

These run the actual app against a local PostgreSQL, through the real sign-in flow, so the SQL that
protects user data is *executed*, not just read. They are not part of the Next.js build.

| File | What it proves |
| --- | --- |
| `isolation_test.py` | Two users can't see, change, or delete each other's reports/comparisons; legacy owner-less rows are invisible; admin access; account deletion removes everything. |
| `hardening_test.py` | Sign-in code attempt limit holds under parallel guesses; codes are single-use; send-code and analyze rate limits (including atomicity under concurrency). |
| `linking_test.mjs` | Auth.js links a Google login to the account already created by an emailed code (and shows it was rejected before the flag). |

## Run
```sh
# 1. Postgres with a database `kma_test` and role kma/kma (see the psql lines in the history of this file's commit)
# 2. use the stand-in driver and build
tests/integration/setup-shim.sh enable
npx next build
POSTGRES_URL=postgres://kma:kma@127.0.0.1:5432/kma_test AUTH_SECRET=test AUTH_TRUST_HOST=true \
  ADMIN_EMAILS=admin@x.com npx next start -p 3111 &
# 3. run
python3 tests/integration/isolation_test.py
python3 tests/integration/hardening_test.py
POSTGRES_URL=postgres://kma:kma@127.0.0.1:5432/kma_test node tests/integration/linking_test.mjs
# 4. ALWAYS restore the real driver afterwards
tests/integration/setup-shim.sh disable
```
The suites truncate their tables at the start, so they are safe to re-run. Never point them at a
real database.
