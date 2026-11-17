"use client";

import { AlertTriangle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

// Three optional report panels: Performance & Stability and Compatibility (from reviews /
// screenshots) and an Accessibility checklist (from screenshots). Each renders nothing when its
// data is missing, so reports saved before these existed look exactly as they did.

const SEV_COLOR = { high: "var(--kick)", medium: "var(--yellow)", low: "var(--teal)" };
const CHECK_LABEL = {
  touch_targets: "Touch targets",
  text_size: "Text size",
  contrast: "Color contrast",
  color_only: "Color-only meaning",
  labels: "Labels & hints",
};
const STATUS_META = {
  good: { color: "var(--teal)", Icon: CheckCircle2, text: "Looks fine" },
  warn: { color: "var(--yellow)", Icon: AlertTriangle, text: "Worth a look" },
  bad: { color: "var(--kick)", Icon: XCircle, text: "Likely issue" },
  unknown: { color: "var(--muted)", Icon: HelpCircle, text: "Can't tell" },
};

const list = (v) => (Array.isArray(v) ? v : []);

function Suggestions({ items }) {
  if (!items.length) return null;
  return (
    <div className="sig-suggestions">
      {items.map((s, i) => (
        <div className="sig-suggestion" key={i}>
          {s}
        </div>
      ))}
    </div>
  );
}

export function PerformancePanel({ data }) {
  if (!data || typeof data !== "object") return null;
  const signals = list(data.signals);
  const topics = list(data.mentions?.topics);
  const suggestions = list(data.suggestions);
  if (!data.summary && !signals.length && !topics.length && !suggestions.length) return null;
  const total = data.totalReviews || data.mentions?.totalReviews || 0;
  const affected = data.mentions?.affected || 0;

  return (
    <div className="panel" data-testid="performance-panel">
      <div className="panel-title">Performance &amp; Stability</div>
      <div className="panel-subtitle">What users report about speed, crashes, battery and loading</div>
      <div className="risk-disclaimer">
        Based on what users say in reviews, not a technical measurement. Memory leaks, slow screens and
        unnecessary requests need profiling in the code itself.
      </div>
      {total > 0 && (
        <div className="sig-stat">
          <strong>{affected}</strong> of {total} sampled reviews mention a performance or stability problem
        </div>
      )}
      {data.summary && <div className="sig-summary">{data.summary}</div>}
      {topics.length > 0 && (
        <div className="sig-chips">
          {topics.map((t) => (
            <span className="sig-chip" key={t.key}>
              {t.label} <b>{t.count}</b>
            </span>
          ))}
        </div>
      )}
      {signals.length > 0 && (
        <div className="risk-list">
          {signals.map((s, i) => (
            <div
              className="risk-row"
              key={i}
              style={{ background: `color-mix(in srgb, ${SEV_COLOR[s.severity] || SEV_COLOR.medium} 10%, var(--ink))` }}
            >
              <AlertTriangle size={14} color={SEV_COLOR[s.severity] || SEV_COLOR.medium} />
              <div>
                <div className="risk-issue">{s.label}</div>
                <div className="sig-evidence">{s.evidence}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {list(data.mentions?.examples).length > 0 && (
        <div className="sig-quotes">
          {data.mentions.examples.map((q, i) => (
            <div className="sig-quote" key={i}>
              <span className="sig-quote-stars">{"★".repeat(q.rating || 0)}</span> “{q.text}”
            </div>
          ))}
        </div>
      )}
      <Suggestions items={suggestions} />
    </div>
  );
}

export function CompatibilityPanel({ data }) {
  if (!data || typeof data !== "object") return null;
  const notes = list(data.platformNotes);
  const devices = list(data.deviceSignals);
  const suggestions = list(data.suggestions);
  const m = data.mentions;
  const named = [...list(m?.devices), ...list(m?.osVersions)];
  const hasCounts = named.length > 0 || m?.afterUpdate > 0 || m?.layoutIssues > 0;
  if (!data.summary && !notes.length && !devices.length && !suggestions.length && !hasCounts) return null;
  const total = data.totalReviews || m?.totalReviews || 0;

  return (
    <div className="panel" data-testid="compatibility-panel">
      <div className="panel-title">Compatibility</div>
      <div className="panel-subtitle">iOS / Android conventions and device-specific reports</div>
      <div className="risk-disclaimer">
        Based on reviews and screenshots, not testing on real devices. Treat it as a list of places to
        check.
      </div>
      {data.summary && <div className="sig-summary">{data.summary}</div>}
      {hasCounts && (
        <div className="sig-chips">
          {named.map((d) => (
            <span className="sig-chip" key={d.name}>
              {d.name} <b>{d.count}</b>
            </span>
          ))}
          {m.afterUpdate > 0 && (
            <span className="sig-chip">
              Mentions “after the update” <b>{m.afterUpdate}</b>
            </span>
          )}
          {m.layoutIssues > 0 && (
            <span className="sig-chip">
              Layout / screen issues <b>{m.layoutIssues}</b>
            </span>
          )}
        </div>
      )}
      {hasCounts && total > 0 && <div className="sig-note">Counts are reviews out of {total} sampled.</div>}
      {notes.length > 0 && (
        <div className="risk-list">
          {notes.map((n, i) => (
            <div
              className="risk-row"
              key={i}
              style={{ background: `color-mix(in srgb, ${SEV_COLOR[n.severity] || SEV_COLOR.medium} 10%, var(--ink))` }}
            >
              <AlertTriangle size={14} color={SEV_COLOR[n.severity] || SEV_COLOR.medium} />
              <div>
                <div className="risk-issue">{n.issue}</div>
                {n.guideline && <div className="risk-guideline">{n.guideline}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {devices.length > 0 && (
        <div className="risk-list" style={{ marginTop: 8 }}>
          {devices.map((d, i) => (
            <div className="risk-row" key={i}>
              <AlertTriangle size={14} color="var(--muted)" />
              <div>
                <div className="risk-issue">{d.label}</div>
                <div className="sig-evidence">{d.evidence}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Suggestions items={suggestions} />
    </div>
  );
}

export function AccessibilityChecklist({ checks }) {
  const rows = list(checks).filter((c) => c && CHECK_LABEL[c.check]);
  if (!rows.length) return null;
  return (
    <div className="panel" data-testid="accessibility-panel">
      <div className="panel-title">Accessibility checklist</div>
      <div className="panel-subtitle">Estimated from your screenshots</div>
      <div className="risk-disclaimer">
        A visual estimate, not an audit. Real assistive-technology testing (VoiceOver, TalkBack, Dynamic
        Type) is still needed.
      </div>
      <div className="risk-list">
        {rows.map((c) => {
          const meta = STATUS_META[c.status] || STATUS_META.unknown;
          return (
            <div
              className="risk-row"
              key={c.check}
              style={{ background: `color-mix(in srgb, ${meta.color} 10%, var(--ink))` }}
            >
              <meta.Icon size={14} color={meta.color} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div className="risk-issue">
                  {CHECK_LABEL[c.check]} <span className="sig-status" style={{ color: meta.color }}>{meta.text}</span>
                </div>
                {c.note && <div className="sig-evidence">{c.note}</div>}
                {c.standard && <div className="risk-guideline">{c.standard}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SignalPanelStyles() {
  return (
    <style>{`
      .sig-stat { font-size: 14px; color: var(--chalk); margin-bottom: 8px; }
      .sig-stat strong { color: var(--kick); font-family: var(--font-mono); }
      .sig-summary { font-size: 14px; color: var(--chalk); line-height: 1.5; margin-bottom: 12px; }
      .sig-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
      .sig-chip { font-size: 12px; background: var(--ink); color: var(--muted); border-radius: 999px; padding: 4px 10px; font-family: var(--font-mono); }
      .sig-chip b { color: var(--chalk); margin-left: 4px; }
      .sig-note { font-size: 12px; color: var(--muted); margin: -6px 0 12px; }
      .sig-evidence { font-size: 13px; color: var(--muted); line-height: 1.45; }
      .sig-status { font-size: 11px; font-weight: 600; margin-left: 6px; font-family: var(--font-mono); }
      .sig-quotes { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
      .sig-quote { font-size: 12px; color: var(--muted); font-style: italic; border-left: 2px solid var(--muted); padding-left: 10px; line-height: 1.45; }
      .sig-quote-stars { color: var(--yellow); font-style: normal; letter-spacing: 1px; }
      .sig-suggestions { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
      .sig-suggestion { background: var(--ink); border-radius: 4px; padding: 8px 12px; font-size: 13px; color: var(--muted); line-height: 1.45; }
    `}</style>
  );
}
