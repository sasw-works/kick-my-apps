import { sql } from "@vercel/postgres";

// Everything we hold about a user, in one place. Both "delete my account" and the admin's
// "delete this user" go through here -- they used to each carry their own copy of this list, and
// both had forgotten the same tables (comparisons, and the weekly-digest subscription, which would
// have kept emailing someone who had deleted their account).
//
// Some of these tables are created lazily the first time their feature is used, so a missing table
// just means there's nothing to delete. The user row goes last: if anything fails halfway, the
// account still exists and the deletion can simply be retried, instead of leaving orphaned data
// with no owner to retry it.

async function ignoreMissingTable(run) {
  try {
    await run();
  } catch (err) {
    if (err?.code === "42P01" || /does not exist/i.test(err?.message || "")) return;
    throw err;
  }
}

export async function deleteUserData({ id, email }) {
  await ignoreMissingTable(() => sql`DELETE FROM accounts WHERE "userId" = ${id}`);
  await ignoreMissingTable(() => sql`DELETE FROM sessions WHERE "userId" = ${id}`);
  await ignoreMissingTable(() => sql`DELETE FROM scans WHERE user_email = ${email}`);
  await ignoreMissingTable(() => sql`DELETE FROM comparisons WHERE user_email = ${email}`);
  await ignoreMissingTable(() => sql`DELETE FROM subscriptions WHERE email = ${email}`);
  await ignoreMissingTable(() => sql`DELETE FROM email_codes WHERE email = ${email}`);
  await sql`DELETE FROM users WHERE id = ${id}`;
}
