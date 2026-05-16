import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy �� PreRoll.io',
  description: 'How PreRoll.io collects, uses, and protects your data.',
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.02em] mb-2">Privacy Policy</h1>
        <p className="text-sm text-text-tertiary mb-10">Last updated: May 16, 2026</p>

        <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">1. Information We Collect</h2>
            <p>When you create an account, we collect your email address and name. When you use PreRoll, we store the data you provide — client information, show details, episode content, and uploaded assets. We also collect standard usage analytics (page views, feature usage) to improve the product.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">2. How We Use Your Information</h2>
            <p>We use your information to provide and improve the PreRoll service, process payments, send transactional emails (invitations, notifications), and respond to support requests. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">3. Third-Party Services</h2>
            <p>PreRoll integrates with services you connect (Frame.io, Google Drive, Vimeo, Transistor.fm, Stripe, Deepgram, and others). When you authorize an integration, data is shared with that service according to their own privacy policies. We only share what is necessary for the integration to function.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">4. Data Storage and Security</h2>
            <p>Your data is stored in Supabase (PostgreSQL) with row-level security. File assets are stored in Cloudflare R2. All data is encrypted in transit (TLS) and at rest. We use industry-standard security practices to protect your information.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">5. AI Features</h2>
            <p>When you use AI features (transcription, content generation, chat), your audio and text are processed by Anthropic (Claude) and Deepgram. These providers process data according to their privacy policies and do not use your content for training. You can opt out of AI features entirely.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">6. Data Retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account, we remove your data within 30 days, except where required by law or for legitimate business purposes (e.g., payment records).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">7. Your Rights</h2>
            <p>You can access, export, correct, or delete your data at any time through your account settings or by contacting us. If you are in the EU/UK, you have additional rights under GDPR including the right to data portability and the right to object to processing.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary mb-3">8. Contact</h2>
            <p>For privacy questions or requests, email <a href="mailto:trevor@trevorohare.com" className="text-accent hover:underline">trevor@trevorohare.com</a>.</p>
          </section>
        </div>
      </div>
    </main>
  )
}
