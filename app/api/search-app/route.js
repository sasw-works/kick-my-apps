export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const term = (searchParams.get("term") || "").trim();

  if (term.length < 3) {
    return Response.json({ results: [] });
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      term
    )}&entity=software&country=tr&limit=8`;
    const res = await fetch(url);
    if (!res.ok) {
      return Response.json({ results: [] });
    }
    const data = await res.json();

    const results = (data.results || []).map((r) => ({
      trackId: r.trackId,
      name: r.trackName,
      developer: r.sellerName || r.artistName || "",
      icon: r.artworkUrl100 || r.artworkUrl60,
      storeUrl: r.trackViewUrl,
    }));

    return Response.json({ results });
  } catch (err) {
    console.error(err);
    return Response.json({ results: [] });
  }
}
