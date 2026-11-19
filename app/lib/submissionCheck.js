// Pre-submission checklist: plain rules over a draft store listing plus things only the developer can
// confirm. Pure functions (no imports) so they run in the browser while typing and in tests.
// Limits are the stores' published field limits; rules about rejections are common review-guideline
// causes, not a guarantee of approval.

export const STORES = {
  apple: {
    label: "App Store",
    fields: [
      { key: "name", label: "App name", max: 30, required: true, noShort: true },
      { key: "subtitle", label: "Subtitle", max: 30, required: true },
      { key: "keywords", label: "Keywords (comma separated)", max: 100, required: true, noPlaceholderCheck: true },
      { key: "promo", label: "Promotional text", max: 170 },
      { key: "description", label: "Description", max: 4000, required: true, long: true },
      { key: "whatsNew", label: "What's new", max: 4000, long: true },
    ],
    screenshots: { min: 1, max: 10 },
    confirms: [
      { key: "privacyUrl", label: "Privacy policy URL is live and describes what the app collects" },
      { key: "supportUrl", label: "Support URL works and reaches a real person or page" },
      { key: "privacyLabels", label: "App Privacy answers in App Store Connect match what the app and its SDKs really collect" },
      { key: "ageRating", label: "Age rating questionnaire answered honestly" },
      { key: "reviewAccount", label: "Demo account (or notes) given to the reviewer if the app needs a sign-in" },
      { key: "iap", label: "In-app purchases / subscriptions are set up, with price and terms shown before purchase" },
      { key: "deleteAccount", label: "If people can create an account, they can delete it inside the app" },
      { key: "noCrash", label: "Tested the release build on a real device, with no crashes or dead buttons" },
      { key: "noPlaceholder", label: "No placeholder text, lorem ipsum, test data or broken links anywhere in the app" },
      { key: "permissions", label: "Every permission prompt (camera, location, notifications…) explains why it is needed" },
    ],
  },
  play: {
    label: "Google Play",
    fields: [
      { key: "name", label: "App title", max: 30, required: true, noShort: true },
      { key: "short", label: "Short description", max: 80, required: true },
      { key: "description", label: "Full description", max: 4000, required: true, long: true },
      { key: "whatsNew", label: "What's new", max: 500, long: true },
    ],
    screenshots: { min: 2, max: 8 },
    confirms: [
      { key: "privacyUrl", label: "Privacy policy URL is live and describes what the app collects" },
      { key: "dataSafety", label: "Data safety form matches what the app and its SDKs really collect" },
      { key: "contentRating", label: "Content rating questionnaire completed" },
      { key: "targetAudience", label: "Target audience and (if it could appeal to children) Families policy answers are set" },
      { key: "reviewAccount", label: "Login details given in App access if parts of the app need a sign-in" },
      { key: "featureGraphic", label: "Feature graphic (1024×500) and 512×512 icon uploaded" },
      { key: "deleteAccount", label: "If people can create an account, they can request deletion in the app and on the web" },
      { key: "targetSdk", label: "Target API level meets Play's current requirement" },
      { key: "testing", label: "Tested the release build (internal / closed testing) on real devices" },
      { key: "permissions", label: "Sensitive permissions are declared and justified in Play Console" },
    ],
  },
};

const PLACEHOLDER = /\b(lorem ipsum|todo|tbd|fixme|placeholder|coming soon|your text here|xxx+)\b/i;
const URLISH = /https?:\/\/\S+/i;
const SHOUT = /[A-Z]{4,}[A-Z\s!]{12,}/;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const FOREIGN_BRANDS = /\b(best app|#1|number one|no\.?\s?1|top[- ]rated|free forever|download now|apple'?s choice|editor'?s choice)\b/i;

const len = (s) => String(s ?? "").trim().length;

// draft: { store: "apple"|"play", fields: {key: text}, screenshots: number, confirms: {key: true} }
// Returns { items: [{ id, group, status: "pass"|"warn"|"fail"|"todo"|"info", title, detail }], summary }
export function checkSubmission(draft) {
  const store = STORES[draft?.store] ? draft.store : "apple";
  const spec = STORES[store];
  const f = draft?.fields && typeof draft.fields === "object" ? draft.fields : {};
  const items = [];
  const add = (id, group, status, title, detail = "") => items.push({ id, group, status, title, detail });

  for (const field of spec.fields) {
    const text = String(f[field.key] ?? "").trim();
    const n = text.length;
    const id = `field:${field.key}`;
    if (!n) {
      add(id, "Listing text", field.required ? "fail" : "info", `${field.label} is empty`, field.required ? "The store won't let you submit without it." : "Optional, but worth filling in.");
      continue;
    }
    if (n > field.max) add(id, "Listing text", "fail", `${field.label} is ${n - field.max} characters too long`, `${n} of ${field.max} characters.`);
    else if (!field.long && !field.noShort && n < Math.ceil(field.max * 0.4) && field.required) add(id, "Listing text", "warn", `${field.label} is short`, `${n} of ${field.max} characters. Using more of the space helps people (and search) understand the app.`);
    else if (field.long && field.required && n < 300) add(id, "Listing text", "warn", `${field.label} is thin`, `${n} characters. Say what the app does, who it is for and what makes it different.`);
    else add(id, "Listing text", "pass", `${field.label} fits`, `${n} of ${field.max} characters.`);
    if (!field.noPlaceholderCheck && PLACEHOLDER.test(text)) add(`${id}:placeholder`, "Listing text", "fail", `${field.label} looks like it has placeholder text`, "Reviewers reject listings with unfinished text.");
    if (SHOUT.test(text)) add(`${id}:shout`, "Listing text", "warn", `${field.label} has long ALL-CAPS stretches`, "Looks spammy and can be flagged.");
    if (FOREIGN_BRANDS.test(text)) add(`${id}:claims`, "Listing text", "warn", `${field.label} makes ranking claims`, "Words like “#1”, “best app” or “Editor's Choice” are a common reason for metadata rejection unless you can prove them.");
  }

  const name = String(f.name ?? "");
  if (EMOJI.test(name)) add("name:emoji", "Listing text", "warn", "The name contains emoji", "Both stores discourage emoji and symbols in the app name.");
  if (store === "apple") {
    const kw = String(f.keywords ?? "").trim();
    if (kw) {
      const words = kw.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
      const dup = words.filter((w, i) => words.indexOf(w) !== i);
      if (dup.length) add("kw:dup", "Listing text", "warn", "Keywords repeat", `Repeated: ${[...new Set(dup)].slice(0, 5).join(", ")}. Each repeat wastes characters.`);
      if (/, /.test(kw)) add("kw:spaces", "Listing text", "warn", "Spaces after commas in keywords", "Apple counts them against the 100 characters. Use “one,two,three”.");
      const nameWords = String(f.name ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 2);
      const inName = words.filter((w) => nameWords.includes(w));
      if (inName.length) add("kw:name", "Listing text", "warn", "Keywords repeat words from the name", `Already searchable through the name: ${inName.slice(0, 5).join(", ")}.`);
    }
  }
  if (URLISH.test(String(f.description ?? "")) && store === "play") add("desc:url", "Listing text", "warn", "The description contains links", "Play only allows links that fit its policies; check they aren't to other stores or competing apps.");

  const sc = Number(draft?.screenshots);
  const n = Number.isFinite(sc) ? Math.max(0, Math.floor(sc)) : 0;
  if (n < spec.screenshots.min) add("shots", "Screenshots", "fail", `Needs at least ${spec.screenshots.min} screenshot${spec.screenshots.min === 1 ? "" : "s"}`, `You have ${n}.`);
  else if (n > spec.screenshots.max) add("shots", "Screenshots", "fail", `At most ${spec.screenshots.max} screenshots`, `You have ${n}.`);
  else if (n < 4) add("shots", "Screenshots", "warn", `Only ${n} screenshot${n === 1 ? "" : "s"}`, "Most listings use 4–8. The first two or three carry most of the weight.");
  else add("shots", "Screenshots", "pass", `${n} screenshots`, "Within the store's limits.");

  const c = draft?.confirms && typeof draft.confirms === "object" ? draft.confirms : {};
  for (const q of spec.confirms) {
    add(`confirm:${q.key}`, "Before you submit", c[q.key] === true ? "pass" : "todo", q.label);
  }

  const count = (s) => items.filter((i) => i.status === s).length;
  const fails = count("fail"), warns = count("warn"), todo = count("todo"), passed = count("pass");
  return {
    store,
    items,
    summary: {
      fail: fails, warn: warns, todo, pass: passed,
      ready: fails === 0 && todo === 0,
      verdict: fails ? "Fix the red items before you submit." : todo ? "Tick off the remaining items you still need to check." : warns ? "Ready, with a few things worth a second look." : "Looks ready to submit.",
    },
  };
}
