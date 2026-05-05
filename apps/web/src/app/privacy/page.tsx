import type { Metadata } from "next";
import Link from "next/link";
import { LegalTOC } from "@/components/LegalTOC";
import { PreLoginNav } from "@/components/PreLoginNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — PledgeOFF",
  description: "How PledgeOFF collects, uses, and protects your personal data. GDPR-compliant.",
  alternates: { canonical: "https://pledgeoff.com/privacy" },
  robots: { index: true, follow: true },
};

const PRIVACY_TOC = [
  { id: "s1", label: "01 · Who we are" },
  { id: "s2", label: "02 · What we collect" },
  { id: "s3", label: "03 · Legal basis (GDPR)" },
  { id: "s4", label: "04 · How we use it" },
  { id: "s5", label: "05 · Third-party processors" },
  { id: "s6", label: "06 · International transfers" },
  { id: "s7", label: "07 · Data retention" },
  { id: "s8", label: "08 · Cookies" },
  { id: "s9", label: "09 · Your rights" },
  { id: "s10", label: "10 · Children" },
  { id: "s11", label: "11 · Security" },
  { id: "s12", label: "12 · Third-party links" },
  { id: "s13", label: "13 · Changes" },
  { id: "s14", label: "14 · Contact" },
];

export default function PrivacyPage() {
  return (
    <div style={{ background: "var(--canvas)", color: "var(--t1)" }}>
      <PreLoginNav extraLink={{ href: "/terms", label: "Terms" }} />

      {/* Heading band — sticky below PreLoginNav */}
      <section
        className="border-b sticky top-12 z-40"
        style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
      >
        <div className="max-w-[1100px] mx-auto px-8 py-4">
          <div className="mono text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--t3)" }}>
            LEGAL · DOC_03
          </div>
          <h1
            className="display font-semibold leading-tight"
            style={{ fontSize: "22px", letterSpacing: "-0.04em", color: "var(--t1)" }}
          >
            Privacy Policy
          </h1>
          <div className="mt-1.5 flex items-center gap-3 mono text-[10px]" style={{ color: "var(--t3)" }}>
            <span>UPDATED · APR 12 2026</span>
            <span>·</span>
            <span>EFFECTIVE · MAY 1 2026</span>
            <span>·</span>
            <span>VERSION 2.4</span>
          </div>
        </div>
      </section>

      {/* 2-col layout */}
      <div className="max-w-[1100px] mx-auto px-8 py-12 flex gap-12">

        {/* TOC sidebar */}
        <aside className="w-[220px] hidden md:block flex-shrink-0">
          <div className="sticky top-[144px]">
            <div className="mono text-[10px] uppercase tracking-wider mb-4" style={{ color: "var(--t3)" }}>
              CONTENTS
            </div>
            <LegalTOC items={PRIVACY_TOC} />
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="prose-legal">
          <Section id="s1" title="1. Who we are">
            <p>
              PledgeOFF (&quot;PledgeOFF&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a Decision Intelligence
              Platform that helps founders validate product ideas using live market signals.
            </p>
            <p>
              We operate the website and application at{" "}
              <a href="https://pledgeoff.com">pledgeoff.com</a>.
            </p>
            <p>
              For any privacy-related enquiries, contact us at{" "}
              <a href="mailto:hello@pledgeoff.com">hello@pledgeoff.com</a>.
            </p>
          </Section>

          <Section id="s2" title="2. What personal data we collect">
            <Subsection title="2.1 Account data">
              <p>When you create an account we collect:</p>
              <ul>
                <li>
                  <strong>Email address</strong> — required for authentication and
                  transactional emails.
                </li>
                <li>
                  <strong>Password</strong> — stored as a salted bcrypt hash by
                  our authentication provider (Supabase). We never see your plain-text
                  password.
                </li>
                <li>
                  <strong>Google profile data</strong> (if you sign in with Google) —
                  name, email address, and profile picture as provided by Google OAuth.
                  We store only the email and a hashed identifier.
                </li>
                <li>
                  <strong>Account creation timestamp</strong> and last sign-in
                  timestamp.
                </li>
              </ul>
            </Subsection>

            <Subsection title="2.2 Content you submit">
              <p>
                <strong>Idea text</strong> — the free-text description of the product
                idea you submit for validation. This text is sent to our AI provider
                (Groq) and used to fetch public signals from Reddit and GitHub. Ideas
                are stored in our database and linked to your user account.
              </p>
              <p>
                <strong>Feedback votes</strong> — thumbs-up or thumbs-down signals on
                AI verdicts. Stored anonymously per decision record.
              </p>
            </Subsection>

            <Subsection title="2.3 Technical and usage data">
              <p>We automatically collect:</p>
              <ul>
                <li>
                  <strong>IP address</strong> — logged at the server level by our
                  hosting provider (Vercel) and included in structured server logs. IP
                  addresses are not stored in our database; they are retained in log
                  files for up to 30 days.
                </li>
                <li>
                  <strong>Browser and device information</strong> — user-agent string,
                  viewport size, operating system. Used for error diagnostics.
                </li>
                <li>
                  <strong>Request metadata</strong> — URL path, HTTP method, response
                  status, latency in milliseconds, and a randomly generated trace ID
                  per request. Used for performance monitoring.
                </li>
                <li>
                  <strong>Error data</strong> — JavaScript stack traces and error
                  messages captured by our error-tracking tool (Sentry) when the
                  application crashes. Error payloads do not include your idea text.
                </li>
                <li>
                  <strong>Page view data</strong> — if you have consented to analytics
                  cookies, we use Google Analytics 4 to track page visits and user
                  journeys in aggregate form.
                </li>
              </ul>
            </Subsection>

            <Subsection title="2.4 Data we do NOT collect">
              <ul>
                <li>Mobile phone number</li>
                <li>Payment card details (handled entirely by our payment processor)</li>
                <li>Physical address</li>
                <li>Government ID or date of birth</li>
                <li>Any special category data (health, political opinions, etc.)</li>
              </ul>
            </Subsection>
          </Section>

          <Section id="s3" title="3. Legal basis for processing (GDPR)">
            <p>
              We process personal data under the following legal bases as defined in
              Article 6 of the GDPR:
            </p>
            <table>
              <thead>
                <tr>
                  <th>Processing activity</th>
                  <th>Legal basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Creating and managing your account</td>
                  <td>Performance of a contract (Art. 6(1)(b))</td>
                </tr>
                <tr>
                  <td>Processing idea submissions and generating verdicts</td>
                  <td>Performance of a contract (Art. 6(1)(b))</td>
                </tr>
                <tr>
                  <td>Sending transactional emails (account confirmation, password reset)</td>
                  <td>Performance of a contract (Art. 6(1)(b))</td>
                </tr>
                <tr>
                  <td>Server logs and error tracking for security and reliability</td>
                  <td>Legitimate interests (Art. 6(1)(f)) — ensuring platform integrity</td>
                </tr>
                <tr>
                  <td>Analytics and usage statistics</td>
                  <td>Consent (Art. 6(1)(a)) — via cookie banner</td>
                </tr>
                <tr>
                  <td>Marketing emails and product updates</td>
                  <td>Consent (Art. 6(1)(a)) — explicit opt-in only</td>
                </tr>
                <tr>
                  <td>Compliance with legal obligations</td>
                  <td>Legal obligation (Art. 6(1)(c))</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section id="s4" title="4. How we use your data">
            <ul>
              <li>To create and maintain your account.</li>
              <li>
                To process your idea submissions: the idea text is sent to our AI
                provider to generate a GO / KILL / PIVOT verdict with supporting
                evidence.
              </li>
              <li>
                To fetch public market signals (Reddit threads, GitHub issues) relevant
                to your idea. We do not share your idea text with Reddit or GitHub —
                we query those platforms independently using your idea as a search
                context.
              </li>
              <li>To send you email confirmations and essential account notifications.</li>
              <li>
                To detect and prevent fraud, abuse, and security incidents.
              </li>
              <li>
                To improve and debug the platform using anonymised, aggregated usage
                data.
              </li>
              <li>
                To send you product updates and marketing emails if you have explicitly
                opted in. You can unsubscribe at any time via the link in any email.
              </li>
            </ul>
          </Section>

          <Section id="s5" title="5. Third-party processors">
            <p>
              We engage the following sub-processors to deliver the service. Each
              processor is bound by a Data Processing Agreement and, where applicable,
              Standard Contractual Clauses for international transfers.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Processor</th>
                  <th>Purpose</th>
                  <th>Data shared</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
                      Supabase
                    </a>
                  </td>
                  <td>Database, authentication, row-level security</td>
                  <td>Email, hashed password, idea text, decisions, feedback</td>
                  <td>AWS us-east-1 (US)</td>
                </tr>
                <tr>
                  <td>
                    <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
                      Vercel
                    </a>
                  </td>
                  <td>Application hosting, edge network, server logs</td>
                  <td>IP address, request metadata, server logs</td>
                  <td>Global CDN (US primary)</td>
                </tr>
                <tr>
                  <td>
                    <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer">
                      Groq
                    </a>
                  </td>
                  <td>LLM inference (verdict generation)</td>
                  <td>Idea text, signal summaries</td>
                  <td>US</td>
                </tr>
                <tr>
                  <td>
                    <a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer">
                      Resend
                    </a>
                  </td>
                  <td>Transactional email delivery</td>
                  <td>Email address, email content</td>
                  <td>US</td>
                </tr>
                <tr>
                  <td>
                    <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer">
                      Sentry
                    </a>
                  </td>
                  <td>Error tracking and diagnostics</td>
                  <td>Stack traces, browser info, anonymised user ID</td>
                  <td>US</td>
                </tr>
                <tr>
                  <td>
                    <a href="https://axiom.co/privacy" target="_blank" rel="noopener noreferrer">
                      Axiom
                    </a>
                  </td>
                  <td>Server log management</td>
                  <td>Structured server logs (trace IDs, latency, status codes)</td>
                  <td>US</td>
                </tr>
                <tr>
                  <td>
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                      Google
                    </a>
                  </td>
                  <td>OAuth sign-in (optional), Analytics (consent-gated)</td>
                  <td>Email, name (OAuth); anonymised browsing data (Analytics)</td>
                  <td>US/global</td>
                </tr>
                <tr>
                  <td>
                    <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
                      Cloudflare
                    </a>
                  </td>
                  <td>DNS, DDoS protection</td>
                  <td>IP address (in transit only, not stored by Cloudflare for us)</td>
                  <td>Global</td>
                </tr>
              </tbody>
            </table>
            <p>
              We do not sell your personal data to any third party, ever.
            </p>
          </Section>

          <Section id="s6" title="6. International data transfers">
            <p>
              Several of our processors are based in the United States. Where personal
              data is transferred from the European Economic Area (EEA) or the United
              Kingdom to countries not recognised as providing adequate data protection,
              we rely on:
            </p>
            <ul>
              <li>
                <strong>Standard Contractual Clauses (SCCs)</strong> — the EU
                Commission&apos;s approved model clauses for controller-to-processor
                transfers; and/or
              </li>
              <li>
                <strong>Data Privacy Framework (DPF)</strong> — for processors
                certified under the EU-US Data Privacy Framework.
              </li>
            </ul>
            <p>
              You can request a copy of the relevant transfer safeguards by emailing{" "}
              <a href="mailto:hello@pledgeoff.com">hello@pledgeoff.com</a>.
            </p>
          </Section>

          <Section id="s7" title="7. Data retention">
            <table>
              <thead>
                <tr>
                  <th>Data type</th>
                  <th>Retention period</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Account data (email, auth records)</td>
                  <td>Until account deletion, then 30 days for soft-delete recovery</td>
                </tr>
                <tr>
                  <td>Idea submissions and verdicts</td>
                  <td>Until account deletion or explicit deletion request</td>
                </tr>
                <tr>
                  <td>Feedback votes</td>
                  <td>Anonymised and retained indefinitely for model improvement</td>
                </tr>
                <tr>
                  <td>Server and access logs</td>
                  <td>30 days (Vercel) / 30 days (Axiom)</td>
                </tr>
                <tr>
                  <td>Error reports (Sentry)</td>
                  <td>90 days</td>
                </tr>
                <tr>
                  <td>Analytics data (GA4, if consented)</td>
                  <td>14 months (Google default, anonymised)</td>
                </tr>
                <tr>
                  <td>Waitlist emails</td>
                  <td>Until unsubscribe or account creation, whichever is first</td>
                </tr>
              </tbody>
            </table>
            <p>
              When you delete your account, all personally identifiable data is removed
              from our primary database within 30 days. Anonymised or aggregated data
              derived from your usage (e.g., aggregate verdict statistics) may be
              retained indefinitely.
            </p>
          </Section>

          <Section id="s8" title="8. Cookies and tracking technologies">
            <Subsection title="8.1 What cookies we use">
              <table>
                <thead>
                  <tr>
                    <th>Cookie</th>
                    <th>Type</th>
                    <th>Purpose</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>sb-*</code></td>
                    <td>Strictly necessary</td>
                    <td>Supabase authentication session</td>
                    <td>Session / 1 week</td>
                  </tr>
                  <tr>
                    <td><code>cookie_consent</code></td>
                    <td>Strictly necessary</td>
                    <td>Stores your cookie consent decision</td>
                    <td>1 year</td>
                  </tr>
                  <tr>
                    <td><code>_ga</code>, <code>_ga_*</code></td>
                    <td>Analytics (consent required)</td>
                    <td>Google Analytics 4 — page views and user journeys in aggregate</td>
                    <td>2 years</td>
                  </tr>
                </tbody>
              </table>
            </Subsection>

            <Subsection title="8.2 Your choices">
              <p>
                When you first visit PledgeOFF, you will see a cookie banner. You may:
              </p>
              <ul>
                <li>
                  <strong>Accept all</strong> — enables strictly necessary cookies and
                  analytics cookies.
                </li>
                <li>
                  <strong>Reject non-essential</strong> — strictly necessary cookies
                  only (the service requires these to function).
                </li>
              </ul>
              <p>
                You can withdraw or change your consent at any time by clearing your
                browser cookies for <code>pledgeoff.com</code>. The banner will
                reappear on your next visit.
              </p>
              <p>
                You can also opt out of Google Analytics across all websites using the{" "}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Analytics Opt-out Browser Add-on
                </a>
                .
              </p>
            </Subsection>
          </Section>

          <Section id="s9" title="9. Your rights under GDPR">
            <p>
              If you are located in the European Economic Area (EEA) or the United
              Kingdom, you have the following rights regarding your personal data:
            </p>
            <ul>
              <li>
                <strong>Right of access (Art. 15)</strong> — you can request a copy
                of all personal data we hold about you.
              </li>
              <li>
                <strong>Right to rectification (Art. 16)</strong> — you can ask us to
                correct inaccurate or incomplete data.
              </li>
              <li>
                <strong>Right to erasure / &quot;right to be forgotten&quot; (Art. 17)</strong>{" "}
                — you can ask us to delete your personal data. We will comply unless we
                are required to retain it by law.
              </li>
              <li>
                <strong>Right to restriction of processing (Art. 18)</strong> — you
                can ask us to suspend processing of your data in certain circumstances.
              </li>
              <li>
                <strong>Right to data portability (Art. 20)</strong> — you can request
                a machine-readable export of the data you provided to us (account
                details, idea submissions, verdicts).
              </li>
              <li>
                <strong>Right to object (Art. 21)</strong> — you can object to
                processing based on legitimate interests (e.g., server-side logging).
                We will assess and respond within 30 days.
              </li>
              <li>
                <strong>Right to withdraw consent</strong> — for any processing based
                on your consent (analytics, marketing emails), you can withdraw at any
                time without affecting the lawfulness of prior processing.
              </li>
              <li>
                <strong>Right to lodge a complaint</strong> — you have the right to
                lodge a complaint with your national data protection supervisory
                authority. In Ireland: the{" "}
                <a
                  href="https://www.dataprotection.ie"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Data Protection Commission
                </a>
                . In Germany: your state&apos;s{" "}
                <a
                  href="https://www.bfdi.bund.de"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Datenschutzbehörde
                </a>
                .
              </li>
            </ul>
            <p>
              To exercise any of these rights, email us at{" "}
              <a href="mailto:hello@pledgeoff.com">hello@pledgeoff.com</a> with the
              subject line &quot;Privacy Request — [your right]&quot;. We will respond within
              30 days. We may need to verify your identity before fulfilling the
              request.
            </p>
          </Section>

          <Section id="s10" title="10. Children">
            <p>
              PledgeOFF is not directed at children under the age of 16. We do not
              knowingly collect personal data from anyone under 16. If you believe we
              have inadvertently collected such data, please contact us at{" "}
              <a href="mailto:hello@pledgeoff.com">hello@pledgeoff.com</a> and we will
              delete it promptly.
            </p>
          </Section>

          <Section id="s11" title="11. Security">
            <p>
              We implement appropriate technical and organisational measures to protect
              your data against unauthorised access, alteration, disclosure, or
              destruction, including:
            </p>
            <ul>
              <li>All data in transit encrypted with TLS 1.2+.</li>
              <li>All data at rest encrypted using AES-256 (Supabase).</li>
              <li>
                Row-level security (RLS) on all database tables — no user can read
                another user&apos;s data.
              </li>
              <li>Rate limiting on all API endpoints.</li>
              <li>No secrets or personal data in application logs.</li>
              <li>
                Service role keys (used server-side only) rotated on any suspected
                compromise.
              </li>
            </ul>
            <p>
              Despite our best efforts, no method of transmission or storage is 100%
              secure. In the event of a data breach that is likely to result in a high
              risk to your rights and freedoms, we will notify you without undue delay
              and no later than 72 hours after becoming aware.
            </p>
          </Section>

          <Section id="s12" title="12. Links to third-party sites">
            <p>
              Our blog and application may contain links to third-party websites. This
              Privacy Policy does not apply to those sites. We encourage you to review
              their privacy policies before providing any personal data.
            </p>
          </Section>

          <Section id="s13" title="13. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will
              update the &quot;Last updated&quot; date at the top of this page. For material
              changes, we will notify registered users by email at least 14 days before
              the change takes effect.
            </p>
            <p>
              Continued use of the service after the effective date of any change
              constitutes your acceptance of the revised Privacy Policy.
            </p>
          </Section>

          <Section id="s14" title="14. Contact">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy
              Policy or how we handle your data, please contact us:
            </p>
            <p>
              <strong>PledgeOFF</strong>
              <br />
              Email:{" "}
              <a href="mailto:hello@pledgeoff.com">hello@pledgeoff.com</a>
              <br />
              Website:{" "}
              <a href="https://pledgeoff.com">https://pledgeoff.com</a>
            </p>
          </Section>

          <div className="mt-12 pt-8 border-t border-(--border)">
            <p className="text-[13px] text-(--t3)">
              See also:{" "}
              <Link href="/terms" className="text-(--accent) hover:opacity-80">
                Terms of Service
              </Link>
            </p>
          </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10" style={{ scrollMarginTop: "156px" }}>
      <h2 className="text-[18px] font-bold text-(--t1) mb-4 mt-8">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Subsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-[14px] font-semibold text-(--t1) mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
