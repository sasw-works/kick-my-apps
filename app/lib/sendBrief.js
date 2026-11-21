import { buildBrief, briefToText, briefToHtml, briefUnsubscribeUrl, briefHomeUrl } from "./brief.js";
import { sendEmail, emailConfigured } from "./resend.js";
import { notifyUser } from "./notify.js";
import { addNotification } from "./inapp.js";

// Builds the brief and sends it to the chosen channels. Never throws. An empty week (no apps, no
// rivals, nothing to do) is not sent: an email with nothing in it teaches people to ignore the next one.
export async function sendBrief(email, settings, { email: wantEmail, chat: wantChat }) {
  const result = { empty: false, email: "skipped", chat: "skipped" };
  let brief;
  try { brief = await buildBrief(email); } catch { return { ...result, error: "build_failed" }; }
  if (brief.empty) return { ...result, empty: true };
  await addNotification(email, { kind: "brief", title: "Your week in apps is ready", body: "A summary of your apps, rivals and open tasks.", href: "/console" });
  if (wantEmail) {
    if (!emailConfigured()) result.email = "not_configured";
    else {
      try {
        const url = briefUnsubscribeUrl(settings.unsub_token);
        await sendEmail({ to: email, subject: "Your week in apps", html: briefToHtml(brief, { unsubscribeUrl: url }), headers: { "List-Unsubscribe": `<${url}>` } });
        result.email = "sent";
      } catch { result.email = "failed"; }
    }
  }
  if (wantChat) {
    const r = await notifyUser(email, { title: "Your week in apps", text: briefToText(brief), link: briefHomeUrl() });
    result.chat = r.sent ? "sent" : r.reason === "no_channel" ? "no_channel" : "failed";
  }
  return result;
}
