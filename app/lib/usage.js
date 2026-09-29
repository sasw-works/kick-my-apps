import { sql } from "@vercel/postgres";

// "This month" means the current calendar month in UTC (Postgres' now() on Vercel is UTC), matching
// the "resets monthly... started the 1st" text on the Account page. Two separate functions rather
// than one parameterized by table name: @vercel/postgres's tagged template can only parametrize
// values, not identifiers, so the table name has to be written out in each query rather than
// interpolated.

export async function countReportsThisMonth(email) {
  const { rows } = await sql`
    SELECT COUNT(*)::int AS n FROM scans
    WHERE user_email = ${email} AND created_at >= date_trunc('month', now())
  `;
  return rows[0].n;
}

export async function countComparisonsThisMonth(email) {
  const { rows } = await sql`
    SELECT COUNT(*)::int AS n FROM comparisons
    WHERE user_email = ${email} AND created_at >= date_trunc('month', now())
  `;
  return rows[0].n;
}
