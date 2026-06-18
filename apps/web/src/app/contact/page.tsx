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
      <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <PublicNav />
        <div className="w-page-xs" style={{ paddingTop: "52px", paddingBottom: "60px" }}>
          <span className="eye">Contact</span>
          <h1 className="mkt-h2" style={{ marginBottom: "10px" }}>Get in touch.</h1>
          <p className="mkt-lead" style={{ marginBottom: "32px" }}>
            We read everything. We respond to most things. Enterprise inquiries go{" "}
            <Link href="/enterprise" style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              here
            </Link>
            .
          </p>

          <div className="sec">
            <div className="sec-hd">Send a message</div>
            <div className="sec-bd">
              <ContactClient />
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {[
              { label: "Email",         text: "hello@pledgeoff.com" },
              { label: "Response time", text: "1–2 business days" },
            ].map(({ label, text }) => (
              <div key={label}>
                <div className="mono" style={{ fontSize: "8px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--faint)", marginBottom: "4px" }}>
                  {label}
                </div>
                <div className="mono" style={{ fontSize: "12px", color: "var(--dim)" }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
