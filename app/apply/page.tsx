import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "How to apply for an IPO (ASBA) — IPO Studio",
  description:
    "Apply for an IPO online with UPI ASBA through your broker or bank, or offline at a bank branch. Steps, cut-off times and safety checks.",
};

const METHODS = [
  {
    tag: "Easiest",
    title: "Broker app (UPI ASBA)",
    body: "Pick the IPO in your broker's app, enter lots and the cut-off price, then approve the UPI mandate in your UPI app.",
    needs: "Needs: demat + trading account, PAN, UPI",
  },
  {
    tag: "No broker",
    title: "Bank net banking",
    body: "Most banks have an IPO/ASBA section under Investments. Place the bid there and approve the mandate in the same session.",
    needs: "Needs: demat account, net banking, PAN",
  },
  {
    tag: "Rare",
    title: "Bank branch (physical ASBA)",
    body: "Ask for an ASBA form at a Self-Certified Syndicate Bank, fill in your demat and bid details, and submit before the cut-off.",
    needs: "Needs: demat account, PAN, cheque/UPI",
  },
];

const STEPS = [
  "Check the issue dates and price band on the IPO card. Retail bids are capped at ₹2,00,000 per PAN.",
  "Open the IPO in your broker app or bank's IPO section. Choose the retail category.",
  "Bid for at least one lot. Selecting the cut-off price avoids price-band mistakes.",
  "Approve the UPI mandate from your UPI app before 5:00 PM IST on the closing day.",
  "Your money stays blocked in your bank account — it is debited only if you are allotted shares.",
  "Check the allotment date on the card. If nothing is allotted, the block is released automatically.",
];

export default function ApplyPage() {
  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" href="/">
            <img src="/brand/lockup.png" alt="IPO Studio" />
          </Link>
          <Link className="btn ghost header-refresh" href="/">
            Back to IPOs
          </Link>
        </div>
      </header>

      <main className="shell apply">
        <section className="hero">
          <p className="eyebrow">ASBA guide · updated for 2026</p>
          <h1>How to apply for an IPO.</h1>
          <p className="hero-copy">
            Every application in India goes through ASBA (Application Supported by Blocked Amount).
            You never pay the broker upfront — the money is only blocked in your bank account until
            allotment.
          </p>
        </section>

        <section className="apply-grid" aria-label="Ways to apply">
          {METHODS.map((method) => (
            <article className="apply-card" key={method.title}>
              <span className="tag">{method.tag}</span>
              <h2>{method.title}</h2>
              <p>{method.body}</p>
              <p className="apply-needs">{method.needs}</p>
            </article>
          ))}
        </section>

        <section className="apply-steps" aria-label="Step by step">
          <h2>Step by step</h2>
          <ol>
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="apply-rules" aria-label="Timing and rules">
          <h2>Timing and rules</h2>
          <dl>
            <div>
              <dt>Issue hours</dt>
              <dd>10:00 AM – 5:00 PM IST on open days</dd>
            </div>
            <div>
              <dt>UPI mandate</dt>
              <dd>Approve by 5:00 PM on the closing day, or the bid lapses</dd>
            </div>
            <div>
              <dt>Retail limit</dt>
              <dd>Up to ₹2,00,000 per PAN, per issue</dd>
            </div>
            <div>
              <dt>Revisions</dt>
              <dd>You can change or withdraw a bid until the issue closes</dd>
            </div>
            <div>
              <dt>Allotment</dt>
              <dd>Lottery-based when the retail portion is oversubscribed</dd>
            </div>
            <div>
              <dt>Listing</dt>
              <dd>Usually T+3 from the close, per the card&apos;s listing date</dd>
            </div>
          </dl>
        </section>

        <section className="apply-safety" aria-label="Safety">
          <h2>Before you apply</h2>
          <ul>
            <li>Read the RHP on NSE, BSE or SEBI. GMP is grey-market chatter, not a guarantee.</li>
            <li>SME issues are high risk: thin liquidity and wide price swings after listing.</li>
            <li>Apply only through your own broker or bank. No one needs your UPI PIN, OTP or net-banking password.</li>
            <li>ASBA never asks you to transfer money to a person or a random UPI ID.</li>
          </ul>
        </section>

        <section className="apply-cta">
          <p>Ready to check the dates?</p>
          <Link className="btn" href="/">
            See open and upcoming IPOs
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
