import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Meek Meet",
  description: "How Meek Meet collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 bg-cream">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <h1 className="font-serif text-4xl text-charcoal mb-8">Privacy Policy</h1>
        <p className="text-charcoal-muted mb-8">Last updated: 25 November 2026</p>

        <div className="prose prose-lg prose-stone max-w-none">
          <p>
            Meek Meet (“we”, “us”, or “our”) is committed to protecting the privacy of
            the communities and individuals who use our platform. This Privacy Policy
            explains what information we collect, how we use it, and the choices you have.
          </p>
          <p>
            Meek Meet is operated by Martin Khoury (sole trader), ABN 96 557 008 393, based
            in New South Wales, Australia. “We”, “us” and “our” in this policy refer to that
            operator.
          </p>

          <h2>1. Information We Collect</h2>
          <ul>
            <li>
              <strong>Account information:</strong> name, email address, and profile details
              provided when you sign up.
            </li>
            <li>
              <strong>Community responses:</strong> answers, reflections, and comments you
              submit during Meek Meet gatherings.
            </li>
            <li>
              <strong>Circle information:</strong> circle name, location, meeting schedules,
              and membership details.
            </li>
            <li>
              <strong>Verification documents:</strong> if you apply to become a leader, we
              collect a government-issued photo ID, Working With Children Check, and police
              check to protect community safety. These documents are
              stored securely, visible only to authorised administrators, and deleted when
              you delete your account (see{" "}
              <a href="/delete-account" className="text-terracotta hover:underline">
                Delete Your Account
              </a>).
            </li>
            <li>
              <strong>Usage data:</strong> anonymised analytics about how the app is used,
              such as feature usage and crash reports.
            </li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To provide and improve the Meek Meet platform.</li>
            <li>To verify leader applicants and maintain community safety.</li>
            <li>To generate anonymised, aggregated insights for community reports.</li>
            <li>To send meeting reminders and important platform updates.</li>
            <li>To comply with legal obligations.</li>
          </ul>

          <h2>3. Anonymisation and Aggregation</h2>
          <p>
            Within your circle, your leader can see the responses submitted in that circle —
            that visibility is part of safeguarding and accountability. What leaves the circle
            is always anonymised and aggregated: reports shared with councils, MPs, or other
            authorities, and the public Voice dashboard, contain only anonymised summaries.
            Individual responses are never exposed publicly.
          </p>
          <p>
            We use AI to synthesise themes, sentiment, and consensus from aggregated,
            de-identified community input. No response is sent to an AI provider with your
            name attached, and every report is reviewed by a person before it leaves the
            platform.
          </p>

          <h2>4. Who Can See Your Data</h2>
          <ul>
            <li>You can see your own responses and profile.</li>
            <li>Circle leaders can see responses submitted within their circle.</li>
            <li>Platform administrators can see data needed for safety, verification, and support.</li>
            <li>Anonymised, aggregated insights may be displayed publicly on our Voice dashboard.</li>
          </ul>

          <h2>5. Data Storage and Security</h2>
          <p>
            We use Supabase for secure cloud storage. Data is protected by industry-standard
            encryption in transit and at rest. Access is controlled by authentication and
            Row Level Security policies.
          </p>

          <h2>6. Your Rights</h2>
          <p>
            You can access, update, or delete your account and personal data at any time. In
            the app, go to Profile → Delete account and your data is removed immediately; you
            can also request deletion by email (confirmed within 48 hours, completed within
            30 days). Full details are on our{" "}
            <a href="/delete-account" className="text-terracotta hover:underline">
              Delete Your Account
            </a>{" "}
            page. Deleting your account will remove your profile and individual responses;
            anonymised aggregated insights may be retained as statistical data.
          </p>

          <h2>7. Third-Party Services</h2>
          <p>
            We use trusted third-party services including Supabase (database/auth/storage),
            Resend (email), Groq (AI synthesis), and Google Cloud (optional geocoding). These
            providers are bound by their own privacy and security obligations.
          </p>

          <h2>8. Children</h2>
          <p>
            Meek Meet is not intended for children under 13. If you believe a child has
            provided us with personal information, please contact us and we will delete it.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of
            significant changes through the app or by email.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:privacy@meekmeet.com" className="text-terracotta hover:underline">
              privacy@meekmeet.com
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}
