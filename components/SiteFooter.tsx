import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <img src="/brand/lockup.png" alt="IPO Studio" />
          <p>Discover. Track. Share IPOs.</p>
        </div>

        <div className="footer-links">
          <Link href="/apply">How to apply for an IPO (ASBA)</Link>
          <p>GMP is unofficial and not investment advice.</p>
          <p>All cards are generated in your browser — nothing is uploaded.</p>
        </div>

        <p className="footer-credit">
          Built by Deep Parekh
          <br />© 2026 IPO Studio
        </p>
      </div>
    </footer>
  );
}
