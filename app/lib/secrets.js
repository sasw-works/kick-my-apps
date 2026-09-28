// Two small guards around secrets.
//
// 1. readSecret(): environment variables get pasted badly (the same key several times, trailing
//    newlines, spaces). A key with a newline or repeated copies makes Node reject the whole
//    Authorization header -- and the error message it throws contains the header value, i.e. the
//    key. readSecret takes the first whitespace-separated token so a sloppy paste still works, and
//    says so in the server log (without printing the value).
//
// 2. redactSecrets()/errorText(): anything that can end up in an API response or a log goes through
//    here first. It blanks out the value of every secret-looking environment variable (matched by
//    value, so it works whatever format the key has) plus well-known key/token shapes as a backstop.

const warned = new Set();

export function readSecret(name) {
  const raw = process.env[name];
  if (!raw) return null;
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  if (tokens.length > 1 && !warned.has(name)) {
    warned.add(name);
    console.warn(
      `${name} contains ${tokens.length} whitespace-separated values (pasted more than once, or with line breaks). ` +
        `Using the first one. Fix the environment variable so it holds a single key.`
    );
  }
  return tokens[0];
}

const SECRET_ENV_NAME = /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|POSTGRES_URL|DATABASE_URL|CONNECTION_STRING)/i;

const SECRET_SHAPES = [
  /sk-or-v1-[A-Za-z0-9_-]+/g, // OpenRouter
  /AIza[0-9A-Za-z_-]{20,}/g, // Google API keys
  /\bre_[A-Za-z0-9_]{16,}/g, // Resend
  /github_pat_[A-Za-z0-9_]+/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /GOCSPX-[A-Za-z0-9_-]+/g, // Google OAuth client secrets
  /postgres(?:ql)?:\/\/[^\s"'<>]+/gi, // connection strings carry the password
  /(Bearer\s+)[^\s"'<>]+/gi,
];

export function redactSecrets(input) {
  let text = typeof input === "string" ? input : String(input ?? "");

  // By value: whatever our own secret-looking variables hold, in whole or per token.
  for (const [name, value] of Object.entries(process.env)) {
    if (!value || !SECRET_ENV_NAME.test(name)) continue;
    for (const piece of [value, ...value.split(/\s+/)]) {
      if (piece.length >= 8) text = text.split(piece).join("[redacted]");
    }
  }

  // By shape: keys we don't hold (yet) but recognise.
  for (const re of SECRET_SHAPES) {
    text = text.replace(re, (match, prefix) => (typeof prefix === "string" && /bearer/i.test(prefix) ? `${prefix}[redacted]` : "[redacted]"));
  }
  return text;
}

// Safe text for an Error, for API responses and logs.
export function errorText(err, maxLength = 400) {
  const message = redactSecrets(err?.message ?? err ?? "unknown error");
  return message.length > maxLength ? message.slice(0, maxLength) + "…" : message;
}
