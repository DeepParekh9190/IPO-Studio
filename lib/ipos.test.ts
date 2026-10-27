import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, toIpo, type RawIpo } from "./ipos.ts";

const raw: RawIpo = {
  id: 829,
  name: "Paras Healthcare Limited (MAINBOARD)",
  is_new_sme: 0,
  lot_size: 21,
  min_price: 660,
  max_price: 693,
  open: "2026-10-21",
  close: "2026-10-23",
  allotment_date: "2026-10-26",
  listing_date: "2026-10-28",
  icon_url: "https://assets.ipopremium.in/images/ipo/829.png",
  premium: 50,
  issue_size: "1450.00",
  current_status: "upcoming",
  slug: "paras-healthcare-limited",
};

test("normalizes a real row", () => {
  const ipo = normalize(raw);
  assert.equal(ipo.name, "Paras Healthcare Limited");
  assert.equal(ipo.board, "MAINBOARD");
  assert.equal(ipo.priceBand, "₹660 – ₹693");
  assert.equal(ipo.minInvestment, "₹14,553");
  assert.equal(ipo.gmpPercent, "7.2%");
  assert.equal(ipo.issueSize, "₹1,450 Cr");
  assert.equal(ipo.open, "21 Oct 2026");
  assert.equal(ipo.logo, "/api/logo/829");
});

test("missing numbers never become NaN", () => {
  const ipo = normalize({ ...raw, premium: null, lot_size: null, max_price: null, min_price: null, issue_size: null });
  assert.equal(ipo.gmp, null);
  assert.equal(ipo.gmpPercent, null);
  assert.equal(ipo.minInvestment, "-");
  assert.equal(ipo.priceBand, "TBA");
  assert.equal(ipo.issueSize, "-");
});

test("zero prices are treated as not announced", () => {
  const ipo = normalize({ ...raw, min_price: 0, max_price: 0, lot_size: 0, premium: 0 });
  assert.equal(ipo.priceBand, "TBA");
  assert.equal(ipo.minInvestment, "-");
  assert.equal(ipo.lot, null);
  assert.equal(ipo.gmpPercent, null);
});

test("upstream 'open' maps to live", () => {
  assert.equal(normalize({ ...raw, current_status: "open" }).status, "live");
});

test("sme flag and blank dates", () => {
  const ipo = normalize({ ...raw, name: "Tiny Ltd (SME)", is_new_sme: 1, open: null });
  assert.equal(ipo.board, "SME");
  assert.equal(ipo.name, "Tiny Ltd");
  assert.equal(ipo.open, "-");
});

test("exchange-tagged SME suffix is stripped", () => {
  const ipo = normalize({ ...raw, name: "Core4 Engineers Ltd (BSE SME)", is_new_sme: 0 });
  assert.equal(ipo.name, "Core4 Engineers Ltd");
  assert.equal(ipo.board, "SME");
});

test("converts a stored row and versions the logo", () => {
  const updatedAt = new Date("2026-01-02T03:04:05.000Z");
  const ipo = toIpo({
    id: 42,
    name: "Stored Ltd",
    slug: "stored-ltd",
    board: "SME",
    status: "live",
    minPrice: 100,
    maxPrice: 120,
    lotSize: 10,
    gmp: 12,
    issueSizeCr: "45.50",
    openDate: "2026-01-05",
    closeDate: "2026-01-07",
    allotmentDate: null,
    listingDate: null,
    logoUrl: "https://example.com/logo.png",
    sourceUrl: null,
    updatedAt,
  });
  assert.equal(ipo.board, "SME");
  assert.equal(ipo.priceBand, "₹100 – ₹120");
  assert.equal(ipo.minInvestment, "₹1,200");
  assert.equal(ipo.issueSize, "₹46 Cr");
  assert.equal(ipo.logo, `/api/logo/42?v=${updatedAt.getTime()}`);
  assert.equal(ipo.sourceUrl, "https://www.ipopremium.in");
});
