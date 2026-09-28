import { handlers } from "../../../../auth";
import { ensureAuthSchema } from "../../../lib/ensureAuthSchema";

// Sign-in flows (credentials, OAuth callbacks) need the auth tables. Reading an existing session
// does not -- sessions are stateless JWTs -- and the client polls /session on every page load.
// Keeping that request off the database means a brief DB outage doesn't make every signed-in user
// look signed out.
const NO_DB_NEEDED = /\/(session|csrf|providers|signout)$/;

async function prepare(req) {
  if (!NO_DB_NEEDED.test(new URL(req.url).pathname)) await ensureAuthSchema();
}

async function GET(req) {
  await prepare(req);
  return handlers.GET(req);
}
async function POST(req) {
  await prepare(req);
  return handlers.POST(req);
}

export { GET, POST };
