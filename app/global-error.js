"use client";

import { useEffect } from "react";

// Only fires if the root layout itself throws (rare -- app/error.js catches everything below
// it). Next requires this file to render its own <html>/<body>, so it can't lean on the
// providers or globals.css that normally supply theme/fonts -- plain inline styles only.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "24px",
          fontFamily: "Arial, Helvetica, sans-serif",
          background: "#14151A",
          color: "#F5F3EE",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 10px" }}>Something went wrong</h1>
        <p style={{ fontSize: 16, color: "#9096A3", maxWidth: 420, margin: "0 0 32px", lineHeight: 1.6 }}>
          That&apos;s on us. Please try again, and if it keeps happening, let our support team know.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            height: 48,
            padding: "0 28px",
            borderRadius: 999,
            background: "#7C6BFF",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
