// Turns a project's tasks into a Markdown checklist or a CSV. Pure functions (no database).

const STATUS_LABEL = { todo: "To do", done: "Done", wontdo: "Won't do" };
const SEVERITY_LABEL = { bad: "Critical", warn: "Attention" };

export function exportFileName(appName, ext) {
  const slug = String(appName || "tasks")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `${slug || "tasks"}-tasks.${ext}`;
}

// A spreadsheet treats a cell starting with = + - @ (or tab / CR) as a formula. Report text comes
// from an AI reading arbitrary screenshots and reviews, so neutralize those before they can be
// opened in Excel/Sheets.
function csvCell(v) {
  let s = String(v ?? "").replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function tasksToCsv(appName, tasks, verified = []) {
  const header = ["App", "Issue", "Severity", "Status", "What we found", "Suggested fix", "Note"];
  const rows = tasks.map((t) => [
    appName,
    t.title,
    SEVERITY_LABEL[t.severity] || t.severity,
    STATUS_LABEL[t.status] || t.status,
    t.finding,
    t.suggestion,
    [t.isNew ? "New since last scan" : "", t.reappeared ? "Came back after being marked done" : "", t.source === "review" ? "From user reviews" : ""].filter(Boolean).join("; "),
  ]);
  for (const v of verified) rows.push([appName, v.title, "", "Fixed", "", "", "Confirmed by a newer scan"]);
  // BOM so Excel reads the file as UTF-8 (accents, Turkish letters) instead of guessing.
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const mdInline = (s) => String(s ?? "").replace(/\r?\n/g, " ").replace(/([\\`*_{}\[\]<>])/g, "\\$1").trim();

export function tasksToMarkdown(appName, tasks, verified = [], generatedAt = new Date()) {
  const lines = [`# ${mdInline(appName)}: to-do list`, "", `_Exported ${generatedAt.toISOString().slice(0, 10)} from Kick My Apps_`, ""];
  const section = (title, items, checked) => {
    if (!items.length) return;
    lines.push(`## ${title} (${items.length})`, "");
    for (const t of items) {
      const tags = [SEVERITY_LABEL[t.severity], t.isNew ? "new" : "", t.reappeared ? "came back" : "", t.source === "review" ? "from reviews" : ""].filter(Boolean).join(", ");
      lines.push(`- [${checked ? "x" : " "}] **${mdInline(t.title)}**${tags ? ` (${tags})` : ""}`);
      if (t.finding) lines.push(`  - Found: ${mdInline(t.finding)}`);
      if (t.suggestion) lines.push(`  - Fix: ${mdInline(t.suggestion)}`);
    }
    lines.push("");
  };
  section("To do", tasks.filter((t) => t.status === "todo"), false);
  section("Done", tasks.filter((t) => t.status === "done"), true);
  section("Won't do", tasks.filter((t) => t.status === "wontdo"), false);
  if (verified.length) {
    lines.push(`## Fixed, confirmed by a newer scan (${verified.length})`, "");
    for (const v of verified) lines.push(`- [x] ${mdInline(v.title)}`);
    lines.push("");
  }
  if (!tasks.length && !verified.length) lines.push("No open issues in the latest report.", "");
  return lines.join("\n");
}
