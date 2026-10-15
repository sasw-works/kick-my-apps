// The "from" address every outgoing email (sign-in codes, the weekly digest) sends as.
//
// Without EMAIL_FROM set, Resend's own shared "onboarding@resend.dev" is a fine way to get the
// product running, but it's not meant to stay: it's rate-limited across every app that hasn't
// configured its own domain, routinely lands in spam (no SPF/DKIM alignment with the product's
// own domain), and shows "via resend.dev" to recipients. Real deliverability needs a sending
// domain verified in Resend's dashboard (Resend > Domains > Add Domain, then the DNS records it
// gives you), with EMAIL_FROM set to an address at that domain, e.g.
// `Kick My Apps <noreply@kickmyapps.com>`. See README.md's Environment Variables section.
let warned = false;

export function getEmailFrom() {
  const configured = process.env.EMAIL_FROM;
  if (configured) return configured;

  // Only warn in a real production deployment -- local dev and preview deployments legitimately
  // run without a verified domain, and shouldn't spam the log every cold start.
  if (process.env.VERCEL_ENV === "production" && !warned) {
    warned = true;
    console.warn(
      "EMAIL_FROM is not set in production -- falling back to Resend's shared test address " +
        "(onboarding@resend.dev). Emails will be rate-limited and are likely to land in spam. " +
        "Verify a sending domain in Resend and set EMAIL_FROM to an address at it."
    );
  }

  return "Kick My Apps <onboarding@resend.dev>";
}
