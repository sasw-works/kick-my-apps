// Unit test for app/lib/taskExport.js (no server or database): node tests/integration/task_export_test.mjs
import { tasksToCsv, tasksToMarkdown, exportFileName } from "../../app/lib/taskExport.js";
let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };
const t = (o) => ({ key: "k", title: "T", severity: "bad", finding: "f", suggestion: "s", status: "todo", isNew: false, reappeared: false, ...o });

console.log("== CSV");
let csv = tasksToCsv("My App", [t({ title: "Low contrast", finding: 'Has "quotes", commas\nand a newline' })], [{ key: "c", title: "Copy" }]);
const lines = csv.replace("﻿", "").trim().split("\r\n");
check("starts with a BOM (Excel reads UTF-8)", csv.startsWith("﻿"));
check("header + 1 task + 1 verified row", lines.length === 3, lines.length);
check("quotes are doubled and newlines flattened", lines[1].includes('"Has ""quotes"", commas and a newline"'), lines[1]);
check("status and severity are readable", lines[1].includes('"Critical","To do"'));
check("verified fixes are listed as Fixed", lines[2].includes('"Fixed"') && lines[2].includes("Confirmed by a newer scan"));
csv = tasksToCsv("A", [t({ title: '=HYPERLINK("http://evil","x")' }), t({ title: "+cmd|' /C calc'!A0" }), t({ finding: "@SUM(A1)" }), t({ suggestion: "-2+3" })]);
check("cells starting with = + @ - can't become spreadsheet formulas", !/,"[=+@-]/.test(csv) && !/^"[=+@-]/m.test(csv.replace("﻿", "")), csv);
check("accents / Turkish letters survive", tasksToCsv("Şeker Bank", [t({ title: "Düşük kontrast" })]).includes("Düşük kontrast"));
check("empty list still has a header", tasksToCsv("A", []).replace("﻿", "").startsWith('"App"'));

console.log("== Markdown");
const md = tasksToMarkdown("My *App*", [t({ title: "A", status: "todo", isNew: true }), t({ title: "B", status: "done", severity: "warn" }), t({ title: "C", status: "wontdo", reappeared: true })], [{ title: "D" }], new Date("2026-02-03T00:00:00Z"));
check("title is escaped and dated", md.startsWith("# My \\*App\\*: to-do list") && md.includes("Exported 2026-02-03"));
check("to-do is an unchecked box, done is checked", md.includes("- [ ] **A** (Critical, new)") && md.includes("- [x] **B** (Attention)"));
check("won't do is its own section, 'came back' is tagged", md.includes("## Won't do (1)") && md.includes("(Critical, came back)"));
check("verified fixes are a checked section", md.includes("## Fixed, confirmed by a newer scan (1)") && md.includes("- [x] D"));
check("finding and fix are nested under the item", md.includes("  - Found: f") && md.includes("  - Fix: s"));
check("markdown/HTML in report text is neutralized", !tasksToMarkdown("A", [t({ title: "<script>x</script>" })]).includes("<script>"));
check("empty project says so", tasksToMarkdown("A", []).includes("No open issues"));

console.log("== file names");
check("slugged, accent-free, with extension", exportFileName("Şeker Bank!", "csv") === "seker-bank-tasks.csv", exportFileName("Şeker Bank!", "csv"));
check("name with no usable characters falls back", exportFileName("日本語", "md") === "tasks-tasks.md" || exportFileName("日本語", "md").endsWith("-tasks.md"));
check("can't smuggle quotes / path chars into the header", !/["\/\\\r\n]/.test(exportFileName('a"/../b\r\nX: y', "md")));

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
