"use client";

// Thin shared building block for loading states (app/globals.css has the actual .kma-skeleton
// pulse animation, shared by everything that uses this). Pages compose it into the shape of
// whatever's still loading -- a table row, a card, an avatar -- so the page doesn't jump when
// real content replaces it.
export function SkeletonBlock({ width = "100%", height = 14, radius = 6, style, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`kma-skeleton ${className}`}
      style={{ display: "block", width, height, borderRadius: radius, flexShrink: 0, ...style }}
    />
  );
}
