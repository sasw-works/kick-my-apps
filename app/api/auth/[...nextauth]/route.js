import { handlers } from "../../../../auth";
import { ensureAuthSchema } from "../../../lib/ensureAuthSchema";

async function GET(req) {
  await ensureAuthSchema();
  return handlers.GET(req);
}
async function POST(req) {
  await ensureAuthSchema();
  return handlers.POST(req);
}

export { GET, POST };
