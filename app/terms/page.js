import { legalStyles } from "../legal-styles";

export const metadata = { title: "Terms of Service — Kick My Apps" };

export default function TermsPage() {
  return (
    <main className="legal-page">
      <style>{legalStyles}</style>
      <div className="legal-title">Terms of Service</div>
      <div className="legal-updated">Last updated: August 19, 2026</div>

      <div className="legal-disclaimer">
        This is a draft template provided for convenience and has not been reviewed by a lawyer. Please have qualified legal counsel review and customize these terms before relying on them as your official, binding agreement.
      </div>

      <div className="legal-section">
        <div className="legal-h2">1. Acceptance of Terms</div>
        <p className="legal-p">
          By accessing or using Kick My Apps (the "Service"), you agree to be bound by these Terms of Service. If you don't agree, please don't use the Service.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">2. Description of Service</div>
        <p className="legal-p">
          Kick My Apps analyzes app screenshots and public App Store data using AI to generate UX health reports, including findings, scores, and recommendations. Reports are generated automatically and are provided for informational purposes.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">3. Accounts</div>
        <p className="legal-p">
          You're responsible for maintaining the confidentiality of your account and for all activity that occurs under it. Please notify us immediately if you suspect unauthorized use of your account.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">4. Subscriptions & Billing</div>
        <p className="legal-p">
          Kick My Apps offers Free, Pro, and Enterprise plans with different usage limits and features. Paid plans are billed monthly or annually, and may be canceled at any time; cancellation takes effect at the end of the current billing period.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">5. Acceptable Use</div>
        <p className="legal-p">You agree not to:</p>
        <ul className="legal-ul">
          <li className="legal-li">Use the Service to analyze content you don't have the right to submit.</li>
          <li className="legal-li">Attempt to reverse-engineer, scrape, or disrupt the Service.</li>
          <li className="legal-li">Use the Service for any unlawful purpose.</li>
        </ul>
      </div>

      <div className="legal-section">
        <div className="legal-h2">6. Intellectual Property</div>
        <p className="legal-p">
          You retain ownership of the screenshots and content you submit. We retain ownership of the Service itself, including its design, code, and generated report formatting.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">7. Disclaimers</div>
        <p className="legal-p">
          Reports are generated automatically by AI and are provided "as is," without warranty of any kind. Findings, scores, and estimated impact figures are guidance, not guarantees, and should be reviewed by your own team before acting on them.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">8. Limitation of Liability</div>
        <p className="legal-p">
          To the fullest extent permitted by law, Kick My Apps will not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">9. Termination</div>
        <p className="legal-p">
          We may suspend or terminate your access to the Service if you violate these Terms. You may stop using the Service and close your account at any time.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">10. Changes to These Terms</div>
        <p className="legal-p">
          We may update these Terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.
        </p>
      </div>

      <div className="legal-section">
        <div className="legal-h2">11. Contact Us</div>
        <p className="legal-p">
          Questions about these Terms? Contact us at <span className="legal-muted">support@kickmyapps.com</span>.
        </p>
      </div>
    </main>
  );
}
