"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { UploadCloud, Search, Check, Loader2, X, Sparkles, FileText } from "lucide-react";

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

        .hero-bg-wrap { position: relative; width: 100%; display: flex; justify-content: center; }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.55;
          animation-name: blob-move;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          pointer-events: none;
          z-index: 0;
        }
        .blob-1 { width: 65vw; height: 65vw; max-width: 780px; max-height: 780px; background: #FBCFE8; top: 20px; left: -18%; animation-duration: 18s; }
        .blob-2 { width: 60vw; height: 60vw; max-width: 720px; max-height: 720px; background: #BBF7D0; top: -60px; right: -14%; animation-duration: 21s; animation-delay: -4s; }
        .blob-3 { width: 55vw; height: 55vw; max-width: 660px; max-height: 660px; background: #C7D2FE; top: 260px; left: 28%; animation-duration: 15s; animation-delay: -8s; }
        @keyframes blob-move {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, 24px) scale(1.1); }
          66% { transform: translate(-24px, 30px) scale(0.94); }
        }
        @media (max-width: 720px) {
          .blob { display: none; }
        }

        .upload-hero { text-align: center; margin-top: 100px; margin-bottom: 53px; max-width: 720px; position: relative; z-index: 1; }

        .hero-title {
          font-family: var(--font-display);
          font-size: 86px;
          font-weight: 500;
          letter-spacing: -0.025em;
          line-height: 1.08;
          color: var(--chalk);
          margin: 0;
        }
        @media (max-width: 720px) {
          .hero-title { font-size: 42px; }
        }

        .hero-search-wrap {
          position: relative;
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 36px;
        }
        .hero-search-anchor { position: relative; width: 100%; }
        .hero-search-pill {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 999px;
          padding: 16px 22px;
          transition: border-color 0.15s ease;
        }
        .hero-search-pill:focus-within { border-color: var(--kick); }
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
        .hero-search-hint { font-size: 12.5px; color: var(--muted); margin-top: 35px; text-align: center; }
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
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          border: 2px dashed var(--ink-3);
          border-radius: 14px;
          padding: 32px 20px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
          box-sizing: border-box;
        }
        .dropzone-active { border-color: var(--kick); background: var(--ink-2); }
        .dropzone:hover { border-color: var(--muted); }
        .dropzone-label { font-size: 14.5px; color: var(--chalk); margin-top: 14px; font-weight: 600; }
        .dropzone-hint { font-size: 12px; color: var(--muted); margin-top: 4px; }
        .dropzone-btn {
          display: inline-block;
          margin-top: 16px;
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          color: var(--chalk);
          font-size: 13px;
          font-weight: 500;
          padding: 8px 18px;
          border-radius: 999px;
          box-shadow: var(--shadow);
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
        .url-input-wrap:focus-within { border-color: var(--kick); }
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

        .analyze-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--kick);
          color: var(--ink);
          font-weight: 700;
          font-size: 14.5px;
          padding: 14px 20px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }
        .analyze-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .spin { animation: kma-spin 0.9s linear infinite; }
        @keyframes kma-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="hero-bg-wrap">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="upload-hero">
          <h1 className="hero-title">
            Ready to
            <br />
            Kick Your Apps
          </h1>
        </div>
      </div>

      <div className="hero-search-wrap">
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

        <div className="hero-search-hint">
          {selectedApp
            ? "App Store'dan eşleşti — yorumlar da analize dahil edilecek."
            : "Listeden seçmezsen sadece ekran görüntüsü analizi yapılır."}
        </div>
      </div>

      <div className="upload-card">
        <div>
          <label
            className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
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
            <FileText size={30} color="var(--muted)" strokeWidth={1.4} style={{ margin: "0 auto" }} />
            <div className="dropzone-label">Ekran görüntülerini sürükle bırak</div>
            <div className="dropzone-hint">En fazla 12 görsel · PNG, JPG</div>
            <span className="dropzone-btn">Dosya Seç</span>
          </label>

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
        </div>

        <button className="analyze-btn" disabled={!canAnalyze} onClick={handleAnalyze}>
          {analyzing ? (
            <>
              <Loader2 size={17} className="spin" />
              Analiz ediliyor…
            </>
          ) : (
            <>
              <Sparkles size={17} strokeWidth={2.3} />
              Analiz Et
            </>
          )}
        </button>
        {errorMessage && (
          <div style={{ color: "var(--kick)", fontSize: 13, textAlign: "center" }}>{errorMessage}</div>
        )}
      </div>
    </div>
  );
}
