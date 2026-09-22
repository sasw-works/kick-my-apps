"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Search, Check, Loader2, X, ArrowRight } from "lucide-react";

function UploadIcon({ size = 20, color = "#222B45" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0.705078 15.7092V18.7051H18.7051V15.7051M14.2051 5.20508L9.70508 0.705078L5.20508 5.20508M9.70093 13.7051V0.705078"
        stroke={color}
        strokeWidth="1.41"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function UploadFlow({ onAnalyze, analyzing, errorMessage, onViewHistory, variant = "default" }) {
  const dark = variant === "dark"; // "dark" = KMA Dark hero from Figma (home); "default" = legacy look (console)
  const [files, setFiles] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState(null); // { name, storeUrl, icon, developer }
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const debounceRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const compressImage = useCallback(async (file, maxDim = 1600, quality = 0.82) => {
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;
      if (width <= maxDim && height <= maxDim && file.size < 1.2 * 1024 * 1024) {
        // Zaten yeterince küçük, dokunma.
        return file;
      }
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, width, height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    } catch {
      return file;
    }
  }, []);

  const addFiles = useCallback(
    async (fileList) => {
      const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
      const compressed = await Promise.all(incoming.map((f) => compressImage(f)));
      setFiles((prev) => [...prev, ...compressed].slice(0, 12));
    },
    [compressImage]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Yazarken 3+ karakterden sonra, kısa bir gecikmeyle öneri ara.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (selectedApp && query === selectedApp.name) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search-app?term=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSelect = (app) => {
    setSelectedApp(app);
    setQuery(app.name);
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleQueryChange = (val) => {
    setQuery(val);
    if (selectedApp && val !== selectedApp.name) {
      setSelectedApp(null); // önceki seçim artık geçerli değil
    }
  };

  const canAnalyze = query.trim().length > 0 && (files.length > 0 || selectedApp) && !analyzing;

  const handleAnalyze = () => {
    if (!canAnalyze) return;
    const appName = selectedApp ? selectedApp.name : query.trim();
    const storeUrl = selectedApp ? selectedApp.storeUrl : "";
    onAnalyze(files, storeUrl, appName);
  };

  return (
    <div className={`upload-root${dark ? " upload-root-dark" : ""}`}>
      <style>{`
        .upload-root {
          --font-display: var(--font-inter), sans-serif;
          --font-body: var(--font-inter), sans-serif;
          --font-mono: var(--font-inter), sans-serif;

          position: relative;
          background: var(--ink);
          color: var(--chalk);
          font-family: var(--font-body);
          min-height: 100%;
          border-radius: 8px;
          padding: 0 32px 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .hero-title-line { white-space: nowrap; }
        @media (max-width: 720px) {
          .hero-title-line { white-space: normal; } /* 19 chars at 48px is wider than a phone */
        }

        .upload-hero { text-align: center; margin-top: 150px; margin-bottom: 0; max-width: 1170px; position: relative; z-index: 1; }

        .hero-title {
          font-family: var(--font-display);
          font-size: 90px;
          font-weight: 700;
          letter-spacing: -0.025em;
          line-height: 1.08;
          color: #1A2B3B;
          margin: 0;
        }
        @media (max-width: 720px) {
          .hero-title { font-size: 48px; }
        }
        .hero-subtitle {
          font-family: var(--font-inter), sans-serif;
          font-size: 20px;
          color: #1A2B3B;
          line-height: 1.5;
          margin-top: 24px;
          margin-bottom: 48px;
          margin-left: auto;
          margin-right: auto;
          width: 100%;
          max-width: 1170px;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .hero-input-row {
          position: relative;
          z-index: 5;
          width: 100%;
          max-width: 1170px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .hero-search-anchor { position: relative; }
        .hero-search-pill {
          width: 640px;
          height: 75px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--ink-2);
          border: none;
          border-radius: 999px;
          padding: 16px 32px;
          transition: border-color 0.15s ease;
        }
        .hero-search-pill:focus-within { border-color: var(--brand); }
        .hero-search-pill input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--chalk);
          font-family: var(--font-body);
          font-size: 16px;
        }
        .hero-search-pill input::placeholder { color: var(--muted); }
        .kbd-hint {
          font-family: var(--font-mono); font-size: 11px; color: var(--muted);
          background: var(--ink-3); border: 1px solid var(--ink-3); border-radius: 4px;
          padding: 4px 8px; flex-shrink: 0;
        }
        .history-link {
          margin-top: 12px;
          background: transparent;
          border: none;
          color: var(--muted);
          font-family: var(--font-body);
          font-size: 12px;
          text-decoration: underline;
          cursor: pointer;
        }

        .upload-card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1170px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .upload-pill {
          width: 250px;
          height: 75px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-shrink: 0;
          white-space: nowrap;
          background: var(--ink-2);
          border: none;
          border-radius: 999px;
          padding: 16px 24px;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
          position: relative;
        }
        .upload-pill span { font-size: 16px; color: var(--muted); }
        .upload-pill:hover { border-color: var(--muted); }
        .dropzone-active { background: var(--ink-3); }
        .upload-pill-tooltip {
          position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%) translateY(6px);
          width: 260px; white-space: normal; text-align: left;
          background: var(--chalk); color: var(--ink-2); font-size: 12px; line-height: 1.5;
          padding: 12px 16px; border-radius: 8px; box-shadow: 0 10px 24px rgba(20,33,61,0.16);
          opacity: 0; pointer-events: none; transition: opacity 0.18s ease, transform 0.18s ease; z-index: 20;
        }
        .upload-pill-tooltip::after {
          content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          border: 6px solid transparent; border-top-color: var(--chalk);
        }
        .upload-pill:hover .upload-pill-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }

        .submit-circle {
          width: 75px;
          height: 75px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1A2B3B;
          color: var(--ink);
          border: none;
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .submit-circle:not(:disabled):hover { transform: translateY(-2px); }
        .submit-circle:disabled {
          background: var(--ink-3);
          color: var(--muted);
          cursor: not-allowed;
        }
        .submit-circle.submit-circle-analyzing,
        .submit-circle.submit-circle-analyzing:disabled {
          background: #533AFE;
          cursor: default;
        }

        @media (max-width: 780px) {
          .hero-input-row { flex-wrap: wrap; }
          .hero-search-pill { width: 100%; height: 72px; }
          .upload-pill { flex: 1; width: auto; height: 72px; justify-content: center; }
          .submit-circle { width: 72px; height: 72px; }
        }


        /* ---- KMA Dark hero (Figma 4087:51): home only, see variant="dark" ---- */
        .upload-root.upload-root-dark { background: transparent; padding-bottom: 0; }
        .upload-root-dark .upload-card { margin-top: 24px; }
        .upload-root-dark .upload-card:empty { display: none; }
        /* Figma "Hero" 4087:51 — 1170 wide, title starts 150px below the header */
        .upload-root-dark .upload-hero { text-align: center; margin-top: 150px; margin-bottom: 0; width: 100%; max-width: 1170px; position: relative; z-index: 1; }

        /* 4086:44 — 90/85, -0.02em, gradient text (171.73deg #fff -> #71717a) */
        .upload-root-dark .hero-title {
          font-family: var(--font-display);
          font-size: 90px;
          font-weight: 500;
          font-optical-sizing: auto; /* opsz clamps to 32 = Inter Display, the closest cut to Neue Haas Display */
          letter-spacing: -0.0333em; /* -3px at 90px: lands the lines at Figma's 728 / 530px */
          line-height: 0.9444;
          /* background-clip:text only paints inside the box; the 85px line box is shorter than the glyphs,
             so extend the paint area and cancel it with a negative margin (layout stays 2 x 85 = 170). */
          padding: 0.12em 0;
          margin: -0.12em 0;
          /* stops pulled in by 0.12em * |cos(171.73deg)| so the ramp equals Figma's over the original 170px box */
          background: linear-gradient(171.73deg, #ffffff 0.1188em, #71717a calc(100% - 0.1188em));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        @media (max-width: 720px) {
          .upload-root-dark .hero-title { font-size: 48px; }
        }
        @media (max-width: 720px) {
          .upload-root-dark .hero-title { font-size: 48px; }
        }
        /* 4086:45 — 20/32, -0.2px, #a1a1aa; 32 below the title, 75 above the search row */
        .upload-root-dark .hero-subtitle {
          font-family: var(--font-inter), sans-serif;
          font-size: 20px;
          font-weight: 400;
          color: var(--muted);
          line-height: 32px;
          letter-spacing: var(--ls-body);
          margin: 32px auto var(--gap-75);
          width: 100%;
          max-width: 1170px;
          text-align: center;
          position: relative;
          z-index: 1;
        }
        .upload-root-dark .hero-subtitle .hero-sub-line { display: block; }
        @media (max-width: 1240px) {
          .upload-root-dark .hero-subtitle .hero-sub-line { display: inline; }
        }

        /* 4085:21 — search (fill) + upload (271) + cta (92), gap 16 */
        .upload-root-dark .hero-input-row {
          position: relative;
          z-index: 5;
          width: 100%;
          max-width: 1170px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 0;
        }
        .upload-root-dark .hero-search-anchor { position: relative; flex: 1 1 0; min-width: 0; }

        /* 4071:660 / 4085:17 — glass pill: #263540 @50%, 1px #395c77, blur, h92 */
        .upload-root-dark .hero-search-pill,
        .upload-root-dark .upload-pill {
          box-sizing: border-box;
          height: 92px;
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 0 calc(var(--pad-42) - 1px); /* Figma strokes are inside: content starts at exactly 42px */
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 999px;
          -webkit-backdrop-filter: blur(var(--glass-blur));
          backdrop-filter: blur(var(--glass-blur));
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .upload-root-dark .hero-search-pill { width: 100%; }
        .upload-root-dark .hero-search-pill:focus-within { border-color: var(--blue-100); }
        .upload-root-dark .hero-icon { flex-shrink: 0; display: block; }
        .upload-root-dark .hero-search-pill input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          padding: 0; /* UA default 1px 2px shifted the text 2px off the Figma position */
          color: var(--chalk);
          font-family: var(--font-body);
          font-size: 20px;
          line-height: 32px;
          letter-spacing: var(--ls-body);
        }
        .upload-root-dark .hero-search-pill input::placeholder { color: var(--chalk); opacity: 1; }

        .upload-root-dark .upload-pill {
          width: 271px;
          flex-shrink: 0;
          white-space: nowrap;
          cursor: pointer;
          position: relative;
        }
        .upload-root-dark .upload-pill-icon { width: 18px; height: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .upload-root-dark .upload-pill-icon img { display: block; flex-shrink: 0; }
        .upload-root-dark .upload-pill-label { font-size: 20px; line-height: 32px; letter-spacing: var(--ls-body); color: var(--chalk); }
        .upload-root-dark .upload-pill:hover { border-color: var(--muted); }
        .upload-root-dark .dropzone-active { background: var(--ink-3); }
        .upload-root-dark .upload-pill-tooltip {
          position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%) translateY(6px);
          width: 260px; white-space: normal; text-align: left;
          background: var(--chalk); color: var(--ink-2); font-size: 12px; line-height: 1.5;
          padding: 12px 16px; border-radius: 8px; box-shadow: 0 10px 24px rgba(20,33,61,0.16);
          opacity: 0; pointer-events: none; transition: opacity 0.18s ease, transform 0.18s ease; z-index: 20;
        }
        .upload-root-dark .upload-pill-tooltip::after {
          content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          border: 6px solid transparent; border-top-color: var(--chalk);
        }
        .upload-root-dark .upload-pill:hover .upload-pill-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }

        /* 4074:17 — 92px blue circle + arrow (Figma asset); disabled = 40%, analyzing = spinner overlay */
        .upload-root-dark .submit-circle {
          position: relative;
          width: 92px;
          height: 92px;
          padding: 0;
          border: none;
          border-radius: 50%;
          background: transparent;
          flex-shrink: 0;
          display: block;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .upload-root-dark .submit-circle img { display: block; }
        .upload-root-dark .submit-circle:not(:disabled):hover { transform: translateY(-2px); }
        .upload-root-dark .submit-circle:disabled { opacity: 0.4; cursor: not-allowed; }
        .upload-root-dark .submit-circle.submit-circle-analyzing,
        .upload-root-dark .submit-circle.submit-circle-analyzing:disabled { opacity: 1; cursor: default; }
        .upload-root-dark .submit-spinner {
          position: absolute; inset: 0; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--blue-100);
        }

        @media (max-width: 780px) {
          .upload-root-dark .hero-input-row { flex-wrap: wrap; }
          .upload-root-dark .hero-search-anchor { flex: 1 1 100%; }
          .upload-root-dark .hero-search-pill,
        .upload-root-dark .upload-pill { padding: 0 24px; }
          .upload-root-dark .upload-pill { flex: 1; width: auto; }
        }


        .thumb-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .thumb {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 8px;
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow);
        }
        .thumb-img-wrap {
          width: 100%;
          height: 100%;
          border-radius: 8px;
          overflow: hidden;
        }
        .thumb-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .thumb-remove {
          position: absolute;
          top: -6px;
          right: -6px;
          background: var(--kick);
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
        }

        .field-label {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .url-input-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 8px;
          padding: 12px 16px;
          box-shadow: var(--shadow);
          transition: border-color 0.15s ease;
        }
        .url-input-wrap:focus-within { border-color: var(--brand); }
        .url-input-wrap input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--chalk);
          font-size: 14px;
          width: 100%;
        }
        .url-input-wrap input::placeholder { color: var(--muted); }

        .suggestion-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 8px;
          overflow: hidden;
          z-index: 20;
          box-shadow: none;
        }
        .suggestion-row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--ink-3);
          cursor: pointer;
          text-align: left;
        }
        .suggestion-row:last-child { border-bottom: none; }
        .suggestion-row:hover { background: var(--ink-3); }
        .suggestion-icon {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          background: var(--ink-3);
          flex-shrink: 0;
          object-fit: cover;
        }
        .suggestion-text { min-width: 0; }
        .suggestion-name {
          font-size: 14px;
          color: var(--chalk);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .suggestion-dev {
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .spin { animation: kma-spin 0.9s linear infinite; }
        @keyframes kma-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="upload-hero">
        <h1 className="hero-title">
          <span className="hero-title-line">Uncover what really</span>
          <br />
          hurts your app
        </h1>
      </div>
      <p className="hero-subtitle">
        <span className="hero-sub-line">
          Enter your app name or upload screenshots to uncover UI issues, usability problems, and quick wins
        </span>{" "}
        <span className="hero-sub-line">powered by AI, so you can ship a better product, faster.</span>
      </p>

      <div className="hero-input-row">
        <div className="hero-search-anchor">
          <div className="hero-search-pill">
            {dark ? (
              <img className="hero-icon" src="/dark/hero-icon-search.svg" alt="" width={18.0408} height={18} />
            ) : (
              <Search size={18} color="var(--muted)" />
            )}
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Search any app"
              placeholder={dark ? "Search any app..." : "Search any app…"}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />
            {searching && <Loader2 size={16} className="spin" color="var(--muted)" />}
            {selectedApp && !searching && <Check size={17} color="var(--teal)" />}
            {!dark && !query && !searching && <kbd className="kbd-hint">⌘K</kbd>}
          </div>

          {showDropdown && suggestions.length > 0 && (
            <div className="suggestion-dropdown">
              {suggestions.map((app) => (
                <button
                  key={app.trackId}
                  className="suggestion-row"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(app)}
                >
                  {app.icon ? (
                    <img src={app.icon} alt="" className="suggestion-icon" />
                  ) : (
                    <div className="suggestion-icon" />
                  )}
                  <div className="suggestion-text">
                    <div className="suggestion-name">{app.name}</div>
                    <div className="suggestion-dev">{app.developer}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <label
          className={`upload-pill ${dragActive ? "dropzone-active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            style={{ display: "none" }}
            onChange={(e) => addFiles(e.target.files)}
          />
          {dark ? (
            <span className="upload-pill-icon">
              <img src="/dark/hero-icon-upload.svg" alt="" width={19.41} height={19.41} />
            </span>
          ) : (
            <UploadIcon size={14} color="var(--muted)" />
          )}
          <span className="upload-pill-label" style={dark ? undefined : { color: files.length > 0 ? "var(--chalk)" : "var(--muted)" }}>
            {files.length > 0 ? `${files.length} screenshots selected` : dark ? "Upload screens" : "Upload UI screens"}
          </span>
          <div className="upload-pill-tooltip">
            Optionally add up to 12 image screenshots (PNG, JPG, WEBP, etc., not design files like Figma) so we can spot UX, UI, and product-level issues in your design and suggest improvements.
          </div>
        </label>

        <button className={`submit-circle ${analyzing ? "submit-circle-analyzing" : ""}`} disabled={!canAnalyze} onClick={handleAnalyze} aria-label="Analiz Et">
          {dark ? (
            <>
              <img src="/dark/hero-cta.svg" alt="" width={92} height={92} />
              {analyzing && (
                <span className="submit-spinner">
                  <Loader2 size={20} className="spin" color="#FFFFFF" />
                </span>
              )}
            </>
          ) : analyzing ? (
            <Loader2 size={20} className="spin" color="#FFFFFF" />
          ) : (
            <ArrowRight size={20} />
          )}
        </button>
      </div>

      {files.length > 0 && (
        <div className="thumb-row" style={{ marginTop: 14 }}>
          {files.map((f, i) => (
            <div className="thumb" key={i}>
              <div className="thumb-img-wrap">
                <img src={URL.createObjectURL(f)} alt={f.name} />
              </div>
              <button
                className="thumb-remove"
                onClick={(e) => {
                  e.preventDefault();
                  removeFile(i);
                }}
              >
                <X size={11} color="var(--ink)" strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="upload-card">
        {errorMessage && (
          <div style={{ color: "var(--kick)", fontSize: 13, textAlign: "center" }}>{errorMessage}</div>
        )}
      </div>
    </div>
  );
}
