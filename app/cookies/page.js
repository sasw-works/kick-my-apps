import { legalStyles } from "../legal-styles";

export const metadata = { title: "Cookie Policy — Kick My Apps" };

export default function CookiesPage() {
  return (
    <main className="legal-page">
      <style>{legalStyles}</style>
      <div className="legal-title">Cookie Policy</div>
      <div className="legal-updated">Last updated: August 19, 2026</div>

      <div className="legal-disclaimer">
        This is a draft template provided for convenience and has not been reviewed by a lawyer. Please have qualified legal counsel review and customize this policy, and verify it matches your actual cookie usage, before relying on it as official.
      </div>

      <div className="legal-section">
        <div className="legal-h2">1. What Are Cookies</div>
        <p className="legal-p">
          Cookies are small text files stored on your device when you visit a website. They help the site function properly and remember information about your visit.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">2. Cookies We Use</div>
        <ul className="legal-ul">
          <li className="legal-li"><strong>Essential cookies</strong> — required for core functionality, such as keeping you signed in and remembering your session while you use the Service.</li>
          <li className="legal-li"><strong>Preference cookies</strong> — remember choices you make, such as your selected billing cycle on the pricing page.</li>
        </ul>
        <p className="legal-p">
          We do not currently use third-party advertising or tracking cookies.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">3. Managing Cookies</div>
        <p className="legal-p">
          Most browsers let you control cookies through their settings, including blocking or deleting them. Note that disabling essential cookies may affect how well the Service works for you.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">4. Changes to This Policy</div>
        <p className="legal-p">
          We may update this Cookie Policy from time to time as our use of cookies changes. We'll update the "Last updated" date above when we do.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">5. Contact Us</div>
        <p className="legal-p">
          Questions about this Cookie Policy? Contact us at <span className="legal-muted">support@kickmyapps.com</span>.
        </p>
      </div>
    </main>
  );
}
