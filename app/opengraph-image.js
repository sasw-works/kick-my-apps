import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kick My Apps — Find what's hurting your app.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F6F8FA",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#533AFD" }} />
          <div style={{ fontSize: 36, fontWeight: 700, color: "#1A1F36" }}>Kick My Apps</div>
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#1A1F36",
            textAlign: "center",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            maxWidth: 880,
          }}
        >
          Find what's hurting your app.
        </div>
        <div style={{ fontSize: 26, color: "#697386", marginTop: 28 }}>
          AI-powered mobile app health report
        </div>
      </div>
    ),
    { ...size }
  );
}
