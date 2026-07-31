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

export default function UploadFlow({ onAnalyze, analyzing, errorMessage, onViewHistory }) {
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

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...incoming].slice(0, 12));
  }, []);

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
    <div className="upload-root">
      <style>{`
        .upload-root {
          --font-display: 'Inter', sans-serif;
          --font-body: 'Inter', sans-serif;
          --font-mono: 'Inter', sans-serif;

          position: relative;
          background: var(--ink);
          color: var(--chalk);
          font-family: var(--font-body);
          min-height: 100%;
          border-radius: 12px;
          padding: 0 32px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .hero-bg-wrap {
          position: absolute;
          top: 0;
          left: 50%;
          width: 100vw;
          margin-left: -50vw;
          height: 620px;
          max-height: 100vh;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 45%, transparent 90%);
          mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 45%, transparent 90%);
        }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.45;
          pointer-events: none;
          z-index: 0;
        }
        .blob-1 { width: 102vw; height: 102vw; max-width: 1140px; max-height: 1140px; background: #C9E86A; top: -60px; left: 24%; }
        .blob-2 { width: 102vw; height: 102vw; max-width: 1140px; max-height: 1140px; background: #6FC6F5; top: 120px; right: 12%; }
        .blob-3 { width: 75vw; height: 75vw; max-width: 810px; max-height: 810px; background: #7EE6C4; top: 60px; left: 28%; }
        .blob-4 { width: 55vw; height: 55vw; max-width: 600px; max-height: 600px; background: #FDE788; top: -20px; left: 6%; }
        .blob-5 { width: 60vw; height: 60vw; max-width: 640px; max-height: 640px; background: #B9A6F5; top: 220px; right: -4%; }

        .upload-hero { text-align: center; margin-top: 125px; margin-bottom: 0; max-width: 1170px; position: relative; z-index: 1; }

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
          .hero-title { font-size: 42px; }
        }
        .hero-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 20px;
          color: #1A2B3B;
          line-height: 1.5;
          margin-top: 24px;
          margin-bottom: 53px;
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
          gap: 10px;
          margin-bottom: 20px;
        }
        .hero-search-anchor { position: relative; }
        .hero-search-pill {
          width: 620px;
          height: 75px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--ink-2);
          border: none;
          border-radius: 999px;
          padding: 16px 28px;
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
          font-size: 15px;
        }
        .hero-search-pill input::placeholder { color: var(--muted); }
        .kbd-hint {
          font-family: var(--font-mono); font-size: 11px; color: var(--muted);
          background: var(--ink-3); border: 1px solid var(--ink-3); border-radius: 6px;
          padding: 3px 7px; flex-shrink: 0;
        }
        .history-link {
          margin-top: 10px;
          background: transparent;
          border: none;
          color: var(--muted);
          font-family: var(--font-body);
          font-size: 12.5px;
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
          width: 270px;
          height: 75px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          flex-shrink: 0;
          white-space: nowrap;
          background: var(--ink-2);
          border: none;
          border-radius: 999px;
          padding: 16px 24px;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .upload-pill span { font-size: 15px; color: var(--chalk); }
        .upload-pill:hover { border-color: var(--muted); }
        .dropzone-active { background: var(--ink-3); }

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

        @media (max-width: 780px) {
          .hero-input-row { flex-wrap: wrap; }
          .hero-search-pill { width: 100%; height: 72px; }
          .upload-pill { flex: 1; width: auto; height: 72px; justify-content: center; }
          .submit-circle { width: 72px; height: 72px; }
        }

        .thumb-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
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
          overflow: hidden;
          box-shadow: var(--shadow);
        }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }
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
          gap: 10px;
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 10px;
          padding: 12px 14px;
          box-shadow: var(--shadow);
          transition: border-color 0.15s ease;
        }
        .url-input-wrap:focus-within { border-color: var(--brand); }
        .url-input-wrap input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--chalk);
          font-size: 13.5px;
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
          border-radius: 10px;
          overflow: hidden;
          z-index: 20;
          box-shadow: none;
        }
        .suggestion-row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
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
          border-radius: 7px;
          background: var(--ink-3);
          flex-shrink: 0;
          object-fit: cover;
        }
        .suggestion-text { min-width: 0; }
        .suggestion-name {
          font-size: 13px;
          color: var(--chalk);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .suggestion-dev {
          font-size: 11.5px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .spin { animation: kma-spin 0.9s linear infinite; }
        @keyframes kma-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .skeleton-card {
          width: 100%; max-width: 640px; margin-top: 20px;
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 14px; padding: 20px;
        }
        .skeleton-row { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }
        .skeleton-circle {
          width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(90deg, var(--ink-3) 25%, var(--ink) 50%, var(--ink-3) 75%);
          background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite;
        }
        .skeleton-bar {
          height: 12px; border-radius: 6px;
          background: linear-gradient(90deg, var(--ink-3) 25%, var(--ink) 50%, var(--ink-3) 75%);
          background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="hero-bg-wrap">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="blob blob-4" />
        <div className="blob blob-5" />
      </div>

      <div className="upload-hero">
        <h1 className="hero-title">
          <span style={{ whiteSpace: "nowrap" }}>Uncover what really</span>
          <br />
          hurts your app
        </h1>
      </div>
      <p className="hero-subtitle">
        Enter your app and - or upload screenshots to uncover UI issues, usability problems, and
        opportunities for improvement with AI so you can make smarter decisions and build a
        better product
      </p>

      <div className="hero-input-row">
        <div className="hero-search-anchor">
          <div className="hero-search-pill">
            <Search size={18} color="var(--muted)" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search any app…"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />
            {searching && <Loader2 size={16} className="spin" color="var(--muted)" />}
            {selectedApp && !searching && <Check size={17} color="var(--teal)" />}
            {!query && !searching && <kbd className="kbd-hint">⌘K</kbd>}
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
          <UploadIcon size={14} color="var(--muted)" />
          <span>{files.length > 0 ? `${files.length} screenshots selected` : "Upload screens"}</span>
        </label>

        <button className="submit-circle" disabled={!canAnalyze} onClick={handleAnalyze} aria-label="Analiz Et">
          {analyzing ? <Loader2 size={20} className="spin" color="var(--ink)" /> : <ArrowRight size={20} />}
        </button>
      </div>

      {files.length > 0 && (
        <div className="thumb-row" style={{ marginTop: 14 }}>
          {files.map((f, i) => (
            <div className="thumb" key={i}>
              <img src={URL.createObjectURL(f)} alt={f.name} />
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

        {analyzing && (
          <div className="skeleton-card">
            <div className="skeleton-row">
              <div className="skeleton-circle" />
              <div style={{ flex: 1 }}>
                <div className="skeleton-bar" style={{ width: "40%" }} />
                <div className="skeleton-bar" style={{ width: "70%", marginTop: 8 }} />
              </div>
            </div>
            <div className="skeleton-bar" style={{ width: "100%", marginTop: 18 }} />
            <div className="skeleton-bar" style={{ width: "85%", marginTop: 10 }} />
            <div className="skeleton-bar" style={{ width: "92%", marginTop: 10 }} />
          </div>
        )}
      </div>
    </div>
  );
}
