// Unit test of the issue-tracker exports and the badge (no server or database).
// Run: node tests/integration/issue_export_test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tasksToLinearCsv, tasksToJiraCsv, tasksToGithubScript, shQuote, exportFileName } from "../../app/lib/taskExport.js";
import { healthBadgeSvg, scoreColor } from "../../app/lib/badge.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));
const t = (o) => ({ key: "k", title: "T", severity: "bad", finding: "f", suggestion: "s", status: "todo", ...o });
const tasks = [t({ title: "Low contrast", finding: "Text is hard to read\non the banner", suggestion: "Darken it" }), t({ title: "Weak CTA", severity: "warn" }), t({ title: "Done one", status: "done" }), t({ title: "Skipped", status: "wontdo" })];

console.log("== Linear CSV");
const lin = tasksToLinearCsv("My App", tasks);
check("BOM, header and only the 2 open tasks", lin.startsWith("﻿\"Title\",\"Description\",\"Priority\",\"Status\",\"Labels\"") && !lin.includes("Done one") && !lin.includes("Skipped") && lin.includes("Weak CTA"));
check("priorities mapped (critical -> High, attention -> Medium), status Todo", lin.includes('"High","Todo"') && lin.includes('"Medium","Todo"'));
check("descriptions keep their line breaks and carry the fix", lin.includes("What we found: Text is hard to read\non the banner") && lin.includes("Suggested fix: Darken it"));
check("formula-looking cells are defused", !/^"[=+@-]/m.test(tasksToLinearCsv("A", [t({ title: "=HYPERLINK(\"x\")" }), t({ finding: "@SUM(1)" })]).replace("﻿", "")));
console.log("== Jira CSV");
const jira = tasksToJiraCsv("Şeker Bank!", tasks);
check("Jira columns, Task type, open tasks only", jira.includes('"Summary","Description","Issue Type","Priority","Labels"') && jira.includes('"Task","High"') && !jira.includes("Done one"));
check("labels contain no spaces inside a label (app name slugged, accents gone)", jira.includes('"kick-my-apps Seker-Bank"'), jira.split("\r\n")[1]);
check("empty -> header only", tasksToJiraCsv("A", []).trim().split("\r\n").length === 1);

console.log("== GitHub script");
check("shQuote closes and reopens quotes around a quote", shQuote("a'b") === `'a'\\''b'`);
const nasty = ["'; touch PWNED; echo '", "$(touch PWNED)", "`touch PWNED`", "--repo evil/x", "line1\nline2 \"q\" \\ $HOME", "ünïcode — dash"];
const script = tasksToGithubScript("My App", nasty.map((x, i) => t({ title: x, finding: x, suggestion: x, key: "k" + i })).concat([t({ title: "done", status: "done" })]));
const dir = mkdtempSync(join(tmpdir(), "ghx-"));
writeFileSync(join(dir, "run.sh"), script);
check("valid shell syntax", spawnSync("sh", ["-n", join(dir, "run.sh")]).status === 0);
// A fake `gh` that records its arguments, one per NUL-terminated field.
writeFileSync(join(dir, "gh"), `#!/bin/sh\nfor a in "$@"; do printf '%s\\0' "$a"; done >> "${dir}/calls.bin"\nprintf '\\1' >> "${dir}/calls.bin"\n`);
chmodSync(join(dir, "gh"), 0o755);
const missing = spawnSync("sh", [join(dir, "run.sh")], { cwd: dir, env: { PATH: `${dir}:/usr/bin:/bin` } });
check("without a repo argument it stops with the usage message and files nothing", missing.status !== 0 && !existsSync(join(dir, "calls.bin")));
const run = spawnSync("sh", [join(dir, "run.sh"), "acme/app"], { cwd: dir, env: { PATH: `${dir}:/usr/bin:/bin`, HOME: "/nonexistent" } });
check("runs cleanly", run.status === 0, run.stderr?.toString());
const calls = readFileSync(join(dir, "calls.bin"), "utf8").split("\x01").filter(Boolean).map((c) => c.split("\0").slice(0, -1));
check("one `gh issue create` per OPEN task (the done one is skipped)", calls.length === nasty.length && calls.every((c) => c[0] === "issue" && c[1] === "create"));
check("repo is passed once, as given", calls.every((c) => c[2] === "--repo" && c[3] === "acme/app" && c.filter((x) => x === "--repo").length === 1));
check("every title arrives byte-for-byte (quotes, $(), backticks, leading dashes, newlines)", calls.every((c, i) => c[c.indexOf("--title") + 1] === nasty[i]), JSON.stringify(calls.map((c) => c[c.indexOf("--title") + 1])));
check("bodies carry the finding and fix intact", calls.every((c, i) => { const b = c[c.indexOf("--body") + 1]; return b.includes(`What we found: ${nasty[i]}`) && b.includes(`Suggested fix: ${nasty[i]}`); }));
check("nothing was executed from the report text", !readdirSync(dir).includes("PWNED"));
check("empty list: a harmless note", tasksToGithubScript("A", []).includes('echo "Nothing to file'));
console.log("== file names");
check("suffix per format", exportFileName("My App", "csv", "linear-import") === "my-app-linear-import.csv" && exportFileName("My App", "sh", "github-issues") === "my-app-github-issues.sh");

console.log("== badge");
const svg = healthBadgeSvg(82);
check("shows app health and the score, green at 80+", svg.includes("app health") && svg.includes("82/100") && svg.includes(scoreColor(82)) && scoreColor(80) === "#2e9e5b");
check("amber 60-79, red below", scoreColor(65) === "#d9a21b" && scoreColor(30) === "#d64545");
check("invalid scores never reach the markup", ["<script>", NaN, -1, 101, 1.5, null, undefined, "82"].every((v) => healthBadgeSvg(v).includes("unavailable") && !healthBadgeSvg(v).includes("script")));
check("it is a well-formed svg with a title", /^<svg [^>]*xmlns/.test(svg) && svg.includes("<title>app health: 82/100</title>") && svg.trim().endsWith("</svg>"));

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
