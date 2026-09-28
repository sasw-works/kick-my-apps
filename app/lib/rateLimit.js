import { sql } from "@vercel/postgres";

// A small fixed-window rate limiter kept in Postgres, so it's shared by every serverless instance
// (an in-memory counter would reset on each cold start and only see its own instance's traffic).
//
// One atomic upsert per check: the row either starts a new window or bumps the counter, and the
// resulting count comes back in the same statement, so concurrent requests can't both slip under
// the limit.

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      window_start TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  ensured = true;
}

export async function rateLimit(key, { limit, windowSeconds }) {
  await ensureTable();
  const { rows } = await sql`
    INSERT INTO rate_limits AS r (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN r.window_start <= now() - (${windowSeconds}::int * interval '1 second')
                   THEN 1 ELSE r.count + 1 END,
      window_start = CASE WHEN r.window_start <= now() - (${windowSeconds}::int * interval '1 second')
                          THEN now() ELSE r.window_start END
    RETURNING count, window_start
  `;
  const { count, window_start } = rows[0];

  // Every so often, sweep windows that ended long ago so the table doesn't grow forever.
  if (Math.random() < 0.02) {
    await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`;
  }

  const elapsed = (Date.now() - new Date(window_start).getTime()) / 1000;
  return {
    allowed: count <= limit,
    count,
    limit,
    retryAfter: Math.max(1, Math.ceil(windowSeconds - elapsed)),
  };
}

export function getClientIp(req) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip")) || "unknown";
}

export function tooManyRequests({ retryAfter }) {
  const wait = retryAfter < 90 ? `${retryAfter} seconds` : `${Math.ceil(retryAfter / 60)} minutes`;
  return Response.json(
    { error: `Too many requests. Please try again in ${wait}.`, code: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
