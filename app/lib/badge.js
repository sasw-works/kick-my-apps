// The "App Health" badge: a small flat SVG, "app health | 82/100", coloured by score. Pure and
// built only from a validated integer score (or the word "unavailable"), never from report text,
// so nothing user-supplied reaches the markup.

export const scoreColor = (s) => (s >= 80 ? "#2e9e5b" : s >= 60 ? "#d9a21b" : "#d64545");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const textW = (s) => Math.round(String(s).length * 6.4 + 12);

export function healthBadgeSvg(score) {
  const valid = Number.isInteger(score) && score >= 0 && score <= 100;
  const label = "app health";
  const value = valid ? `${score}/100` : "unavailable";
  const color = valid ? scoreColor(score) : "#9a9a9a";
  const lw = textW(label), vw = textW(value), w = lw + vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
<title>${esc(label)}: ${esc(value)}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#555"/><rect x="${lw}" width="${vw}" height="20" fill="${color}"/><rect width="${w}" height="20" fill="url(#s)"/></g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${lw / 2}" y="14">${esc(label)}</text><text x="${lw + vw / 2}" y="14" font-weight="bold">${esc(value)}</text></g>
</svg>`;
}
