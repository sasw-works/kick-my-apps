# Integration tests (real Postgres, real app)

These run the actual app against a local PostgreSQL, through the real sign-in flow, so the SQL that
protects user data is *executed*, not just read. They are not part of the Next.js build.

| File | What it proves |
| --- | --- |
| `isolation_test.py` | Two users can't see, change, or delete each other's reports/comparisons; legacy owner-less rows are invisible; admin access; account deletion removes everything. |
| `hardening_test.py` | Sign-in code attempt limit holds under parallel guesses; codes are single-use; send-code and analyze rate limits (including atomicity under concurrency). |
| `pulse_check_test.mjs` | Unit test of the Pulse alert logic (rating drop/rise thresholds, negative-review bursts relative to an app's own normal, new-version detection, an unreadable review feed vs. genuinely nothing new, atomic claim under concurrency, fair rotation, data pruning) against a real Postgres with FAKE Apple responses -- no network. `POSTGRES_URL=... node tests/integration/pulse_check_test.mjs`. |
| `pulse_api_test.py` | The Pulse API end to end against the real Apple App Store (real search, real app data) and a real Postgres: add/list/pause/delete, ownership isolation between two users, the Free plan's 1-monitor limit, duplicate detection, manual-check cooldown, cron auth. |
| `secret_leak_test.py` | A malformed AI key (pasted several times / with newlines) or missing keys never puts a secret or server internals in a response or in the server log; members get a generic message, admins a redacted detail. Needs network (talks to the real providers with obviously fake keys). |
| `unsubscribe_test.py` | The full subscription lifecycle against a real Postgres: subscribe/list/delete (owner-scoped, like everything else), the token-based no-login unsubscribe link (GET only looks it up, DELETE actually removes it, reusing a link is graceful), and that one subscriber's token can't affect another's row. |
| `plan_limits_test.py` | Monthly report/comparison limits (Free plan: 2 reports, 1 comparison) against a real Postgres: blocked exactly at the limit (not before/after), the plan-limit check runs before the AI is ever called, owner-scoped (one user's usage never affects another's), resets next calendar month, and /api/account/usage returns real current numbers. |
| `admin_exempt_test.py` | Admins are exempt from every plan limit (reports, comparisons, Pulse monitors) via app/lib/plans.js, while a regular account is still genuinely limited -- the exemption doesn't accidentally disable enforcement for everyone. |
| `audit_fixes_test.py` | A pre-Paddle audit pass: account deletion now also removes Pulse monitors (and their cascaded snapshots/reviews/alerts) instead of orphaning them; account/me and update-name reject the instant a session's underlying user row is gone rather than silently no-op'ing; /api/history enforces the report limit directly (not just /api/analyze, which only gates the AI call) so bypassing analyze can't write unlimited reports; search-app and app-icon (both public, no sign-in) are now IP rate-limited; avatar upload, account deletion, and the public token-based unsubscribe link are now rate-limited too (previously the only unprotected mutations). |
| `share_links_test.py` | Public read-only report links: only the owner can create / read / revoke one (another user and anonymous get 404/401), the link is an unguessable 32-char token that's idempotent until revoked, the public page opens with no sign-in without leaking the owner's email and is noindex / disallowed in robots, revoking (or deleting the report or the account) kills the link at once, a new share issues a new token, the token never appears in the normal report API, and management is rate-limited. |
| `tasks_test.py` | The Tasks feature (per-app to-do list built from the latest report): reports of one app group into one project (by store id, even after a rename), statuses (to do / done / won't do) persist and are owner-only (another user 404, anonymous 401), unknown categories/statuses refused, a re-scan keeps "won't do", puts an item ticked "done" back to to-do as "came back" if the new scan still flags it, flags new issues, lists scan-confirmed fixes, the report page shows statuses read-only, earlier per-report ticks are migrated once, account deletion clears them, rate-limited; also the score history the trend chart uses (same app only, oldest first, per-lens scores, never another user's reports). |
| `pulse_competitors_test.py` | Competitor tracking on Pulse, against the real App Store: add (store defaults to the parent's), the comparison fields the table needs, competitors aren't listed or counted as the user's own apps, can't nest, duplicate / own-app / bad-id rules, the Free plan's 1-per-app limit (admins exempt), owner-only (another user 404, anonymous 401), removing one leaves the app alone, deleting the app or the account removes them. |
| `pulse_compare_test.mjs` | Unit test of the competitor comparison numbers (latest rating/version, updates seen since tracking began, share of 1-2 star reviews, complaint topics, rating gap, empty/garbage input). `node tests/integration/pulse_compare_test.mjs`. |
| `task_export_test.mjs` | Unit test of the Tasks export (Markdown checklist / CSV): quote and newline handling, a BOM so Excel reads UTF-8, spreadsheet-formula neutralization (cells starting with = + - @), markdown/HTML escaping, safe file names. The endpoint itself (owner-only, attachment headers, no caching, bad format) is covered in `tasks_test.py`. |
| `projects_test.mjs` | Unit test of the project grouping and task computation (`node tests/integration/projects_test.mjs`). |
| `finding_progress_test.mjs` | Unit test of the report-to-report comparison (`node tests/integration/finding_progress_test.mjs`). |
| `secrets_test.mjs` | Unit test of the key-reading and redaction helpers (no server or database needed: `node tests/integration/secrets_test.mjs`). |
| `email_from_test.mjs` | Unit test of the EMAIL_FROM fallback/warning logic (no server or database needed: `node tests/integration/email_from_test.mjs`). |
| `review_signals_test.mjs` | Unit test of the review-derived Performance/Compatibility signals (keyword counts in several languages, each review counted once, device / iOS-version parsing, empty/garbage input) and of the sanitizer for the AI's extra sections (clamped lengths, bad enums coerced, exact server counts override model numbers, sections dropped when there's no evidence). `node tests/integration/review_signals_test.mjs`. |
| `report_path_test.mjs` | Unit test of the readable report URLs (`/console/reports/43-instagram`): slug generation (Turkish letters, accents, symbols, trademark sign, non-Latin names) and id parsing, including hostile input. `node tests/integration/report_path_test.mjs`. |
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
