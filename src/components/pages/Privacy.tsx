"use client";

/* eslint-disable react/no-unescaped-entities */
export function Privacy() {
  return (
    <div className="min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-bold mb-6">
          <span className="text-[#00FF94]">Privacy</span> Policy
        </h1>
        <p className="text-[#A0A0A0] mb-4">Last updated: April 3, 2026</p>
        <p className="text-[#A0A0A0] mb-12">
          This policy applies to <strong className="text-white">morra.store</strong> and related services operated by MORRA ("we," "us," or "our").
        </p>

        <div className="space-y-8 text-[#A0A0A0]">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Information We Collect</h2>
            <ul className="space-y-2 list-disc list-inside leading-relaxed">
              <li><strong className="text-white">Account data</strong> — identifiers and profile information associated with your morra.store account (for example, username, display name, and email where collected for billing, receipts, or account recovery).</li>
              <li><strong className="text-white">Usage data</strong> — interactions with morra.store (e.g. features used, device/browser type, approximate logs and diagnostics) to run and improve the service.</li>
              <li><strong className="text-white">Payment data</strong> — billing-related information processed by our payment provider, Stripe. We do not receive your full card number; Stripe handles card data according to its policies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">How We Use Information</h2>
            <p className="leading-relaxed mb-4">
              We use the information above to provide and improve morra.store: authentication, subscriptions and credits, security and abuse prevention, analytics to improve reliability and product quality, and customer support through in-product channels.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Third-Party Services</h2>
            <ul className="space-y-2 list-disc list-inside leading-relaxed">
              <li><strong className="text-white">Stripe</strong> — payment processing for purchases and subscriptions. Stripe's privacy policy governs how Stripe handles payment data.</li>
              <li><strong className="text-white">Supabase</strong> — hosted backend (database, authentication-related infrastructure) for account and application data.</li>
            </ul>
            <p className="leading-relaxed mt-4">
              These providers may process data on our behalf under their terms and applicable law. We encourage you to review their privacy notices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Data Retention & Protection</h2>
            <p className="leading-relaxed mb-4">
              We retain information only as long as needed to operate morra.store, meet legal obligations, resolve disputes, and enforce agreements. We use industry-standard safeguards including encryption in transit (HTTPS), access controls, and secure infrastructure via our service providers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Your Rights</h2>
            <p className="leading-relaxed mb-4">
              Depending on your location, you may have rights to access, correct, delete, or export personal data, and to object to or restrict certain processing. You may exercise these rights where applicable through your account on morra.store or by contacting us as described below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Children</h2>
            <p className="leading-relaxed">
              morra.store is not directed at children under 13. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Changes</h2>
            <p className="leading-relaxed">
              We may update this policy from time to time. The "Last updated" date at the top will change when we post a revision. Continued use of morra.store after changes constitutes acceptance of the updated policy where permitted by law.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-2xl font-bold text-white mb-4">Contact</h2>
            <p className="leading-relaxed">
              Users can contact support via the <strong className="text-white">AI assistant</strong> on <strong className="text-white">morra.store</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
