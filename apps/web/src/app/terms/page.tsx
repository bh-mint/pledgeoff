import type { Metadata } from "next";
import Link from "next/link";
import { LegalTOC } from "@/components/LegalTOC";

export const metadata: Metadata = {
  title: "Terms of Service — PledgeOFF",
  description: "Terms governing your use of the PledgeOFF platform. Read before signing up.",
  robots: { index: true, follow: true },
};

const TERMS_TOC = [
  { id: "s1", label: "01 · Agreement" },
  { id: "s2", label: "02 · Description" },
  { id: "s3", label: "03 · Registration" },
  { id: "s4", label: "04 · Plans & billing" },
  { id: "s5", label: "05 · Free trial" },
  { id: "s6", label: "06 · Cancellation" },
  { id: "s7", label: "07 · Refunds" },
  { id: "s8", label: "08 · Acceptable use" },
  { id: "s9", label: "09 · AI disclaimer" },
  { id: "s10", label: "10 · User content" },
  { id: "s11", label: "11 · IP" },
  { id: "s12", label: "12 · Liability" },
  { id: "s13", label: "13 · Governing law" },
];

export default function TermsPage() {
  return (
    <div style={{ background: "var(--canvas)", color: "var(--t1)" }}>
      {/* Nav */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: "var(--border)", background: "rgba(10,10,11,0.85)" }}>
        <div className="max-w-[1100px] mx-auto px-8 h-14 flex items-center justify-between">
          <Link href="/" className="display text-[13px] font-semibold">
            Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
          </Link>
          <nav className="flex items-center gap-6 mono text-[11px]" style={{ color: "var(--t3)" }}>
            <Link href="/pricing" style={{ color: "var(--t2)" }}>Pricing</Link>
            <Link href="/blog" style={{ color: "var(--t2)" }}>Blog</Link>
            <span style={{ color: "var(--t1)" }}>Legal</span>
            <Link
              href="/login"
              className="rounded-md px-3 h-8 inline-flex items-center"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Heading band */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1100px] mx-auto px-8 py-12">
          <div className="mono text-[10px] uppercase tracking-wider mb-3" style={{ color: "var(--t3)" }}>
            LEGAL · DOC_02
          </div>
          <h1
            className="display font-semibold leading-tight"
            style={{ fontSize: "32px", letterSpacing: "-0.04em", color: "var(--t1)" }}
          >
            Terms of Service
          </h1>
          <div className="mt-4 flex items-center gap-3 mono text-[11px]" style={{ color: "var(--t3)" }}>
            <span>UPDATED · APR 12 2026</span>
            <span>·</span>
            <span>EFFECTIVE · MAY 1 2026</span>
            <span>·</span>
            <span>VERSION 3.1</span>
          </div>
        </div>
      </section>

      {/* 2-col layout */}
      <div className="max-w-[1100px] mx-auto px-8 py-12 grid grid-cols-12 gap-12">

        {/* TOC sidebar */}
        <aside className="col-span-3 hidden md:block">
          <div className="sticky top-[88px]">
            <div className="mono text-[10px] uppercase tracking-wider mb-4" style={{ color: "var(--t3)" }}>
              CONTENTS
            </div>
            <LegalTOC items={TERMS_TOC} />
          </div>
        </aside>

        {/* Content */}
        <main className="col-span-12 md:col-span-9">
          <div className="prose-legal">
          <Section id="s1" title="1. Acceptance of terms">
            <p>
              By accessing or using PledgeOFF at{" "}
              <a href="https://pledgeoff.com">pledgeoff.com</a> (the
              &quot;Service&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree, you must not use the Service.
            </p>
            <p>
              These Terms apply to all visitors, users, and any other parties who
              access or use the Service. References to &quot;PledgeOFF&quot;,
              &quot;we&quot;, &quot;us&quot;, or &quot;our&quot; refer to the operator
              of pledgeoff.com.
            </p>
            <p>
              If you are accepting these Terms on behalf of a company or other legal
              entity, you represent that you have the authority to bind that entity to
              these Terms.
            </p>
          </Section>

          <Section id="s2" title="2. Description of the service">
            <p>
              PledgeOFF is a Decision Intelligence Platform designed to help product
              founders and entrepreneurs validate business ideas before investing
              significant time or capital. The Service:
            </p>
            <ul>
              <li>
                Accepts a plain-text description of a product idea submitted by the
                user.
              </li>
              <li>
                Fetches publicly available signals from sources including Reddit
                communities and GitHub repositories.
              </li>
              <li>
                Uses large language model (LLM) inference to generate a structured
                verdict: <strong>GO</strong>, <strong>KILL</strong>, or{" "}
                <strong>PIVOT</strong>, accompanied by supporting evidence and a
                confidence score.
              </li>
              <li>Stores submitted ideas and verdicts in the user&apos;s account.</li>
            </ul>
            <p>
              The Service is provided for informational and decision-support purposes
              only. Verdicts are generated by automated AI systems and are not
              financial, legal, or professional advice of any kind.
            </p>
          </Section>

          <Section id="s3" title="3. Account registration and eligibility">
            <Subsection title="3.1 Eligibility">
              <p>
                You must be at least 16 years old to create an account. By creating an
                account, you represent and warrant that you meet this requirement.
              </p>
            </Subsection>

            <Subsection title="3.2 Account creation">
              <p>
                You may register using an email address and password, or via Google
                OAuth. You are responsible for:
              </p>
              <ul>
                <li>
                  Providing accurate and complete registration information.
                </li>
                <li>
                  Maintaining the confidentiality of your password and access
                  credentials.
                </li>
                <li>
                  All activity that occurs under your account, whether or not you
                  authorised it.
                </li>
              </ul>
              <p>
                You must notify us immediately at{" "}
                <a href="mailto:hello@pledgeoff.com">hello@pledgeoff.com</a> if you
                become aware of any unauthorised use of your account.
              </p>
            </Subsection>

            <Subsection title="3.3 One account per user">
              <p>
                Each person may maintain only one active account. Creating multiple
                accounts to circumvent usage limits or other restrictions is prohibited
                and may result in all associated accounts being suspended.
              </p>
            </Subsection>
          </Section>

          <Section id="s4" title="4. Subscription plans and billing">
            <Subsection title="4.1 Plans">
              <p>PledgeOFF offers the following plans:</p>
              <ul>
                <li>
                  <strong>Free</strong> — 3 idea validations per calendar month at no
                  charge, with access to Reddit and Google Trends signals.
                </li>
                <li>
                  <strong>Pro</strong> — unlimited validations, all signal sources,
                  competitor matrix, revenue simulator, and AI co-founder mode, billed
                  at €19.99/month.
                </li>
                <li>
                  <strong>Agency</strong> — everything in Pro, 5 seats, white-label
                  PDF reports, and API access, billed at €99/month. Subject to a
                  separate Agency Agreement.
                </li>
              </ul>
              <p>
                Features and prices are subject to change. We will give at least 30
                days&apos; notice of any price increase to existing subscribers.
              </p>
            </Subsection>

            <Subsection title="4.2 Free trial">
              <p>
                New Pro subscribers receive a 7-day free trial. No credit card is
                required to start the trial. If you do not cancel before the trial ends,
                your chosen payment method will be charged the applicable monthly fee.
              </p>
            </Subsection>

            <Subsection title="4.3 Billing cycle">
              <p>
                Paid plans are billed monthly, in advance, on the date you first
                subscribed. All amounts are in Euros (EUR) and exclusive of any
                applicable taxes unless otherwise stated.
              </p>
            </Subsection>

            <Subsection title="4.4 Cancellation">
              <p>
                You may cancel your subscription at any time from your dashboard.
                Cancellation takes effect at the end of the current billing period; you
                retain full access until then. No partial refunds are issued for unused
                days in a billing period.
              </p>
            </Subsection>

            <Subsection title="4.5 Refunds">
              <p>
                We offer a full refund within 7 days of first payment if you are
                dissatisfied with the Service. Refund requests must be submitted to{" "}
                <a href="mailto:hello@pledgeoff.com">hello@pledgeoff.com</a>. After 7
                days, all payments are final and non-refundable.
              </p>
            </Subsection>

            <Subsection title="4.6 Failed payments">
              <p>
                If a payment fails, we will retry the charge up to three times over a
                7-day period. If the payment remains outstanding after this period, your
                subscription will be downgraded to the Free plan and access to paid
                features will be suspended until payment is resolved.
              </p>
            </Subsection>
          </Section>

          <Section id="s5" title="5. Acceptable use">
            <p>
              You agree to use the Service only for lawful purposes and in a manner
              consistent with these Terms. You must not:
            </p>
            <ul>
              <li>
                Use the Service to submit content that is unlawful, harmful,
                defamatory, obscene, or otherwise objectionable.
              </li>
              <li>
                Attempt to reverse-engineer, decompile, disassemble, or derive the
                source code of the Service.
              </li>
              <li>
                Scrape, crawl, or use automated tools to extract data from the Service
                beyond what is permitted by your plan.
              </li>
              <li>
                Use the Service to generate verdicts for purposes of creating competing
                products.
              </li>
              <li>
                Submit false, misleading, or impersonation content designed to
                manipulate verdicts.
              </li>
              <li>
                Introduce malware, viruses, or any other malicious code.
              </li>
              <li>
                Circumvent, disable, or otherwise interfere with security features of
                the Service.
              </li>
              <li>
                Resell, sublicense, or otherwise commercialise the Service without our
                prior written consent (except as permitted by an Agency plan).
              </li>
              <li>
                Violate any applicable local, national, or international law or
                regulation.
              </li>
            </ul>
            <p>
              Violation of these rules may result in immediate suspension or termination
              of your account without refund.
            </p>
          </Section>

          <Section id="s6" title="6. User content">
            <Subsection title="6.1 Your content">
              <p>
                You retain full ownership of the idea text and other content you submit
                to the Service (&quot;User Content&quot;). By submitting User Content,
                you grant PledgeOFF a limited, non-exclusive, royalty-free, worldwide
                licence to process, store, transmit, and display your User Content
                solely to the extent necessary to provide the Service to you.
              </p>
            </Subsection>

            <Subsection title="6.2 Responsibility for User Content">
              <p>
                You are solely responsible for your User Content. You represent and
                warrant that:
              </p>
              <ul>
                <li>
                  You own or have the necessary rights to submit the User Content.
                </li>
                <li>
                  The User Content does not infringe any third-party intellectual
                  property rights, privacy rights, or applicable laws.
                </li>
                <li>
                  The User Content does not contain personal data of third parties
                  without their consent.
                </li>
              </ul>
            </Subsection>

            <Subsection title="6.3 AI training">
              <p>
                We do not use your idea submissions to train AI models, either
                internally or by sharing data with AI providers for training purposes.
                Groq processes your idea text in real-time to generate a verdict and
                does not retain it for model training under our contractual arrangement.
              </p>
            </Subsection>
          </Section>

          <Section id="s7" title="7. Intellectual property">
            <p>
              The Service, including its design, interface, code, algorithms, brand
              identity, and content produced by PledgeOFF (excluding User Content), is
              owned by PledgeOFF and protected by intellectual property laws. You may
              not copy, reproduce, modify, distribute, or create derivative works of
              any part of the Service without our express written permission.
            </p>
            <p>
              The PledgeOFF name, logo, and taglines are trademarks of PledgeOFF. You
              must not use them without our prior written consent.
            </p>
            <p>
              Verdicts generated by the Service for your submitted ideas are provided
              to you under a limited, non-exclusive, non-transferable licence for your
              personal or internal business use only.
            </p>
          </Section>

          <Section id="s8" title="8. Disclaimers and limitation of liability">
            <Subsection title="8.1 No professional advice">
              <p>
                All verdicts, analyses, and content generated by PledgeOFF are produced
                by automated AI systems and are provided for informational purposes
                only. They do not constitute financial, investment, legal, business, or
                professional advice of any kind. You should not rely on them as the
                sole basis for any business decision. Always conduct your own due
                diligence and, where appropriate, seek qualified professional advice.
              </p>
            </Subsection>

            <Subsection title="8.2 No warranty">
              <p>
                The Service is provided &quot;as is&quot; and &quot;as available&quot;,
                without warranty of any kind. To the fullest extent permitted by law,
                PledgeOFF disclaims all warranties, express or implied, including but
                not limited to:
              </p>
              <ul>
                <li>Merchantability or fitness for a particular purpose.</li>
                <li>
                  Accuracy, completeness, or reliability of any verdict or analysis.
                </li>
                <li>Uninterrupted or error-free operation of the Service.</li>
                <li>
                  That the Service will meet your specific business requirements.
                </li>
              </ul>
            </Subsection>

            <Subsection title="8.3 Limitation of liability">
              <p>
                To the fullest extent permitted by applicable law, PledgeOFF shall not
                be liable for any indirect, incidental, special, consequential, or
                punitive damages, including but not limited to lost profits, lost
                revenue, lost business opportunities, or loss of data, arising out of
                or in connection with your use of the Service, even if we have been
                advised of the possibility of such damages.
              </p>
              <p>
                In no event shall PledgeOFF&apos;s total aggregate liability to you
                for all claims arising out of or in connection with the Service exceed
                the greater of: (a) the total fees you paid to PledgeOFF in the 12
                months immediately preceding the event giving rise to the claim; or
                (b) €50.
              </p>
            </Subsection>

            <Subsection title="8.4 Consumer rights">
              <p>
                Nothing in these Terms excludes or limits any rights you may have as a
                consumer under applicable law that cannot be excluded or limited by
                contract, including under EU consumer protection legislation.
              </p>
            </Subsection>
          </Section>

          <Section id="s9" title="9. Third-party services and links">
            <p>
              The Service may contain links to third-party websites or integrate with
              third-party services. These are provided for convenience only. PledgeOFF
              has no control over, and accepts no responsibility for, the content,
              privacy practices, or terms of any third-party service. Your use of
              third-party services is at your own risk and subject to their respective
              terms and policies.
            </p>
          </Section>

          <Section id="s10" title="10. Availability and modifications">
            <Subsection title="10.1 Availability">
              <p>
                We aim to provide a reliable Service but do not guarantee 100% uptime.
                We may perform maintenance, upgrades, or emergency repairs that result
                in temporary interruptions. We will endeavour to give advance notice of
                planned downtime where reasonably practicable.
              </p>
            </Subsection>

            <Subsection title="10.2 Modifications to the service">
              <p>
                We reserve the right to modify, suspend, or discontinue any feature or
                aspect of the Service at any time. We will give at least 30 days&apos;
                notice before discontinuing any feature that paid subscribers rely on.
              </p>
            </Subsection>

            <Subsection title="10.3 Modifications to these terms">
              <p>
                We may update these Terms from time to time. We will notify you by
                email at least 14 days before material changes take effect. Continued
                use of the Service after the effective date constitutes acceptance of
                the revised Terms.
              </p>
            </Subsection>
          </Section>

          <Section id="s11" title="11. Termination">
            <Subsection title="11.1 By you">
              <p>
                You may terminate your account at any time by deleting your account
                from the settings page or by emailing{" "}
                <a href="mailto:hello@pledgeoff.com">hello@pledgeoff.com</a>. Upon
                termination, your access to the Service will cease and your data will
                be deleted in accordance with our{" "}
                <Link href="/privacy">Privacy Policy</Link>.
              </p>
            </Subsection>

            <Subsection title="11.2 By us">
              <p>
                We reserve the right to suspend or terminate your account immediately
                and without notice if you:
              </p>
              <ul>
                <li>Breach these Terms.</li>
                <li>Engage in fraudulent or illegal activity.</li>
                <li>
                  Fail to pay any amounts due and the failure continues for 14 days
                  after notice.
                </li>
              </ul>
              <p>
                For less severe breaches, we will attempt to provide notice and a
                reasonable opportunity to remedy the breach before termination.
              </p>
            </Subsection>

            <Subsection title="11.3 Effect of termination">
              <p>
                Sections 6, 7, 8, 9, 12, and 13 survive termination of these Terms.
              </p>
            </Subsection>
          </Section>

          <Section id="s12" title="12. Governing law and disputes">
            <p>
              These Terms are governed by and construed in accordance with the laws of
              the European Union, supplemented by the national laws of the jurisdiction
              in which PledgeOFF is established, without regard to its conflict of law
              principles.
            </p>
            <p>
              Any dispute arising out of or in connection with these Terms that cannot
              be resolved amicably shall be submitted to the exclusive jurisdiction of
              the competent courts in the place of PledgeOFF&apos;s establishment.
            </p>
            <p>
              If you are a consumer in the EU, you may also use the European
              Commission&apos;s{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
              >
                Online Dispute Resolution (ODR) platform
              </a>
              .
            </p>
          </Section>

          <Section id="s13" title="13. General provisions">
            <Subsection title="13.1 Entire agreement">
              <p>
                These Terms, together with the{" "}
                <Link href="/privacy">Privacy Policy</Link>, constitute the entire
                agreement between you and PledgeOFF regarding the Service and supersede
                all prior agreements, understandings, or representations.
              </p>
            </Subsection>

            <Subsection title="13.2 Severability">
              <p>
                If any provision of these Terms is found to be invalid, illegal, or
                unenforceable, that provision shall be modified to the minimum extent
                necessary to make it enforceable. If modification is not possible, the
                provision shall be severed; the remaining provisions shall continue in
                full force and effect.
              </p>
            </Subsection>

            <Subsection title="13.3 No waiver">
              <p>
                Failure by PledgeOFF to enforce any right or provision of these Terms
                shall not constitute a waiver of that right or provision.
              </p>
            </Subsection>

            <Subsection title="13.4 Assignment">
              <p>
                You may not assign or transfer these Terms or any rights hereunder
                without our prior written consent. PledgeOFF may assign these Terms
                (including in connection with a merger, acquisition, or sale of
                assets) without restriction.
              </p>
            </Subsection>

            <Subsection title="13.5 Contact">
              <p>
                For any questions about these Terms, contact us at{" "}
                <a href="mailto:hello@pledgeoff.com">hello@pledgeoff.com</a>.
              </p>
            </Subsection>
          </Section>

          <div className="mt-12 pt-8 border-t border-[var(--border)]">
            <p className="text-[13px] text-[var(--t3)]">
              See also:{" "}
              <Link href="/privacy" className="text-[var(--accent)] hover:opacity-80">
                Privacy Policy
              </Link>
            </p>
          </div>
          </div>{/* end prose-legal */}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1100px] mx-auto px-8 py-8 flex items-center justify-between">
          <span className="display text-[12px] font-semibold">
            Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
          </span>
          <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>© 2026 · all rights reserved</span>
        </div>
      </footer>
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
    <section id={id} className="mb-10" style={{ scrollMarginTop: "80px" }}>
      <h2 className="text-[18px] font-bold text-[var(--t1)] mb-4 mt-8">{title}</h2>
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
      <h3 className="text-[14px] font-semibold text-[var(--t1)] mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
