// Report URLs read as /console/reports/43-instagram: the number is the real identity (lookups and the
// ownership check use only it), the name is there so the address means something to a person --
// in the address bar, in browser history, in a link you send yourself.
//
// The name alone wouldn't work: one app can be analysed many times (each is its own report), and
// two different apps can share a name. So the slug is decoration and is never trusted: a wrong or
// missing one still opens the right report, and the page rewrites the address bar to the canonical form.

const TURKISH = { "ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g", "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c" };

export function slugify(name, maxLength = 40) {
  return String(name ?? "")
    .replace(/[ıİşŞğĞüÜöÖçÇ]/g, (c) => TURKISH[c])
    // NFD, not NFKD: NFD only splits accents off their letters (é -> e + ´). NFKD also expands
    // compatibility characters, which turned a trademark sign into the letters "tm".
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // é -> e, ñ -> n
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

// A name with no Latin letters or digits at all (e.g. only Chinese or emoji) has no usable slug; the
// address is then just the number, which always works.
export function reportPath(id, appName) {
  const slug = slugify(appName);
  return `/console/reports/${id}${slug ? `-${slug}` : ""}`;
}

// "43", "43-instagram" and "43-anything-at-all" all mean report 43. Anything else is not a report.
export function parseReportId(param) {
  const match = /^(\d{1,12})(?:-.*)?$/.exec(String(param ?? ""));
  return match ? match[1] : null;
}
