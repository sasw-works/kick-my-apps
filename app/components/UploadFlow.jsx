"use client";

import React, { useState, useCallback } from "react";
import { UploadCloud, Link2, Sparkles, X, Loader2 } from "lucide-react";

export default function UploadFlow({ onAnalyze, analyzing, errorMessage }) {
  const [files, setFiles] = useState([]);
  const [storeUrl, setStoreUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [dragActive, setDragActive] = useState(false);

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

  const canAnalyze =
    appName.trim().length > 0 && (files.length > 0 || storeUrl.trim().length > 0) && !analyzing;

  const handleAnalyze = () => {
    if (!canAnalyze) return;
    onAnalyze(files, storeUrl.trim(), appName.trim());
  };

  return (
    <div className="upload-root">
      <style>{`
        .upload-root {
          --ink: #14151a;
          --ink-2: #1c1e26;
          --ink-3: #24262f;
          --chalk: #f5f3ee;
          --muted: #8a8f9c;
          --kick: #ff4a32;
          --yellow: #ffc93c;
          --teal: #2dd4bf;
          --font-display: 'Anton', sans-serif;
          --font-body: 'Inter', sans-serif;
          --font-mono: 'IBM Plex Mono', monospace;

          background: var(--ink);
          color: var(--chalk);
          font-family: var(--font-body);
          min-height: 100%;
          border-radius: 12px;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .upload-hero { text-align: center; margin-bottom: 32px; }
        .upload-logo { font-family: var(--font-display); font-size: 28px; margin-bottom: 8px; }
        .upload-logo span { color: var(--kick); }
        .upload-sub { color: var(--muted); font-size: 14.5px; max-width: 480px; margin: 0 auto; }

        .upload-card {
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .dropzone {
          border: 2px dashed var(--ink-3);
          border-radius: 14px;
          padding: 32px 20px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .dropzone-active { border-color: var(--kick); background: var(--ink-2); }
        .dropzone:hover { border-color: var(--muted); }
        .dropzone-label { font-size: 14px; color: var(--chalk); margin-top: 10px; font-weight: 600; }
        .dropzone-hint { font-size: 12px; color: var(--muted); margin-top: 4px; }

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
        }
        .url-input-wrap input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--chalk);
          font-size: 13.5px;
          width: 100%;
        }
        .url-input-wrap input::placeholder { color: var(--muted); }

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
          border-radius: 10px;
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

      <div className="upload-hero">
        <div className="upload-logo">KICK MY APPS<span>.</span></div>
        <p className="upload-sub">
          Ekran görüntülerini yükle veya App Store / Play Store linkini yapıştır — AI, uygulamanın
          UX sağlığını ve mağaza yorumlarını analiz edip sana bir rapor çıkarsın.
        </p>
      </div>

      <div className="upload-card">
        <div>
          <div className="field-label">UYGULAMA ADI</div>
          <div className="url-input-wrap">
            <input
              type="text"
              placeholder="Örn. PulseFit"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
            />
          </div>
          <div className="dropzone-hint" style={{ marginTop: 6 }}>
            Bu adı geçmiş analizleri ve skor trendini takip etmek için kullanacağız — her seferinde aynı adı kullan.
          </div>
        </div>

        <div>
          <div className="field-label">EKRAN GÖRÜNTÜLERİ</div>
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
            <UploadCloud size={26} color="var(--yellow)" style={{ margin: "0 auto" }} />
            <div className="dropzone-label">Sürükle-bırak ya da tıkla</div>
            <div className="dropzone-hint">PNG, JPG — en fazla 12 görsel</div>
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

        <div>
          <div className="field-label">APP STORE / PLAY STORE LİNKİ</div>
          <div className="url-input-wrap">
            <Link2 size={16} color="var(--muted)" />
            <input
              type="url"
              placeholder="https://apps.apple.com/app/..."
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
            />
          </div>
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
