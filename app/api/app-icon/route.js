import { fetchAppStoreListing } from "../../lib/reviews";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const storeUrl = searchParams.get("storeUrl");
    if (!storeUrl) {
      return Response.json({ error: "storeUrl gerekli." }, { status: 400 });
    }
    const listing = await fetchAppStoreListing(storeUrl);
    return Response.json({ iconUrl: listing?.iconUrl || null });
  } catch (err) {
    return Response.json({ iconUrl: null });
  }
}
