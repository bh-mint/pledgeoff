import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ContactClient } from "./ContactClient";

export const metadata: Metadata = {
  title: { absolute: "Contact — PledgeOFF" },
  description:
    "Get in touch with the PledgeOFF team. Questions about billing, partnerships, press, or technical issues — we reply within 24 hours on weekdays.",
  alternates: { canonical: "https://pledgeoff.com/contact" },
  openGraph: {
    title: "Contact — PledgeOFF",
    description:
      "Get in touch with the PledgeOFF team. We reply within 24 hours on weekdays.",
    url: "https://pledgeoff.com/contact",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <>
      <PublicNav />
      <main className="max-w-360 mx-auto px-4 sm:px-10 py-16 sm:py-24">
        <div className="max-w-xl">
          <div
            className="mono text-[10px] uppercase tracking-[0.12em] mb-3"
            style={{ color: "var(--t3)" }}
          >
            Contact
          </div>
          <h1
            className="display text-[36px] sm:text-[48px] font-semibold tracking-tight mb-4"
            style={{ color: "var(--t1)", lineHeight: 1.1 }}
          >
            Get in touch.
          </h1>
          <p className="text-[15px] mb-10" style={{ color: "var(--t2)", lineHeight: 1.6 }}>
            We reply within 24 hours on weekdays. For enterprise enquiries,{" "}
            <Link
              href="/enterprise#contact"
              className="underline underline-offset-2 hover:opacity-70 transition-opacity"
              style={{ color: "var(--t1)" }}
            >
              use the enterprise form
            </Link>
            .
          </p>

          <ContactClient />

          <div
            className="mt-10 pt-8 border-t flex flex-col sm:flex-row gap-6"
            style={{ borderColor: "var(--border)" }}
          >
            {[
              { label: "Support", href: "mailto:contact@pledgeoff.com", text: "contact@pledgeoff.com" },
              { label: "Billing", href: "mailto:billing@pledgeoff.com", text: "billing@pledgeoff.com" },
              { label: "Press", href: "mailto:contact@pledgeoff.com", text: "contact@pledgeoff.com" },
            ].map(({ label, href, text }) => (
              <div key={label}>
                <div
                  className="mono text-[10px] uppercase tracking-[0.12em] mb-1"
                  style={{ color: "var(--t3)" }}
                >
                  {label}
                </div>
                <a
                  href={href}
                  className="mono text-[12px] underline underline-offset-2 hover:opacity-70 transition-opacity"
                  style={{ color: "var(--t2)" }}
                >
                  {text}
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
