import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — PreRoll.io',
  description: 'Terms and conditions for using PreRoll.io.',
}

const sections = [
  { id: 'acceptance-of-terms', label: 'Acceptance of Terms' },
  { id: 'description-of-service', label: 'Description of Service' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'subscriptions-and-billing', label: 'Subscriptions & Billing' },
  { id: 'your-content', label: 'Your Content' },
  { id: 'acceptable-use', label: 'Acceptable Use' },
  { id: 'third-party-integrations', label: 'Third-Party Integrations' },
  { id: 'service-availability', label: 'Service Availability' },
  { id: 'limitation-of-liability', label: 'Limitation of Liability' },
  { id: 'termination', label: 'Termination' },
  { id: 'changes-to-terms', label: 'Changes to Terms' },
  { id: 'contact', label: 'Contact' },
]

export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto px-7 py-16 sm:py-20">
      <header className="mb-12">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.02em] text-text-primary">Terms of Service</h1>
        <p className="text-sm text-text-secondary mt-2">Last updated: May 19, 2026</p>
      </header>

      <nav className="mb-12 p-5 rounded-[12px] border border-border-default bg-surface-raised">
        <p className="text-xs font-semibold tracking-[0.06em] uppercase text-text-secondary mb-3">On this page</p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-sm text-text-secondary hover:text-accent transition-colors py-0.5 inline-block">
                {i + 1}. {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10 text-sm text-text-secondary leading-relaxed">
        <section id="acceptance-of-terms">
          <h2 className="text-base font-semibold text-text-primary mb-3">1. Acceptance of Terms</h2>
          <p>By accessing or using PreRoll.io (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these terms.</p>
        </section>

        <section id="description-of-service">
          <h2 className="text-base font-semibold text-text-primary mb-3">2. Description of Service</h2>
          <p>PreRoll.io is a podcast production management platform that helps producers manage client shows, episode workflows, assets, and publishing. The Service includes a web application, REST API, MCP server, and integrations with third-party tools.</p>
        </section>

        <section id="accounts">
          <h2 className="text-base font-semibold text-text-primary mb-3">3. Accounts</h2>
          <p>You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating an account. One person or organization may not maintain more than one free account.</p>
        </section>

        <section id="subscriptions-and-billing">
          <h2 className="text-base font-semibold text-text-primary mb-3">4. Subscriptions and Billing</h2>
          <p>Paid plans are billed monthly or annually through Stripe. You can cancel at any time; cancellation takes effect at the end of the current billing period. Refunds are not provided for partial billing periods. AI credits are non-refundable once purchased.</p>
        </section>

        <section id="your-content">
          <h2 className="text-base font-semibold text-text-primary mb-3">5. Your Content</h2>
          <p>You retain ownership of all content you upload or create through the Service. By using PreRoll, you grant us a limited license to store, process, and display your content as necessary to provide the Service. We do not claim ownership of your podcast content, client data, or creative assets.</p>
        </section>

        <section id="acceptable-use">
          <h2 className="text-base font-semibold text-text-primary mb-3">6. Acceptable Use</h2>
          <p>You agree not to use the Service to: violate any applicable law; infringe on intellectual property rights; transmit malware or exploit vulnerabilities; abuse API rate limits or automated access; or interfere with the Service&apos;s operation.</p>
        </section>

        <section id="third-party-integrations">
          <h2 className="text-base font-semibold text-text-primary mb-3">7. Third-Party Integrations</h2>
          <p className="mb-3">The Service integrates with third-party platforms including YouTube, Frame.io, Google Drive, Vimeo, Transistor.fm, Stripe, and Deepgram. Your use of these integrations is subject to the respective third-party&apos;s terms of service and privacy policies.</p>
          <p className="mb-3">By connecting a third-party account, you authorize PreRoll to access and transmit data to that service on your behalf as necessary to provide the requested functionality. You can disconnect any integration at any time through your account settings.</p>
          <p>PreRoll&apos;s use of YouTube API Services is subject to the <a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" className="text-accent hover:underline">YouTube API Services Terms of Service</a>. You may also revoke PreRoll&apos;s access to your Google account at any time via <a href="https://myaccount.google.com/permissions" className="text-accent hover:underline">Google&apos;s security settings</a>.</p>
        </section>

        <section id="service-availability">
          <h2 className="text-base font-semibold text-text-primary mb-3">8. Service Availability</h2>
          <p>We strive for high availability but do not guarantee uninterrupted access. We may perform maintenance with reasonable notice. We are not liable for downtime caused by third-party services, infrastructure providers, or events beyond our control.</p>
        </section>

        <section id="limitation-of-liability">
          <h2 className="text-base font-semibold text-text-primary mb-3">9. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, PreRoll.io and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you paid in the 12 months preceding the claim.</p>
        </section>

        <section id="termination">
          <h2 className="text-base font-semibold text-text-primary mb-3">10. Termination</h2>
          <p>Either party may terminate this agreement at any time. We may suspend or terminate your account if you violate these terms. Upon termination, you may export your data within 30 days, after which it will be deleted.</p>
        </section>

        <section id="changes-to-terms">
          <h2 className="text-base font-semibold text-text-primary mb-3">11. Changes to Terms</h2>
          <p>We may update these terms from time to time. Material changes will be communicated via email or in-app notification at least 14 days before taking effect. Continued use of the Service after changes take effect constitutes acceptance.</p>
        </section>

        <section id="contact">
          <h2 className="text-base font-semibold text-text-primary mb-3">12. Contact</h2>
          <p>For questions about these terms, email <a href="mailto:trevor@trevorohare.com" className="text-accent hover:underline">trevor@trevorohare.com</a>.</p>
        </section>
      </div>

      <div className="mt-14 pt-8 border-t border-border-subtle">
        <p className="text-sm text-text-secondary">
          See also: <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
