# Pastel gradient-blob header effect — saved for the future light theme

Removed from live pages on 2026-09-23 at the user's request. The dark theme uses
`.kma-glow` (see `globals.css` and `ConditionalChrome.jsx`) instead. Keep this file
so the effect can be dropped back in without digging through git history.

Markup (same shape in both places it was used):

```jsx
<div className="hero-bg-wrap">
  <div className="blob blob-1" />
  <div className="blob blob-2" />
  <div className="blob blob-3" />
  <div className="blob blob-4" />
  <div className="blob blob-5" />
</div>
```

Shared CSS shape:

```css
.hero-bg-wrap {
  position: absolute;
  top: -100px;
  left: 50%;
  width: 100vw;
  margin-left: -50vw;
  height: 900px; /* 700px on the Support page variant */
  max-height: 100vh;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 55%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 55%, transparent 100%);
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.45;
  pointer-events: none;
}
.blob-1 { width: 102vw; height: 102vw; max-width: 1140px; max-height: 1140px; top: -60px; left: 24%; }
.blob-2 { width: 102vw; height: 102vw; max-width: 1140px; max-height: 1140px; top: 120px; right: 12%; }
.blob-3 { width: 75vw;  height: 75vw;  max-width: 810px;  max-height: 810px;  top: 60px;  left: 28%; }
.blob-4 { width: 55vw;  height: 55vw;  max-width: 600px;  max-height: 600px;  top: -20px; left: 6%; }
.blob-5 { width: 60vw;  height: 60vw;  max-width: 640px;  max-height: 640px;  top: 220px; right: -4%; }
```

## Home page ("KMA" white version) — original hero, from commit `0d16a60`, `UploadFlow.jsx`
Height 900px. Colors:
- blob-1 `#C9E86A` (lime)
- blob-2 `#6FC6F5` (sky blue)
- blob-3 `#7EE6C4` (mint)
- blob-4 `#FDE788` (yellow)
- blob-5 `#B9A6F5` (lavender)

## Support page — from `app/support/page.js`, removed 2026-09-23
Height 700px. Colors (slightly softer palette):
- blob-1 `#A8C9F0` (light blue)
- blob-2 `#C7B6F5` (lavender)
- blob-3 `#8FDDD1` (teal)
- blob-4 `#F5C9E8` (pink)
- blob-5 `#B9A6F5` (purple)
