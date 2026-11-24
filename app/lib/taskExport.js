// Turns a project's tasks into a Markdown checklist or a CSV. Pure functions (no database).

const STATUS_LABEL = { todo: "To do", inprogress: "In progress", done: "Done", wontdo: "Won't do" };
const SEVERITY_LABEL = { bad: "Critical", warn: "Attention" };

export function exportFileName(appName, ext, suffix = "tasks") {
  const slug = String(appName || "tasks")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `${slug || "tasks"}-${suffix}.${ext}`;
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
  section("In progress", tasks.filter((t) => t.status === "inprogress"), false);
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

// ---- Issue trackers: only open ("todo") tasks, formatted so each tracker's own importer takes them.

const PRIORITY = {
  linear: { bad: "High", warn: "Medium" },
  jira: { bad: "High", warn: "Medium" },
};
const openTasks = (tasks) => tasks.filter((t) => t.status === "todo" || t.status === "inprogress"); // not finished yet
const description = (t) =>
  [t.finding && `What we found: ${t.finding}`, t.suggestion && `Suggested fix: ${t.suggestion}`, t.source === "review" ? "Source: user reviews (Kick My Apps)" : "Source: Kick My Apps report"].filter(Boolean).join("\n\n");

// Like csvCell but keeps line breaks (issue descriptions are multi-line); still defuses formulas.
function csvText(v) {
  let s = String(v ?? "").replace(/\r\n?/g, "\n").trim();
  if (/^[=+\-@\t]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

// Linear's CSV importer: Title, Description, Priority, Status, Labels.
export function tasksToLinearCsv(appName, tasks) {
  const rows = openTasks(tasks).map((t) => [t.title, description(t), PRIORITY.linear[t.severity] || "No priority", "Todo", "Kick My Apps"]);
  return "﻿" + [["Title", "Description", "Priority", "Status", "Labels"], ...rows].map((r) => r.map(csvText).join(",")).join("\r\n") + "\r\n";
}

// Jira's CSV import: Summary, Description, Issue Type, Priority, Labels (no spaces in a label).
export function tasksToJiraCsv(appName, tasks) {
  const label = String(appName || "app").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
  const rows = openTasks(tasks).map((t) => [t.title, description(t), "Task", PRIORITY.jira[t.severity] || "Medium", `kick-my-apps ${label}`.trim()]);
  return "﻿" + [["Summary", "Description", "Issue Type", "Priority", "Labels"], ...rows].map((r) => r.map(csvText).join(",")).join("\r\n") + "\r\n";
}

// Single-quote a value for POSIX sh: nothing inside can end the quote or expand.
export const shQuote = (v) => `'${String(v ?? "").replace(/\0/g, "").replace(/'/g, `'\\''`)}'`;

// A script that files each open task as a GitHub issue with the `gh` CLI. The user runs it
// themselves, in their own terminal, with their own login, against a repo they name.
export function tasksToGithubScript(appName, tasks) {
  const open = openTasks(tasks);
  const lines = [
    "#!/bin/sh",
    `# Creates ${open.length} GitHub issue${open.length === 1 ? "" : "s"} for ${String(appName || "your app").replace(/[\r\n]+/g, " ")} (from Kick My Apps).`,
    "# Needs the GitHub CLI (https://cli.github.com) signed in with `gh auth login`.",
    "# Usage: sh this-file.sh OWNER/REPO     (read it first: it only runs `gh issue create`)",
    "set -eu",
    'REPO="${1:?Usage: sh this-file.sh OWNER/REPO}"',
    "",
  ];
  for (const t of open) {
    const body = `${description(t)}\n\n_Severity: ${SEVERITY_LABEL[t.severity] || t.severity}_`;
    lines.push(`gh issue create --repo "$REPO" --title ${shQuote(t.title)} --body ${shQuote(body)}`);
  }
  if (!open.length) lines.push('echo "Nothing to file: no open tasks."');
  return lines.join("\n") + "\n";
}
