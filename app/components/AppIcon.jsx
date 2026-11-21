"use client";

import React, { useEffect, useState } from "react";

export default function AppIcon({ name, size = 40, iconUrl, storeUrl, radius = 10 }) {
  const [fetchedUrl, setFetchedUrl] = useState(null);
  const src = iconUrl || fetchedUrl;

  useEffect(() => {
    if (iconUrl || !storeUrl) return;
    let cancelled = false;
    fetch(`/api/app-icon?storeUrl=${encodeURIComponent(storeUrl)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.iconUrl) setFetchedUrl(d.iconUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [iconUrl, storeUrl]);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{
          borderRadius: radius,
          flexShrink: 0,
          objectFit: "cover",
          border: "1px solid var(--ink-3)",
          boxSizing: "border-box",
        }}
      />
    );
  }

  const letter = (name || "?").trim().charAt(0).toUpperCase();
  const hue = Array.from(name || "").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.38,
        background: `hsl(${hue}, 65%, 45%)`,
      }}
    >
      {letter}
    </div>
  );
}
