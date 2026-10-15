This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment Variables

| Variable | Required | What it's for |
| --- | --- | --- |
| `POSTGRES_URL` | yes | Connection string for the app's Postgres database. |
| `AUTH_SECRET`, `AUTH_TRUST_HOST` | yes | Auth.js session signing; see the [Auth.js deployment docs](https://authjs.dev/getting-started/deployment). |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | yes | Google sign-in (OAuth client credentials). |
| `GEMINI_API_KEY` and/or `OPENROUTER_API_KEY` | yes (at least one) | AI provider(s) used for the screenshot/review analysis. Gemini is tried first; OpenRouter is the fallback, or the only provider if Gemini's key isn't set. |
| `RESEND_API_KEY` | yes | Sends sign-in codes and the weekly digest email, via [Resend](https://resend.com). |
| `EMAIL_FROM` | **yes, before going live** | The "from" address on every outgoing email, e.g. `Kick My Apps <noreply@yourdomain.com>`. Without it, email falls back to Resend's shared `onboarding@resend.dev` address, which is rate-limited across every app using it and routinely lands in spam (no SPF/DKIM alignment with your own domain). Before setting this: verify a sending domain under Resend → Domains → Add Domain, add the DNS records it gives you, wait for it to show verified, *then* set `EMAIL_FROM` to an address at that domain. In a real production deploy (`VERCEL_ENV=production`) with this unset, a one-time warning is logged on the first email send. |
| `CANONICAL_HOST` | no | Hostname used to build `sitemap.xml`'s absolute URLs; defaults to `kick-my-apps.vercel.app`. |
| `ADMIN_EMAILS` | no | Comma-separated emails exempted from plan limits, with access to `/console/admin`. |
| `CRON_SECRET` | yes (for crons) | Bearer token the two Vercel Cron jobs (`vercel.json`) authenticate with. |
| `PULSE_CRON_CONCURRENCY`, `PULSE_CRON_BUDGET_MS`, `PULSE_FETCH_TIMEOUT_MS` | no | Tuning knobs for the daily Pulse check cron; sane defaults if unset. |

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
