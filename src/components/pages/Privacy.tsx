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
          This policy applies to <strong className="text-white">morra.store</strong> and related services
          operated by MORRA (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
        </p>

        <div className="space-y-8 text-[#A0A0A0]">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Information we collect</h2>
            <ul className="space-y-2 list-disc list-inside leading-relaxed">
              <li>
                <strong className="text-white">Account &amp; profile</strong>, for example{" "}
                <strong className="text-white">username</strong>, display name, and profile-related fields
                you provide. We use a <strong className="text-white">PIN</strong> for sign-in (handled
                securely; we do not use email as the primary login identifier).
              </li>
              <li>
                <strong className="text-white">Usage data</strong>, interactions with morra.store (e.g.
                features used, device/browser type, diagnostics, and abuse-prevention signals) to operate
                and secure the Service.
              </li>
              <li>
                <strong className="text-white">Referrals &amp; earnings</strong>, data needed to attribute
                referrals, calculate rewards, and process payouts (for example referral relationships and
                balances in our systems).
              </li>
              <li>
                <strong className="text-white">Stripe-related identifiers</strong>, such as Stripe
                customer IDs, Connect account IDs, and transaction metadata needed for payments and
                payouts. <strong className="text-white">We do not store your full card details;</strong>{" "}
                card data is handled by Stripe.
              </li>
              <li>
                <strong className="text-white">Song Wars</strong>, if you join tournaments, we process
                submission metadata you provide (for example track titles, public URLs you submit, optional
                lyrics, and AI-generated judging scores/feedback) to operate rounds, leaderboards, and
                notifications. You are responsible for only sharing content you have the right to use.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Payments</h2>
            <p className="leading-relaxed mb-4">
              Purchases and subscriptions are processed by <strong className="text-white">Stripe</strong>.
              MORRA <strong className="text-white">does not store full card numbers</strong> on our
              servers. Stripe&apos;s privacy policy governs how Stripe handles payment data.
            </p>
            <p className="leading-relaxed">
              <strong className="text-white">Referral payouts</strong> also run through Stripe (including
              Connect). <strong className="text-white">Sensitive financial details for payouts</strong>, such
              as bank account information you add for withdrawals, are collected and processed by{" "}
              <strong className="text-white">Stripe</strong>, not by MORRA. We may store limited identifiers
              and metadata (for example Connect account IDs and payout status) needed to operate the
              service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Cookies &amp; authentication</h2>
            <p className="leading-relaxed">
              We set an httpOnly <strong className="text-white">morra_session</strong> cookie (and related
              security measures) to keep you signed in after you log in with your username and PIN. This
              cookie is used for authentication and session continuity, not for selling your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. How we use information</h2>
            <p className="leading-relaxed mb-4">
              We use the information above to provide and improve morra.store: authentication,
              subscriptions and credits, referral attribution, earnings and payouts, security and abuse
              prevention, and support through in-product channels.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Data sharing</h2>
            <p className="leading-relaxed mb-4">
              We share data with <strong className="text-white">service providers</strong> that help us run
              the platform, such as <strong className="text-white">Stripe</strong> (payments and Connect
              payouts) and <strong className="text-white">Supabase</strong> (hosted backend / database), so
              they can process data on our behalf under their terms and applicable law.
            </p>
            <p className="leading-relaxed">
              We <strong className="text-white">do not sell your personal information</strong> to third
              parties for their marketing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Security</h2>
            <p className="leading-relaxed">
              We use industry-standard protections appropriate to the service, including encryption in
              transit (HTTPS), access controls, and secure infrastructure through our providers. No method
              of transmission or storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Data retention</h2>
            <p className="leading-relaxed mb-4">
              We retain information as long as needed to operate morra.store, meet legal obligations,
              resolve disputes, and enforce agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Your rights</h2>
            <p className="leading-relaxed mb-4">
              Depending on your location, you may have rights to access, correct, delete, or export
              personal data, and to object to or restrict certain processing, where applicable law
              provides these rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Children</h2>
            <p className="leading-relaxed">
              morra.store is not directed at children under 13. We do not knowingly collect personal
              information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Changes</h2>
            <p className="leading-relaxed">
              We may update this policy from time to time. The &quot;Last updated&quot; date reflects the
              latest revision posted on morra.store.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Song Wars &amp; automation</h2>
            <p className="leading-relaxed mb-4">
              Tournament judging uses <strong className="text-white">automated scoring</strong> through our
              AI providers. Outputs may be incorrect, biased in unpredictable ways, or unsuitable for
              real-world release decisions. See our Terms for the Song Wars disclaimer.
            </p>
            <p className="leading-relaxed">
              We log results to run the competition fairly (for example duplicate prevention, placements, and
              credit grants). We do not guarantee storage duration for every auxiliary row beyond what is
              needed to operate and audit the program.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-2xl font-bold text-white mb-4">12. Contact</h2>
            <p className="leading-relaxed">
              Users can contact support via the <strong className="text-white">AI assistant</strong> on{" "}
              <strong className="text-white">morra.store</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
