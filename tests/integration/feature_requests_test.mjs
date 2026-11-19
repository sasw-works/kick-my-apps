// Feature request detection: request wording, feature grouping, thresholds, task text and AI-group parsing.
// Run: node tests/integration/feature_requests_test.mjs
import { computeFeatureRequests, taskFromFeature, parseClusters, buildGroupPrompt, isRequest } from "../../app/lib/featureRequests.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));
const r = (id, t, rating = 4) => ({ id: String(id), rating, title: "", content: t });

console.log("== 1. what is a request");
check("request wording", ["Please add dark mode", "Would be great to have X", "I wish it had a widget", "Can you add offline mode?", "needs an undo button", "Why can't I export?"].every((t) => isRequest(r(1, t))));
check("praise and complaints are not requests", !["I love dark mode", "Great app", "Crashes on launch", "Works well on my iPad"].some((t) => isRequest(r(1, t))));

console.log("== 2. grouping");
const out = computeFeatureRequests([r(1, "Please add dark mode"), r(2, "Would be great to have a dark theme"), r(3, "I love dark mode"), r(4, "wish it had a widget"), r(5, "Can you add dark mode please"), r(6, "please add export to pdf"), r(7, "would be nice to export to pdf too")]);
const by = Object.fromEntries(out.topics.map((t) => [t.key, t]));
check("dark mode = 3 requests, addable; dark theme not double counted as customization", by["dark-mode"]?.count === 3 && by["dark-mode"].canAdd && !by.customize);
check("2 mentions are shown but not addable", by.export?.count === 2 && !by.export.canAdd);
check("sample counts all written reviews, requests only asking ones", out.sample === 7 && out.requestCount === 6);
check("sorted by count", out.topics[0].key === "dark-mode");
check("requests with no known feature are returned as unmatched", computeFeatureRequests([r(1, "please add a pin option"), r(2, "I love it")]).unmatched.length === 1);
check("junk input is safe", computeFeatureRequests(null).sample === 0 && computeFeatureRequests([null, {}, { content: "" }]).sample === 0);

console.log("== 3. task text");
const t = taskFromFeature(by["dark-mode"], out.sample);
check("key, title, severity, finding", t.key === "feat:dark-mode" && t.title === "Users ask for: Dark mode" && t.severity === "warn" && t.finding.startsWith("3 of the 7"));

console.log("== 4. AI groups");
const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
const g = parseClusters('```json\n{"clusters":[{"title":"PDF export","items":[1,2,99]},{"title":"One","items":[3]},{"title":"","items":[1,2]},{"title":"Dup","items":[1,3]}]}\n```', items);
check("valid group kept with real ids; invented numbers, singletons, empty titles, reused reviews dropped", g.length === 1 && g[0].title === "PDF export" && g[0].reviewIds.join() === "a,b", JSON.stringify(g));
check("garbage -> nothing", parseClusters("nope", items).length === 0 && parseClusters(null, items).length === 0);
check("prompt numbers the reviews and marks them as data", /1\. /.test(buildGroupPrompt([{ text: "hello" }])) && /DATA/.test(buildGroupPrompt([{ text: "hello" }])));

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
