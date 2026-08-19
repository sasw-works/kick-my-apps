import { legalStyles } from "../legal-styles";

export const metadata = { title: "Privacy Policy — Kick My Apps" };

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <style>{legalStyles}</style>
      <div className="legal-title">Privacy Policy</div>
      <div className="legal-updated">Last updated: August 19, 2026</div>

      <div className="legal-disclaimer">
        This is a draft template provided for convenience and has not been reviewed by a lawyer. Please have qualified legal counsel review and customize this policy before relying on it as your official, binding policy.
      </div>

      <div className="legal-section">
        <div className="legal-h2">1. Overview</div>
        <p className="legal-p">
          Kick My Apps ("we", "us", "our") provides an AI-powered service that analyzes mobile app screenshots and App Store data to generate UX health reports. This Privacy Policy explains what information we collect, how we use it, and the choices you have.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">2. Information We Collect</div>
        <ul className="legal-ul">
          <li className="legal-li"><strong>Account information</strong> — such as your email address, if you create an account.</li>
          <li className="legal-li"><strong>Content you submit</strong> — app screenshots, store URLs, and app names you provide for analysis.</li>
          <li className="legal-li"><strong>Analysis results</strong> — the reports, scores, and findings generated from your submissions, which we store so you can revisit them.</li>
          <li className="legal-li"><strong>Usage data</strong> — basic technical information such as browser type and pages visited, used to keep the service running reliably.</li>
        </ul>
      </div>

      <div className="legal-section">
        <div className="legal-h2">3. How We Use Your Information</div>
        <p className="legal-p">We use the information above to:</p>
        <ul className="legal-ul">
          <li className="legal-li">Generate and store your analysis reports.</li>
          <li className="legal-li">Operate, maintain, and improve the service.</li>
          <li className="legal-li">Send you service-related emails, such as weekly digests you've opted into.</li>
          <li className="legal-li">Provide customer support.</li>
        </ul>
      </div>

      <div className="legal-section">
        <div className="legal-h2">4. Third-Party Services</div>
        <p className="legal-p">
          To provide our service, we rely on a small number of third-party providers, including an AI provider to perform the analysis, an email provider to deliver notifications, and a database/hosting provider to store your data securely. These providers only receive the data necessary to perform their specific function.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">5. Data Retention & Deletion</div>
        <p className="legal-p">
          We retain your reports and account data for as long as your account is active, or as needed to provide the service. You can delete individual reports at any time from the Reports tab, and you may request full account deletion by contacting support.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">6. Your Rights</div>
        <p className="legal-p">
          Depending on where you live, you may have rights to access, correct, export, or delete your personal data. To exercise any of these rights, contact us using the details below.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">7. Cookies</div>
        <p className="legal-p">
          We use a limited set of cookies to keep the service functioning. See our <a href="/cookies" style={{ color: "var(--brand)" }}>Cookie Policy</a> for details.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">8. Changes to This Policy</div>
        <p className="legal-p">
          We may update this Privacy Policy from time to time. We'll update the "Last updated" date above when we do.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">9. Contact Us</div>
        <p className="legal-p">
          If you have questions about this Privacy Policy, contact us at <span className="legal-muted">support@kickmyapps.com</span>.
        </p>
      </div>
    </main>
  );
}
