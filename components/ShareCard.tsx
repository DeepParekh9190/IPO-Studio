"use client";

import { useEffect, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { initials, type Ipo } from "@/lib/ipos";

type ThemeKey = "mint" | "lavender" | "peach" | "sky" | "rose" | "sand" | "slate" | "lemon";
type Size = "square" | "portrait" | "story" | "wide" | "a4";
type Template = "largeprint" | "dateboard" | "studio" | "spotlight" | "split" | "rail" | "minimal";
type Pattern = "none" | "dots" | "grid" | "stripes" | "cross" | "rings";

type Prefs = {
  template: Template;
  size: Size;
  theme: ThemeKey;
  tinted: boolean;
  accent: string;
  title: string;
  cta: string;
  pattern: Pattern;
  showGmp: boolean;
  showStats: boolean;
  showIssue: boolean;
  showDates: boolean;
  note: string;
  handle: string;
  qr: boolean;
  qrLink: string;
  logoScale: number;
  nameScale: number;
  pillScale: number;
  removeLogoBg: boolean;
  logoBgTol: number;
  removeBrandBg: boolean;
  brandBgTol: number;
  showBrand: boolean;
};

const DEFAULTS: Prefs = {
  template: "largeprint",
  size: "square",
  theme: "mint",
  tinted: true,
  accent: "",
  title: "",
  cta: "",
  pattern: "none",
  showGmp: true,
  showStats: true,
  showIssue: true,
  showDates: true,
  note: "",
  handle: "",
  qr: false,
  qrLink: "",
  logoScale: 100,
  nameScale: 100,
  pillScale: 100,
  removeLogoBg: false,
  logoBgTol: 32,
  removeBrandBg: false,
  brandBgTol: 32,
  showBrand: true,
};

const STORAGE_KEY = "ipo-studio-prefs";
const DEFAULT_BRAND = "/brand/lockup.png";
const SCALE_RANGE = { min: 60, max: 160, step: 10 };
const SLIDER_STEP = 5;
const SCALES: { key: "logoScale" | "nameScale"; label: string }[] = [
  { key: "logoScale", label: "IPO logo" },
  { key: "nameScale", label: "IPO name" },
];

function clampScale(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 100;
  return Math.min(SCALE_RANGE.max, Math.max(SCALE_RANGE.min, Math.round(n)));
}

function clampTolerance(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 32;
  return Math.min(80, Math.max(0, Math.round(n)));
}

const THEMES: Record<ThemeKey, { label: string; bg: string; accent: string; ink: string; muted: string }> = {
  mint: { label: "Mint", bg: "#e9f7f0", accent: "#2f9e75", ink: "#22312b", muted: "#6b7f76" },
  lavender: { label: "Lavender", bg: "#f1ecfb", accent: "#7c63c8", ink: "#2b2540", muted: "#756d8a" },
  peach: { label: "Peach", bg: "#fff0e6", accent: "#d97745", ink: "#3a2a22", muted: "#8a7264" },
  sky: { label: "Sky", bg: "#e8f3fd", accent: "#3f82c0", ink: "#1f2e3d", muted: "#657b8f" },
  rose: { label: "Rose", bg: "#fdeef3", accent: "#c2456b", ink: "#3a1f2a", muted: "#8a6573" },
  sand: { label: "Sand", bg: "#f8f1e3", accent: "#a3742e", ink: "#332a1e", muted: "#8a7a64" },
  slate: { label: "Slate", bg: "#eef1f6", accent: "#475569", ink: "#1f2937", muted: "#6b7280" },
  lemon: { label: "Lemon", bg: "#fbf7dc", accent: "#9a7b00", ink: "#33300f", muted: "#857f4e" },
};

const TEMPLATES: { key: Template; label: string; hint: string }[] = [
  { key: "largeprint", label: "Large Print", hint: "Bigger text, three key stats" },
  { key: "dateboard", label: "Date Board", hint: "Dates first, easier to scan" },
  { key: "studio", label: "Studio", hint: "Logo top left" },
  { key: "spotlight", label: "Spotlight", hint: "Logo on a top badge" },
  { key: "split", label: "Split", hint: "Logo in the masthead" },
  { key: "rail", label: "Rail", hint: "Logo on a side rail" },
  { key: "minimal", label: "Minimal", hint: "Logo top right + watermark" },
];

const SIZE_SPECS: Record<Size, { label: string; W: number; H: number }> = {
  square: { label: "Square", W: 1080, H: 1080 },
  portrait: { label: "Portrait", W: 1080, H: 1350 },
  story: { label: "Story", W: 1080, H: 1920 },
  wide: { label: "Wide", W: 1200, H: 630 },
  a4: { label: "A4", W: 2480, H: 3508 },
};

const PATTERNS: { key: Pattern; label: string }[] = [
  { key: "none", label: "None" },
  { key: "dots", label: "Dots" },
  { key: "grid", label: "Grid" },
  { key: "stripes", label: "Stripes" },
  { key: "cross", label: "Cross" },
  { key: "rings", label: "Rings" },
];

function parsePrefs(value: unknown): Prefs {
  if (!value || typeof value !== "object") return DEFAULTS;
  const merged = { ...DEFAULTS, ...(value as Partial<Prefs>) };
  if (!TEMPLATES.some((t) => t.key === merged.template)) merged.template = DEFAULTS.template;
  if (!(merged.size in SIZE_SPECS)) merged.size = DEFAULTS.size;
  if (!(merged.theme in THEMES)) merged.theme = DEFAULTS.theme;
  if (!PATTERNS.some((p) => p.key === merged.pattern)) merged.pattern = "none";
  merged.logoScale = clampScale(merged.logoScale);
  merged.nameScale = clampScale(merged.nameScale);
  merged.pillScale = clampScale(merged.pillScale);
  merged.logoBgTol = clampTolerance(merged.logoBgTol);
  merged.brandBgTol = clampTolerance(merged.brandBgTol);
  return merged;
}

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parsePrefs(JSON.parse(raw)) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

type Preset = { id: string; name: string; prefs: Prefs };
const PRESETS_KEY = "ipo-studio-presets";

function loadPresets(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    const saved = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((item): item is Preset => Boolean(item && typeof item.id === "string" && typeof item.name === "string"))
      .map((item) => ({ id: item.id, name: item.name, prefs: parsePrefs(item.prefs) }));
  } catch {
    return [];
  }
}

function persistPresets(presets: Preset[]) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch {
    // private mode / storage full: presets just won't persist
  }
}

type Palette = {
  theme: (typeof THEMES)[ThemeKey];
  accent: string;
  accentInk: string;
  bg: string;
  ink: string;
  muted: string;
  line: string;
  card: string;
  tile: string;
  soft: string;
};

function palette(prefs: Prefs): Palette {
  const theme = THEMES[prefs.theme];
  const accent = prefs.accent || theme.accent;
  return {
    theme,
    accent,
    accentInk: inkOn(accent),
    bg: prefs.tinted ? theme.bg : "#f6f4ef",
    ink: theme.ink,
    muted: theme.muted,
    line: "rgba(15,23,42,0.11)",
    card: prefs.tinted ? "rgba(255,255,255,0.74)" : "#f1eee7",
    tile: "#f6f4ef",
    soft: rgba(accent, 0.08),
  };
}

function statusLabel(ipo: Ipo): string {
  return ipo.status === "live" ? "OPEN" : ipo.status.toUpperCase();
}

function statusTone(label: string): string | null {
  if (label === "CLOSED") return "#64748b";
  if (label === "UPCOMING") return "#7c63c8";
  return null;
}

// a closed issue with zero premium means "no GMP recorded", not a real zero
function gmpValue(ipo: Ipo): number | null {
  return ipo.status === "closed" && ipo.gmp === 0 ? null : ipo.gmp;
}

function gmpLabel(ipo: Ipo): string {
  return ipo.status === "closed" ? "FINAL GMP AT CLOSE" : "GMP (RUMOURED)";
}

function statsItems(ipo: Ipo, prefs: Prefs): [string, string][] {
  const items: [string, string][] = [
    ["PRICE BAND", ipo.priceBand],
    ["LOT SIZE", `${ipo.lot ?? "-"} shares`],
    ["MIN INVESTMENT", ipo.minInvestment],
  ];
  if (prefs.showIssue) items.push(["ISSUE SIZE", ipo.issueSize]);
  return items;
}

const FONT = '"Segoe UI", system-ui, -apple-system, Arial, sans-serif';

function font(ctx: CanvasRenderingContext2D, size: number, weight = 400) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  maxWidth?: number,
  align: CanvasTextAlign = "left",
) {
  font(ctx, size, weight);
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = align;
  let out = value;
  if (maxWidth && ctx.measureText(out).width > maxWidth) {
    while (out.length > 1 && ctx.measureText(out + "…").width > maxWidth) out = out.slice(0, -1);
    out += "…";
  }
  ctx.fillText(out, x, y);
  ctx.textAlign = "left";
}

function wrap(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, size: number) {
  font(ctx, size, 700);
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitName(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, size: number) {
  let s = size;
  let lines = wrap(ctx, value, maxWidth, s);
  while (lines.length > 2 && s > size * 0.6) {
    s -= Math.max(1, Math.round(size * 0.05));
    lines = wrap(ctx, value, maxWidth, s);
  }
  return { size: s, lines: lines.slice(0, 2) };
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, r));
  ctx.fillStyle = fill;
  ctx.fill();
}

function rgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return `rgba(15,23,42,${alpha})`;
  const n = Number.parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function inkOn(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return "#ffffff";
  const n = Number.parseInt(full, 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.58 ? "#17151f" : "#ffffff";
}

function fitSize(ctx: CanvasRenderingContext2D, value: string, size: number, weight: number, maxWidth: number) {
  let s = size;
  font(ctx, s, weight);
  while (s > 10 && ctx.measureText(value).width > maxWidth) {
    s -= 2;
    font(ctx, s, weight);
  }
  return s;
}

function rule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

type Art = HTMLImageElement | HTMLCanvasElement;

// Flood-fills the flat background inward from the image border, so enclosed white details stay.
function cutBackground(img: Art, tolerance: number): Art {
  const side = Math.max(img.width, img.height);
  if (!side) return img;
  const scale = Math.min(1, 900 / side);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return img;
  ctx.drawImage(img, 0, 0, w, h);
  let pixels: ImageData;
  try {
    pixels = ctx.getImageData(0, 0, w, h);
  } catch {
    return img;
  }
  const px = pixels.data;

  // the lightest opaque corner is almost always the background on logo images
  let bg: [number, number, number] | null = null;
  let best = -1;
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
    const i = (y * w + x) * 4;
    if (px[i + 3] < 200) continue;
    const luma = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
    if (luma > best) {
      best = luma;
      bg = [px[i], px[i + 1], px[i + 2]];
    }
  }
  if (!bg) return img;
  const [br, bgc, bb] = bg;

  const limit = tolerance * 2.55;
  const limit2 = limit * limit;
  const feather = limit2 * 0.55;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const visit = (x: number, y: number) => {
    const i = y * w + x;
    if (seen[i]) return;
    seen[i] = 1;
    const p = i * 4;
    if (px[p + 3] === 0) return;
    const dr = px[p] - br;
    const dg = px[p + 1] - bgc;
    const db = px[p + 2] - bb;
    const d = dr * dr + dg * dg + db * db;
    if (d > limit2) return;
    if (limit2 > 0 && d > feather) {
      px[p + 3] = Math.min(px[p + 3], Math.round(255 * ((d - feather) / (limit2 - feather))));
    } else {
      px[p + 3] = 0;
    }
    stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    visit(x, 0);
    visit(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    visit(0, y);
    visit(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) visit(x - 1, y);
    if (x < w - 1) visit(x + 1, y);
    if (y > 0) visit(x, y - 1);
    if (y < h - 1) visit(x, y + 1);
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

function drawPattern(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  pad: number,
  color: string,
  pattern: Pattern,
  s: number,
  alpha = 1,
) {
  if (pattern === "none") return;
  const step = Math.round(58 * s);
  ctx.save();
  if (pattern === "dots") {
    ctx.fillStyle = rgba(color, 0.14 * alpha);
    const r = Math.max(1.5, 2.6 * s);
    for (let y = pad; y < H - pad; y += step) {
      for (let x = pad; x < W - pad; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === "grid") {
    ctx.strokeStyle = rgba(color, 0.09 * alpha);
    ctx.lineWidth = Math.max(1, 1.5 * s);
    for (let x = pad; x <= W - pad; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, H - pad);
      ctx.stroke();
    }
    for (let y = pad; y <= H - pad; y += step) {
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(W - pad, y);
      ctx.stroke();
    }
  } else if (pattern === "stripes" || pattern === "cross") {
    ctx.strokeStyle = rgba(color, 0.09 * alpha);
    ctx.lineWidth = Math.max(1, 2 * s);
    for (let x = -H; x <= W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + H, H);
      ctx.stroke();
      if (pattern === "cross") {
        ctx.beginPath();
        ctx.moveTo(x + H, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
    }
  } else {
    ctx.strokeStyle = rgba(color, 0.08 * alpha);
    ctx.lineWidth = Math.max(1, 2 * s);
    for (let r = step; r < Math.max(W, H); r += step * 1.6) {
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function qrHref(link: string): string {
  const custom = link.trim();
  if (custom) return custom;
  return typeof window === "undefined" ? "" : `${window.location.origin}/apply`;
}

function drawQr(ctx: CanvasRenderingContext2D, link: string, x: number, y: number, size: number, line: string) {
  if (!link) return;
  try {
    const qr = qrcode(0, "M");
    qr.addData(link);
    qr.make();
    const count = qr.getModuleCount();
    const pad = Math.round(size * 0.09);
    const radius = Math.round(size * 0.09);
    box(ctx, x, y, size, size, radius, "#ffffff");
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, radius);
    ctx.stroke();
    const cell = (size - pad * 2) / count;
    ctx.fillStyle = "#14201a";
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(x + pad + c * cell, y + pad + r * cell, Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
  } catch {
    // invalid custom link: leave the space empty rather than crash the card
  }
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  img: Art | null,
  name: string,
  x: number,
  y: number,
  size: number,
  surface: string,
  bare = false,
) {
  const floating = bare && !!img;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.18);
  ctx.clip();
  if (!floating) {
    ctx.fillStyle = surface;
    ctx.fillRect(x, y, size, size);
  }
  if (img) {
    const pad = size * (floating ? 0 : 0.09);
    const scale = Math.min((size - pad * 2) / img.width, (size - pad * 2) / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
  } else {
    font(ctx, size * 0.31, 700);
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(name), x + size / 2, y + size / 2 + 2);
  }
  ctx.restore();
}

function brandSize(img: Art, maxW: number, maxH: number) {
  const k = Math.min(maxW / img.width, maxH / img.height);
  return { w: img.width * k, h: img.height * k };
}

function drawBrandAt(
  ctx: CanvasRenderingContext2D,
  img: Art,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  align: "left" | "center" | "right" = "left",
  alpha = 1,
) {
  const { w, h } = brandSize(img, maxW, maxH);
  const bx = align === "center" ? x + (maxW - w) / 2 : align === "right" ? x + maxW - w : x;
  const by = y + (maxH - h) / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, bx, by, w, h);
  ctx.restore();
  return { x: bx, y: by, w, h };
}

function drawBrandRaw(
  ctx: CanvasRenderingContext2D,
  img: Art,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
  angle = 0,
  alpha = 1,
) {
  const { w, h } = brandSize(img, maxW, maxH);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  return { w, h };
}

function drawPills(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  x: number,
  y: number,
  size: number,
  p: Palette,
  align: "left" | "center",
  width: number,
  dark = false,
): number {
  const status = statusLabel(ipo);
  font(ctx, size, 700);
  const gap = size * 0.42;
  const boardW = Math.min(ctx.measureText(ipo.board).width + size * 2, width * 0.52);
  const statusW = ctx.measureText(status).width + size * 2.4;
  const total = boardW + gap + statusW;
  const start = align === "center" ? x + (width - total) / 2 : x;
  const h = Math.round(size * 2.1);
  const boardBg = dark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.06)";
  const boardInk = dark ? "#ffffff" : p.ink;
  box(ctx, start, y, boardW, h, h / 2, boardBg);
  text(ctx, ipo.board, start + size, y + h * 0.68, size, 700, boardInk, boardW - size * 2);
  const tone = statusTone(status);
  box(ctx, start + boardW + gap, y, statusW, h, h / 2, tone ?? p.accent);
  text(
    ctx,
    status,
    start + boardW + gap + size * 1.2,
    y + h * 0.68,
    size,
    700,
    tone ? "#ffffff" : p.accentInk,
  );
  return h;
}

type CompanyOpts = {
  tile: number;
  name: number;
  line: number;
  pill: number;
  align: "left" | "center";
  card?: string;
  bare?: boolean;
  ink?: string;
  dark?: boolean;
  showPills?: boolean;
};

function drawCompany(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  logo: Art | null,
  x: number,
  y: number,
  w: number,
  p: Palette,
  o: CompanyOpts,
): number {
  const nameColor = o.ink ?? p.ink;
  const pillH = Math.round(o.pill * 2.1);
  if (o.align === "center") {
    drawLogo(ctx, logo, ipo.name, x + (w - o.tile) / 2, y, o.tile, o.card ?? p.tile, o.bare);
    let by = y + o.tile + Math.round(o.tile * 0.14);
    const fit = fitName(ctx, ipo.name, w, o.name);
    fit.lines.forEach((ln, i) =>
      text(ctx, ln, x + w / 2, by + fit.size + i * o.line, fit.size, 700, nameColor, w, "center"),
    );
    by += fit.size + (fit.lines.length - 1) * o.line + Math.round(o.tile * 0.1);
    if (o.showPills !== false) {
      drawPills(ctx, ipo, x, by, o.pill, p, "center", w, o.dark);
      by += pillH;
    }
    return by - y;
  }

  drawLogo(ctx, logo, ipo.name, x, y, o.tile, o.card ?? p.tile, o.bare);
  const gap = Math.round(o.tile * 0.16);
  const nx = x + o.tile + gap;
  const nw = w - o.tile - gap;
  const fit = fitName(ctx, ipo.name, nw, o.name);
  fit.lines.forEach((ln, i) =>
    text(ctx, ln, nx, y + fit.size + i * o.line, fit.size, 700, nameColor, nw),
  );
  const nameBottom = y + fit.size + (fit.lines.length - 1) * o.line;
  if (o.showPills === false) return Math.max(o.tile, nameBottom - y);
  const pillY = nameBottom + Math.round(o.tile * 0.09);
  drawPills(ctx, ipo, nx, pillY, o.pill, p, "left", nw, o.dark);
  return Math.max(o.tile, pillY + pillH - y);
}

function drawGmpBlock(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  p: Palette,
  x: number,
  y: number,
  w: number,
  o: { size: number; label: number; gap: number; align: "left" | "center"; labelColor?: string; dark?: boolean },
): number {
  const gmp = gmpValue(ipo);
  const color =
    gmp == null
      ? p.muted
      : gmp < 0
        ? o.dark
          ? "#ffb4a8"
          : "#b4544b"
        : o.dark
          ? "#ffffff"
          : p.accent;
  const labelColor = o.labelColor ?? (o.dark ? "rgba(255,255,255,0.62)" : p.muted);
  const align = o.align;
  const tx = align === "center" ? x + w / 2 : x;
  text(ctx, gmpLabel(ipo), tx, y + o.label, o.label, 700, labelColor, w, align);
  const value =
    gmp == null ? "—" : `${gmp > 0 ? "+" : gmp < 0 ? "−" : ""}₹${Math.abs(gmp).toLocaleString("en-IN")}`;
  const baseline = y + o.label + o.gap + o.size;
  if (align === "center") {
    text(ctx, value, tx, baseline, o.size, 700, color, w, "center");
    let h = o.label + o.gap + o.size;
    if (gmp != null && ipo.gmpPercent) {
      text(ctx, ipo.gmpPercent, tx, baseline + o.size * 0.4, o.size * 0.34, 600, color, w, "center");
      h += o.size * 0.4;
    }
    return h;
  }
  const pct = gmp != null ? ipo.gmpPercent : null;
  const vsize = fitSize(ctx, value, o.size, 700, pct ? w * 0.66 : w);
  text(ctx, value, x, baseline, vsize, 700, color, w);
  if (pct) {
    font(ctx, vsize, 700);
    const vw = ctx.measureText(value).width;
    text(ctx, pct, x + vw + o.size * 0.2, baseline - o.size * 0.08, o.size * 0.32, 600, color, w - vw - o.size * 0.2);
  }
  return o.label + o.gap + o.size;
}

function drawStats(
  ctx: CanvasRenderingContext2D,
  items: [string, string][],
  p: Palette,
  x: number,
  y: number,
  w: number,
  o: {
    cols: number;
    h: number;
    gap: number;
    label: number;
    value: number;
    align: "left" | "center";
    card: boolean;
    fill?: string;
    stroke?: string;
    dark?: boolean;
  },
): number {
  if (!items.length) return 0;
  const cols = Math.max(1, Math.min(o.cols, items.length));
  const rows = Math.ceil(items.length / cols);
  const bw = (w - o.gap * (cols - 1)) / cols;
  items.forEach(([label, value], i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const lastOdd = items.length % cols === 1 && i === items.length - 1 && cols > 1;
    const cw = lastOdd ? w - col * (bw + o.gap) : bw;
    const bx = x + col * (bw + o.gap);
    const by = y + row * (o.h + o.gap);
    if (o.card) {
      box(ctx, bx, by, cw, o.h, o.h * 0.18, o.fill ?? p.card);
      ctx.strokeStyle = o.stroke ?? p.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, cw, o.h, o.h * 0.18);
      ctx.stroke();
    } else {
      rule(ctx, bx, by, cw, o.stroke ?? p.line, 1);
    }
    const inset = o.card ? Math.min(18, cw * 0.07) : 0;
    const tx = o.align === "center" ? bx + cw / 2 : bx + inset;
    const ly = o.card ? by + o.h * 0.34 : by + o.label + 4;
    text(
      ctx,
      label,
      tx,
      ly,
      o.label,
      700,
      o.dark ? "rgba(255,255,255,0.6)" : p.muted,
      cw - inset * 2,
      o.align,
    );
    const vy = o.card ? by + o.h * 0.74 : ly + 7 + o.value;
    const vs = fitSize(ctx, value, o.value, 700, cw - inset * 2);
    text(ctx, value, tx, vy, vs, 700, o.dark ? "#ffffff" : p.ink, cw - inset * 2, o.align);
  });
  return rows * o.h + (rows - 1) * o.gap;
}

function dateItems(ipo: Ipo): [string, string][] {
  return ipo.status === "closed"
    ? [
        ["CLOSED ON", ipo.close],
        ["ALLOTMENT", ipo.allotment],
        ["LISTING", ipo.listing],
      ]
    : [
        ["OPENS", ipo.open],
        ["CLOSES", ipo.close],
        ["ALLOTMENT", ipo.allotment],
        ["LISTING", ipo.listing],
      ];
}

function drawDates(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  p: Palette,
  x: number,
  y: number,
  w: number,
  o: { label: number; value: number; gap: number; cols: number; align: "left" | "center"; line?: boolean; dark?: boolean },
): number {
  const items = dateItems(ipo);
  const cols = Math.max(1, Math.min(o.cols, items.length));
  const rows = Math.ceil(items.length / cols);
  const colW = (w - o.gap * (cols - 1)) / cols;
  const rowH = o.label + 5 + o.value;
  const rowGap = Math.round(o.value * 0.9);
  items.forEach(([label, value], i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const bx = x + col * (colW + o.gap);
    const by = y + row * (rowH + rowGap);
    if (o.line) rule(ctx, bx, by, colW, o.dark ? "rgba(255,255,255,0.22)" : p.line, 1);
    const tx = o.align === "center" ? bx + colW / 2 : bx;
    text(
      ctx,
      label,
      tx,
      by + o.label,
      o.label,
      700,
      o.dark ? "rgba(255,255,255,0.6)" : p.muted,
      colW,
      o.align,
    );
    text(
      ctx,
      value,
      tx,
      by + o.label + 5 + o.value,
      o.value,
      600,
      o.dark ? "#ffffff" : p.ink,
      colW,
      o.align,
    );
  });
  return rows * rowH + (rows - 1) * rowGap;
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  prefs: Prefs,
  p: Palette,
  x: number,
  y: number,
  w: number,
  o: { size: number; qr?: number; align?: "left" | "center"; dark?: boolean; color?: string; small?: number },
): number {
  const qr = prefs.qr ? (o.qr ?? 0) : 0;
  const footH = qr || Math.round(o.size * 3.4);
  const textW = qr ? w - qr - o.size * 1.2 : w;
  const align = o.align ?? "left";
  const tx = align === "center" ? x + textW / 2 : x;
  const handle = [prefs.handle, prefs.cta].filter(Boolean).join(" · ") || "Discover. Track. Share IPOs.";
  const handleColor = o.color ?? (o.dark ? "#ffffff" : p.accent);
  text(ctx, handle, tx, y + (qr ? qr * 0.36 : o.size * 1.4), o.size, 700, handleColor, textW, align);
  text(
    ctx,
    "GMP is unofficial · Not investment advice",
    tx,
    y + footH - 2,
    o.small ?? Math.max(9, Math.round(o.size * 0.62)),
    500,
    o.dark ? "rgba(255,255,255,0.55)" : p.muted,
    textW,
    align,
  );
  if (qr) drawQr(ctx, qrHref(prefs.qrLink), x + w - qr, y, qr, p.line);
  return footH;
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  note: string,
  x: number,
  y: number,
  w: number,
  p: Palette,
  align: "left" | "center",
  size: number,
) {
  text(ctx, note, align === "center" ? x + w / 2 : x, y + size, size, 600, p.accent, w, align);
  return Math.round(size * 1.6);
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  p: Palette,
  pattern: Pattern,
  s: number,
  dark = false,
) {
  ctx.fillStyle = dark ? "#14111c" : p.bg;
  ctx.fillRect(0, 0, W, H);
  drawPattern(ctx, W, H, Math.round(40 * s), dark ? "#ffffff" : p.accent, pattern, s, dark ? 0.8 : 1);
}

// Large Print and Date Board share one accessible layout; only order and date emphasis change.
function drawEasy(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  logo: Art | null,
  brand: Art | null,
  prefs: Prefs,
  p: Palette,
  W: number,
  H: number,
  s: number,
  datesFirst: boolean,
) {
  ctx.fillStyle = prefs.tinted ? p.bg : "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = p.accent;
  ctx.fillRect(0, 0, W, 6 * s);

  const ink = "#111827";
  const muted = "#374151";
  const line = "rgba(17,24,39,0.24)";
  const card = "#f1efe8";
  const ep: Palette = {
    ...p,
    ink,
    muted,
    line,
    card,
    tile: card,
    soft: card,
    accent: ink,
    accentInk: "#ffffff",
  };

  const pad = Math.round(40 * s);
  const cw = W - pad * 2;
  let yy = pad;
  const brandH = Math.round(50 * s);
  if (prefs.showBrand && brand) {
    drawBrandAt(ctx, brand, pad, yy, Math.min(cw, 420 * s), brandH, "left");
    yy += brandH + Math.round(12 * s);
    rule(ctx, pad, yy, cw, line, Math.max(2, 2.5 * s));
    yy += Math.round(20 * s);
  } else {
    yy += Math.round(6 * s);
  }
  if (prefs.title) {
    text(ctx, prefs.title.toUpperCase(), pad, yy + 20 * s, 22 * s, 800, ink, cw);
    yy += Math.round(30 * s);
  }

  const items = statsItems(ipo, { ...prefs, showIssue: false });
  // shortcut: accessible layouts cap these controls at 120% so the fixed grid cannot run into the footer; add reflow if users need bigger.
  const capped = (value: number) => Math.min(value, 120) / 100;
  const tile = Math.round((datesFirst ? 92 : 104) * s * capped(prefs.logoScale));
  const nameSize = Math.round((datesFirst ? 46 : 52) * s * capped(prefs.nameScale));
  const nameLine = Math.round(nameSize * 1.16);
  const pillSize = Math.round(18 * s * capped(prefs.pillScale));
  const pillH = Math.round(pillSize * 2.1);
  const fit = fitName(ctx, ipo.name, cw - tile - Math.round(tile * 0.16), nameSize);
  const nameBlock = fit.size + (fit.lines.length - 1) * nameLine;
  const companyH = Math.max(tile, nameBlock + Math.round(tile * 0.09) + pillH);

  const gmpSize = Math.round((datesFirst ? 60 : 92) * s);
  const gmpLabelSize = Math.round((datesFirst ? 17 : 20) * s);
  const gmpGap = Math.round((datesFirst ? 2 : 6) * s);
  const gmpH = gmpLabelSize + gmpGap + gmpSize;

  const statsH = Math.round(104 * s);
  const dates = dateItems(ipo);
  const dateRows = Math.ceil(dates.length / 2);
  const dateH = Math.round((datesFirst ? 124 : 98) * s);
  const datesH = dateRows * dateH + (dateRows - 1) * Math.round(14 * s);
  const noteH = prefs.note ? Math.round(32 * s) : 0;
  const sections =
    (prefs.showGmp ? 1 : 0) + (prefs.showStats ? 1 : 0) + (prefs.showDates ? 1 : 0) + (prefs.note ? 1 : 0);
  const gapBase = Math.round(16 * s);
  let qr = prefs.qr ? Math.round(196 * s) : 0;
  let footerH = qr || Math.round(60 * s);
  let footerTop = H - pad - footerH;
  const bodyTop = yy + companyH;
  let avail = footerTop - bodyTop - Math.round(20 * s);
  const bodyH =
    (prefs.showGmp ? gmpH : 0) +
    (prefs.showStats ? statsH : 0) +
    (prefs.showDates ? datesH : 0) +
    noteH +
    gapBase * sections;
  // A smaller QR keeps the footer clear when a long name uses the spare height.
  if (prefs.qr && bodyH > avail) {
    qr = Math.round(150 * s);
    footerH = qr;
    footerTop = H - pad - footerH;
    avail = footerTop - bodyTop - Math.round(20 * s);
  }
  const spare = Math.max(0, avail - bodyH);
  const extra = Math.max(0, Math.min(24 * s, spare / Math.max(1, sections)));
  const gap = gapBase + extra;
  const topShift = Math.max(0, Math.min(20 * s, (spare - extra * sections) * 0.5));

  const companyY = yy + topShift;
  drawCompany(ctx, ipo, logo, pad, companyY, cw, ep, {
    tile,
    name: nameSize,
    line: nameLine,
    pill: pillSize,
    align: "left",
    card,
    bare: prefs.removeLogoBg,
    ink,
  });

  const drawBody = (x: number, w: number, y0: number) => {
    let y = y0;
    const drawGmp = () => {
      if (!prefs.showGmp) return;
      y += gap;
      y += drawGmpBlock(ctx, ipo, ep, x, y, w, {
        size: gmpSize,
        label: gmpLabelSize,
        gap: gmpGap,
        align: "left",
      });
    };
    const drawStatsBlock = () => {
      if (!prefs.showStats) return;
      y += gap;
      y += drawStats(ctx, items, ep, x, y, w, {
        cols: 3,
        h: statsH,
        gap: Math.round(14 * s),
        label: 19 * s,
        value: 30 * s,
        align: "left",
        card: true,
        fill: card,
        stroke: card,
      });
    };
    const drawDatesBlock = () => {
      if (!prefs.showDates) return;
      y += gap;
      if (datesFirst) {
        ctx.fillStyle = p.accent;
        ctx.fillRect(x, y - Math.round(8 * s), w, Math.max(3, 4 * s));
      }
      y += drawStats(ctx, dates, ep, x, y, w, {
        cols: 2,
        h: dateH,
        gap: Math.round(14 * s),
        label: (datesFirst ? 20 : 18) * s,
        value: (datesFirst ? 38 : 32) * s,
        align: "left",
        card: true,
        fill: card,
        stroke: card,
      });
    };

    if (datesFirst) {
      drawDatesBlock();
      drawStatsBlock();
      drawGmp();
    } else {
      drawGmp();
      drawStatsBlock();
      drawDatesBlock();
    }
    if (prefs.note) {
      y += gap;
      drawNote(ctx, prefs.note, x, y, w, ep, "left", 20 * s);
    }
  };

  const bodyTopActual = companyY + companyH;
  // Last-resort shrink for an unusually tall company block, so nothing covers the footer.
  const bodyFit = Math.min(1, avail / Math.max(1, bodyH));
  if (bodyFit < 1) {
    ctx.save();
    ctx.translate(pad + (cw - cw * bodyFit) / 2, bodyTopActual);
    ctx.scale(bodyFit, bodyFit);
    drawBody(0, cw, 0);
    ctx.restore();
  } else {
    drawBody(pad, cw, bodyTopActual);
  }

  rule(ctx, pad, footerTop - Math.round(12 * s), cw, line, Math.max(2, 2 * s));
  drawFooter(ctx, ipo, prefs, ep, pad, footerTop, cw, {
    size: 20 * s,
    small: 16 * s,
    qr,
    align: "left",
  });
}

function drawEasyWide(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  logo: Art | null,
  brand: Art | null,
  prefs: Prefs,
  p: Palette,
  W: number,
  H: number,
  datesFirst: boolean,
) {
  const s = H / 630;
  const ink = "#111827";
  const muted = "#374151";
  const line = "rgba(17,24,39,0.24)";
  const card = "#f1efe8";
  const ep: Palette = { ...p, ink, muted, line, card, tile: card, soft: card, accent: ink, accentInk: "#ffffff" };
  ctx.fillStyle = prefs.tinted ? p.bg : "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = p.accent;
  ctx.fillRect(0, 0, W, 5 * s);

  const pad = Math.round(28 * s);
  const leftW = Math.round(280 * s);
  const leftw = leftW - pad * 2;
  let ly = pad;
  if (prefs.showBrand && brand) {
    drawBrandAt(ctx, brand, pad, ly, leftw, 42 * s, "left");
    ly += Math.round(54 * s);
  }
  if (prefs.title) {
    text(ctx, prefs.title.toUpperCase(), pad, ly + 16 * s, 16 * s, 800, ink, leftw);
    ly += Math.round(24 * s);
  }
  if (prefs.note) {
    text(ctx, prefs.note, pad, ly + 18 * s, 16 * s, 700, ink, leftw);
  }
  const handle = [prefs.handle, prefs.cta].filter(Boolean).join(" · ") || "Discover. Track. Share IPOs.";

  const capped = (value: number) => Math.min(value, 120) / 100;
  const x = leftW + pad;
  const w = W - x - pad;
  const nameSize = Math.round(30 * s * capped(prefs.nameScale));
  let y = pad;
  y += drawCompany(ctx, ipo, logo, x, y, w, ep, {
    tile: Math.round(72 * s * capped(prefs.logoScale)),
    name: nameSize,
    line: Math.round(nameSize * 1.16),
    pill: Math.round(13 * s * capped(prefs.pillScale)),
    align: "left",
    card,
    bare: prefs.removeLogoBg,
    ink,
  });

  const drawGmp = () => {
    if (!prefs.showGmp) return;
    y += Math.round(10 * s);
    y += drawGmpBlock(ctx, ipo, ep, x, y, w, {
      size: 48 * s,
      label: 14 * s,
      gap: 2 * s,
      align: "left",
    });
  };
  const drawStatsBlock = () => {
    if (!prefs.showStats) return;
    y += Math.round(10 * s);
    y += drawStats(ctx, statsItems(ipo, { ...prefs, showIssue: false }), ep, x, y, w, {
      cols: 3,
      h: 80 * s,
      gap: 10 * s,
      label: 14 * s,
      value: 24 * s,
      align: "left",
      card: true,
      fill: card,
      stroke: card,
    });
  };
  const drawDatesBlock = () => {
    if (!prefs.showDates) return;
    y += Math.round(10 * s);
    if (datesFirst) {
      ctx.fillStyle = p.accent;
      ctx.fillRect(x, y - Math.round(7 * s), w, Math.max(3, 4 * s));
    }
    y += drawStats(ctx, dateItems(ipo), ep, x, y, w, {
      cols: 2,
      h: (datesFirst ? 82 : 74) * s,
      gap: 10 * s,
      label: 14 * s,
      value: 24 * s,
      align: "left",
      card: true,
      fill: card,
      stroke: card,
    });
  };

  if (datesFirst) {
    drawDatesBlock();
    drawStatsBlock();
    drawGmp();
  } else {
    drawGmp();
    drawStatsBlock();
    drawDatesBlock();
  }

  const qr = prefs.qr ? Math.round(140 * s) : 0;
  if (qr) drawQr(ctx, qrHref(prefs.qrLink), x + w - qr, H - pad - qr, qr, line);
  const footW = W - pad * 2 - (qr ? qr + Math.round(20 * s) : 0);
  text(ctx, handle, pad, H - pad - 24 * s, 15 * s, 700, ink, footW);
  text(ctx, "GMP is unofficial · Not investment advice", pad, H - pad - 6 * s, 12 * s, 500, muted, footW);
}

function drawStudio(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  logo: Art | null,
  brand: Art | null,
  prefs: Prefs,
  p: Palette,
  W: number,
  H: number,
  s: number,
) {
  drawBackdrop(ctx, W, H, p, prefs.pattern, s);
  const m = Math.round(34 * s);
  const x = m;
  const y = m;
  const w = W - m * 2;
  const h = H - m * 2;
  const rad = 28 * s;
  ctx.save();
  ctx.shadowColor = "rgba(30,22,50,0.10)";
  ctx.shadowBlur = 40 * s;
  ctx.shadowOffsetY = 14 * s;
  box(ctx, x, y, w, h, rad, "#fffdfb");
  ctx.restore();
  ctx.strokeStyle = "rgba(30,22,50,0.06)";
  ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rad);
  ctx.stroke();

  const ip = Math.round(36 * s);
  const cx = x + ip;
  const cw = w - ip * 2;
  let yy = y + ip;
  const brandH = Math.round(46 * s);
  if (prefs.showBrand && brand) {
    drawBrandAt(ctx, brand, cx, yy, cw * 0.55, brandH, "left");
    const ry = yy + brandH + 14 * s;
    rule(ctx, cx, ry, cw, p.line, Math.max(1, 1.2 * s));
    yy = ry + 22 * s;
  } else {
    yy += 6 * s;
  }

  const items = prefs.showStats ? statsItems(ipo, prefs) : [];
  const tile = Math.round(116 * s * (prefs.logoScale / 100));
  const nameSize = Math.round(40 * s * (prefs.nameScale / 100));
  const nameLine = Math.round(nameSize * 1.16);
  const pillSize = Math.round(15 * s * (prefs.pillScale / 100));
  const pillH = Math.round(pillSize * 2.1);
  const fit = fitName(ctx, ipo.name, cw - tile - Math.round(tile * 0.16), nameSize);
  const nameBlock = fit.size + (fit.lines.length - 1) * nameLine;
  const companyH = Math.max(tile, nameBlock + Math.round(tile * 0.09) + pillH);
  const gmpH = Math.round(14 * s + 8 * s + 88 * s);
  const statRows = items.length ? Math.ceil(items.length / 2) : 0;
  const statsH = statRows ? statRows * 84 * s + (statRows - 1) * 10 * s : 0;
  const datesH = prefs.showDates ? Math.round(11 * s + 5 * s + 18 * s) : 0;
  const noteH = prefs.note ? 20 * s : 0;
  const titleH = prefs.title ? 22 * s : 0;
  const sections =
    (prefs.showGmp ? 1 : 0) + (items.length ? 1 : 0) + (prefs.showDates ? 1 : 0) + (prefs.note ? 1 : 0);
  const gapBase = 20 * s;
  const qr = prefs.qr ? Math.round(84 * s) : 0;
  const footerH = qr || Math.round(56 * s);
  const footerTop = y + h - ip - footerH;
  const avail = footerTop - yy - titleH - 28 * s;
  const bodyH =
    companyH +
    (prefs.showGmp ? gmpH : 0) +
    statsH +
    datesH +
    noteH +
    gapBase * sections;
  const spare = Math.max(0, avail - bodyH);
  const tall = H / W > 1.1;
  const extra = Math.max(0, Math.min(tall ? 80 * s : 30 * s, spare / Math.max(1, sections)));
  const gap = gapBase + extra;
  const topShift = Math.max(0, Math.min(tall ? 50 * s : 24 * s, (spare - extra * sections) * 0.5));
  yy += topShift;

  if (prefs.title) {
    text(ctx, prefs.title.toUpperCase(), cx, yy + 13 * s, 13 * s, 700, p.accent, cw);
    yy += titleH;
  }
  yy += drawCompany(ctx, ipo, logo, cx, yy, cw, p, {
    tile,
    name: nameSize,
    line: nameLine,
    pill: pillSize,
    align: "left",
    card: p.tile,
    bare: prefs.removeLogoBg,
  });
  if (prefs.showGmp) {
    yy += gap;
    yy += drawGmpBlock(ctx, ipo, p, cx, yy, cw, {
      size: 88 * s,
      label: 14 * s,
      gap: 8 * s,
      align: "left",
    });
  }
  if (items.length) {
    yy += gap;
    yy += drawStats(ctx, items, p, cx, yy, cw, {
      cols: 2,
      h: 84 * s,
      gap: 10 * s,
      label: 11 * s,
      value: 24 * s,
      align: "left",
      card: true,
      fill: p.soft,
      stroke: p.line,
    });
  }
  if (prefs.showDates) {
    yy += gap;
    yy += drawDates(ctx, ipo, p, cx, yy, cw, {
      label: 11 * s,
      value: 18 * s,
      gap: 10 * s,
      cols: 4,
      align: "left",
      line: true,
    });
  }
  if (prefs.note) {
    yy += gap;
    drawNote(ctx, prefs.note, cx, yy, cw, p, "left", 16 * s);
  }
  rule(ctx, cx, footerTop - 14 * s, cw, p.line, 1);
  drawFooter(ctx, ipo, prefs, p, cx, footerTop, cw, { size: 14 * s, qr });
}

function drawSpotlight(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  logo: Art | null,
  brand: Art | null,
  prefs: Prefs,
  p: Palette,
  W: number,
  H: number,
  s: number,
) {
  ctx.fillStyle = "#14111c";
  ctx.fillRect(0, 0, W, H);
  const glow = (gx: number, gy: number, gr: number, a: number) => {
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, rgba(p.accent, a));
    g.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W * 0.12, H * 0.04, Math.max(W, H) * 0.85, 0.34);
  glow(W * 0.94, H * 0.96, Math.max(W, H) * 0.7, 0.18);
  drawPattern(ctx, W, H, Math.round(30 * s), "#ffffff", prefs.pattern, s, 0.7);

  const m = Math.round(26 * s);
  const plateY = m;
  const showBrand = prefs.showBrand && !!brand;
  const brandH = Math.round(58 * s);
  const fittedBrand = showBrand && brand ? brandSize(brand, Math.min(W * 0.62, 360 * s), brandH) : null;
  const plateW = fittedBrand ? fittedBrand.w + 40 * s : 0;
  const plateH = fittedBrand ? fittedBrand.h + 28 * s : 0;

  const cardX = m;
  const cardY = showBrand ? plateY + plateH * 0.5 : m + 8 * s;
  const cardW = W - m * 2;
  const cardH = H - m - cardY;
  box(ctx, cardX, cardY, cardW, cardH, 28 * s, "#fffdfb");
  if (showBrand && brand) {
    const plateX = (W - plateW) / 2;
    box(ctx, plateX, plateY, plateW, plateH, plateH / 2, "#fffdfb");
    drawBrandAt(ctx, brand, plateX + 20 * s, plateY + 14 * s, plateW - 40 * s, plateH - 28 * s, "center");
  }

  const ip = Math.round(32 * s);
  const cx = cardX + ip;
  const cw = cardW - ip * 2;
  const contentTop = showBrand ? plateY + plateH + 12 * s : cardY + ip;
  const items = prefs.showStats ? statsItems(ipo, prefs) : [];
  const tile = Math.round(108 * s * (prefs.logoScale / 100));
  const nameSize = Math.round(38 * s * (prefs.nameScale / 100));
  const nameLine = Math.round(nameSize * 1.16);
  const pillSize = Math.round(14 * s * (prefs.pillScale / 100));
  const pillH = Math.round(pillSize * 2.1);
  const fit = fitName(ctx, ipo.name, cw, nameSize);
  const nameBlock = fit.size + (fit.lines.length - 1) * nameLine;
  const companyH = tile + Math.round(tile * 0.14) + nameBlock + Math.round(tile * 0.1) + pillH;
  const hasPct = gmpValue(ipo) != null && !!ipo.gmpPercent;
  const gmpH = Math.round(13 * s + 8 * s + 86 * s + (hasPct ? 34 * s : 0));
  const statRows = items.length ? Math.ceil(items.length / 2) : 0;
  const statsH = statRows ? statRows * 78 * s + (statRows - 1) * 9 * s : 0;
  const datesH = prefs.showDates ? Math.round(10 * s + 5 * s + 17 * s) : 0;
  const noteH = prefs.note ? 20 * s : 0;
  const titleH = prefs.title ? 20 * s : 0;
  const sections =
    (prefs.showGmp ? 1 : 0) + (items.length ? 1 : 0) + (prefs.showDates ? 1 : 0) + (prefs.note ? 1 : 0);
  const gapBase = 18 * s;
  const qr = prefs.qr ? Math.round(80 * s) : 0;
  const footerH = qr || Math.round(54 * s);
  const footerTop = cardY + cardH - ip - footerH;
  const avail = footerTop - contentTop - 20 * s;
  const bodyH =
    titleH +
    companyH +
    (prefs.showGmp ? gmpH : 0) +
    statsH +
    datesH +
    noteH +
    gapBase * sections;
  const spare = Math.max(0, avail - bodyH);
  const tall = H / W > 1.1;
  const extra = Math.max(0, Math.min(tall ? 60 * s : 26 * s, spare / Math.max(1, sections)));
  const topShift = Math.max(0, Math.min(tall ? 80 * s : 24 * s, (spare - extra * sections) * 0.4));
  const gap = gapBase + extra;

  let yy = contentTop + topShift;
  if (prefs.title) {
    text(ctx, prefs.title.toUpperCase(), W / 2, yy + 12 * s, 12 * s, 700, p.accent, cw, "center");
    yy += titleH;
  }
  yy += drawCompany(ctx, ipo, logo, cx, yy, cw, p, {
    tile,
    name: nameSize,
    line: nameLine,
    pill: pillSize,
    align: "center",
    card: p.tile,
    bare: prefs.removeLogoBg,
  });
  if (prefs.showGmp) {
    yy += gap;
    yy += drawGmpBlock(ctx, ipo, p, cx, yy, cw, {
      size: 86 * s,
      label: 13 * s,
      gap: 8 * s,
      align: "center",
    });
  }
  if (items.length) {
    yy += gap;
    yy += drawStats(ctx, items, p, cx, yy, cw, {
      cols: 2,
      h: 78 * s,
      gap: 9 * s,
      label: 10 * s,
      value: 23 * s,
      align: "center",
      card: true,
      fill: p.soft,
      stroke: p.line,
    });
  }
  if (prefs.showDates) {
    yy += gap;
    yy += drawDates(ctx, ipo, p, cx, yy, cw, {
      label: 10 * s,
      value: 17 * s,
      gap: 9 * s,
      cols: 4,
      align: "center",
      line: true,
    });
  }
  if (prefs.note) {
    yy += gap;
    drawNote(ctx, prefs.note, cx, yy, cw, p, "center", 15 * s);
  }
  rule(ctx, cx, footerTop - 12 * s, cw, p.line, 1);
  drawFooter(ctx, ipo, prefs, p, cx, footerTop, cw, { size: 13 * s, qr, align: "center" });
}

function drawSplit(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  logo: Art | null,
  brand: Art | null,
  prefs: Prefs,
  p: Palette,
  W: number,
  H: number,
  s: number,
) {
  drawBackdrop(ctx, W, H, p, prefs.pattern, s);
  const panelH = Math.round(H * (H / W > 1.5 ? 0.3 : 0.27));
  ctx.fillStyle = p.accent;
  ctx.fillRect(0, 0, W, panelH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, panelH);
  ctx.clip();
  drawPattern(ctx, W, H, Math.round(40 * s), p.accentInk, prefs.pattern, s, 0.55);
  ctx.fillStyle = rgba(p.accentInk, 0.07);
  ctx.beginPath();
  ctx.arc(W * 0.9, panelH * 0.12, W * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W * 0.02, panelH * 0.9, W * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const pad = Math.round(48 * s);
  const brandH = Math.round(58 * s);
  const platePad = Math.round(16 * s);
  const plateW = Math.min(W * 0.64, 400 * s);
  const plateH = brandH + platePad * 2;
  const plateY = Math.round(panelH * 0.24);
  if (prefs.showBrand && brand) {
    box(ctx, (W - plateW) / 2, plateY, plateW, plateH, plateH / 2, "#fffdfb");
    drawBrandAt(ctx, brand, (W - plateW) / 2 + 18 * s, plateY + platePad, plateW - 36 * s, brandH, "center");
  }
  if (prefs.title) {
    text(
      ctx,
      prefs.title.toUpperCase(),
      W / 2,
      plateY + plateH + 28 * s,
      16 * s,
      700,
      p.accentInk,
      W - pad * 2,
      "center",
    );
  }

  const tile = Math.round(146 * s * (prefs.logoScale / 100));
  const tileY = panelH - tile * 0.55;
  box(
    ctx,
    (W - tile) / 2 - 6 * s,
    tileY - 6 * s,
    tile + 12 * s,
    tile + 12 * s,
    tile * 0.22,
    "#fffdfb",
  );

  const items = prefs.showStats ? statsItems(ipo, prefs) : [];
  const nameSize = Math.round(42 * s * (prefs.nameScale / 100));
  const nameLine = Math.round(nameSize * 1.16);
  const pillSize = Math.round(15 * s * (prefs.pillScale / 100));
  const pillH = Math.round(pillSize * 2.1);
  const fit = fitName(ctx, ipo.name, W - pad * 2, nameSize);
  const nameBlock = fit.size + (fit.lines.length - 1) * nameLine;
  const companyH = tile + Math.round(tile * 0.1) + nameBlock + Math.round(tile * 0.08) + pillH;
  const hasPct = gmpValue(ipo) != null && !!ipo.gmpPercent;
  const gmpH = Math.round(14 * s + 8 * s + 88 * s + (hasPct ? 35 * s : 0));
  const statRows = items.length ? Math.ceil(items.length / 2) : 0;
  const statsH = statRows ? statRows * 78 * s + (statRows - 1) * 9 * s : 0;
  const datesH = prefs.showDates ? Math.round(11 * s + 5 * s + 18 * s) : 0;
  const noteH = prefs.note ? 20 * s : 0;
  const sections =
    (prefs.showGmp ? 1 : 0) + (items.length ? 1 : 0) + (prefs.showDates ? 1 : 0) + (prefs.note ? 1 : 0);
  const gapBase = 14 * s;
  const qr = prefs.qr ? Math.round(82 * s) : 0;
  const footerH = qr || Math.round(54 * s);
  const footerTop = H - pad - footerH;
  const bodyTop = tileY + companyH;
  const avail = footerTop - bodyTop - 30 * s;
  const bodyH = (prefs.showGmp ? gmpH : 0) + statsH + datesH + noteH + gapBase * sections;
  const spare = Math.max(0, avail - bodyH);
  const tall = H / W > 1.1;
  const extra = Math.max(0, Math.min(tall ? 60 * s : 16 * s, spare / Math.max(1, sections)));
  const gap = gapBase + extra;
  const topShift = Math.max(0, Math.min(tall ? 60 * s : 0, (spare - extra * sections) * 0.4));

  let yy = tileY;
  yy += drawCompany(ctx, ipo, logo, pad, yy, W - pad * 2, p, {
    tile,
    name: nameSize,
    line: nameLine,
    pill: pillSize,
    align: "center",
    card: p.tile,
    bare: prefs.removeLogoBg,
  });
  yy += topShift;
  if (prefs.showGmp) {
    yy += gap;
    yy += drawGmpBlock(ctx, ipo, p, pad, yy, W - pad * 2, {
      size: 88 * s,
      label: 14 * s,
      gap: 8 * s,
      align: "center",
    });
  }
  if (items.length) {
    yy += gap;
    yy += drawStats(ctx, items, p, pad, yy, W - pad * 2, {
      cols: 2,
      h: 78 * s,
      gap: 9 * s,
      label: 11 * s,
      value: 24 * s,
      align: "center",
      card: true,
      fill: p.card,
      stroke: p.line,
    });
  }
  if (prefs.showDates) {
    yy += gap;
    yy += drawDates(ctx, ipo, p, pad, yy, W - pad * 2, {
      label: 11 * s,
      value: 18 * s,
      gap: 10 * s,
      cols: 4,
      align: "center",
      line: true,
    });
  }
  if (prefs.note) {
    yy += gap;
    drawNote(ctx, prefs.note, pad, yy, W - pad * 2, p, "center", 16 * s);
  }
  rule(ctx, pad, footerTop - 14 * s, W - pad * 2, p.line, 1);
  drawFooter(ctx, ipo, prefs, p, pad, footerTop, W - pad * 2, { size: 14 * s, qr, align: "center" });
}

function drawRail(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  logo: Art | null,
  brand: Art | null,
  prefs: Prefs,
  p: Palette,
  W: number,
  H: number,
  s: number,
) {
  drawBackdrop(ctx, W, H, p, prefs.pattern, s);
  const railW = Math.round(W * 0.27);
  const pad = Math.round(46 * s);
  ctx.fillStyle = p.accent;
  ctx.fillRect(0, 0, railW, H);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, railW, H);
  ctx.clip();
  drawPattern(ctx, railW, H, Math.round(30 * s), p.accentInk, prefs.pattern, s, 0.45);
  ctx.restore();

  if (prefs.showBrand && brand) {
    const capW = Math.round(railW * 0.58);
    const capH = Math.round(H * 0.58);
    const capX = (railW - capW) / 2;
    const capY = (H - capH) / 2 - 18 * s;
    box(ctx, capX, capY, capW, capH, capW / 2, "#fffdfb");
    ctx.strokeStyle = "rgba(15,23,42,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(capX, capY, capW, capH, capW / 2);
    ctx.stroke();
    drawBrandRaw(
      ctx,
      brand,
      capX + capW / 2,
      capY + capH / 2,
      capH - capW * 0.38,
      capW * 0.64,
      -Math.PI / 2,
    );
  }

  const cx = railW + pad;
  const cw = W - railW - pad * 2;
  let yy = pad;
  if (prefs.title) {
    text(ctx, prefs.title.toUpperCase(), cx, yy + 12 * s, 12 * s, 700, p.accent, cw);
    yy += 22 * s;
  }

  const items = prefs.showStats ? statsItems(ipo, prefs) : [];
  const tile = Math.round(108 * s * (prefs.logoScale / 100));
  const nameSize = Math.round(38 * s * (prefs.nameScale / 100));
  const nameLine = Math.round(nameSize * 1.16);
  const pillSize = Math.round(14 * s * (prefs.pillScale / 100));
  const pillH = Math.round(pillSize * 2.1);
  const fit = fitName(ctx, ipo.name, cw - tile - Math.round(tile * 0.16), nameSize);
  const nameBlock = fit.size + (fit.lines.length - 1) * nameLine;
  const companyH = Math.max(tile, nameBlock + Math.round(tile * 0.09) + pillH);
  const gmpH = Math.round(13 * s + 7 * s + 82 * s);
  const statRows = items.length ? Math.ceil(items.length / 2) : 0;
  const statsH = statRows ? statRows * 78 * s + (statRows - 1) * 9 * s : 0;
  const dateRows = prefs.showDates ? Math.ceil((ipo.status === "closed" ? 3 : 4) / 2) : 0;
  const datesH = dateRows * Math.round(10 * s + 5 * s + 17 * s) + (dateRows - 1) * 12 * s;
  const noteH = prefs.note ? 20 * s : 0;
  const sections =
    (prefs.showGmp ? 1 : 0) + (items.length ? 1 : 0) + (prefs.showDates ? 1 : 0) + (prefs.note ? 1 : 0);
  const gapBase = 18 * s;
  const qr = prefs.qr ? Math.round(78 * s) : 0;
  const footerH = qr || Math.round(52 * s);
  const footerTop = H - pad - footerH;
  const avail = footerTop - yy - 16 * s;
  const bodyH =
    companyH +
    (prefs.showGmp ? gmpH : 0) +
    statsH +
    datesH +
    noteH +
    gapBase * sections;
  const extra = Math.max(0, Math.min(H / W > 1.1 ? 90 * s : 60 * s, (avail - bodyH) / Math.max(1, sections)));
  const gap = gapBase + extra;
  const spare = Math.max(0, avail - bodyH);
  const topShift = Math.max(0, Math.min(H / W > 1.1 ? 90 * s : 40 * s, (spare - extra * sections) * 0.4));
  yy += topShift;

  yy += drawCompany(ctx, ipo, logo, cx, yy, cw, p, {
    tile,
    name: nameSize,
    line: nameLine,
    pill: pillSize,
    align: "left",
    card: p.tile,
    bare: prefs.removeLogoBg,
  });
  if (prefs.showGmp) {
    yy += gap;
    yy += drawGmpBlock(ctx, ipo, p, cx, yy, cw, {
      size: 82 * s,
      label: 13 * s,
      gap: 7 * s,
      align: "left",
    });
  }
  if (items.length) {
    yy += gap;
    yy += drawStats(ctx, items, p, cx, yy, cw, {
      cols: 2,
      h: 78 * s,
      gap: 9 * s,
      label: 10 * s,
      value: 22 * s,
      align: "left",
      card: true,
      fill: p.soft,
      stroke: p.line,
    });
  }
  if (prefs.showDates) {
    yy += gap;
    yy += drawDates(ctx, ipo, p, cx, yy, cw, {
      label: 10 * s,
      value: 17 * s,
      gap: 9 * s,
      cols: 2,
      align: "left",
      line: true,
    });
  }
  if (prefs.note) {
    yy += gap;
    drawNote(ctx, prefs.note, cx, yy, cw, p, "left", 15 * s);
  }
  rule(ctx, cx, footerTop - 12 * s, cw, p.line, 1);
  drawFooter(ctx, ipo, prefs, p, cx, footerTop, cw, { size: 13 * s, qr });
}

function drawMinimal(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  logo: Art | null,
  brand: Art | null,
  prefs: Prefs,
  p: Palette,
  W: number,
  H: number,
  s: number,
) {
  drawBackdrop(ctx, W, H, p, prefs.pattern, s);
  const pad = Math.round(52 * s);
  ctx.strokeStyle = rgba(p.ink, 0.14);
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.roundRect(pad * 0.5, pad * 0.5, W - pad, H - pad, 18 * s);
  ctx.stroke();

  if (prefs.showBrand && brand) {
    drawBrandRaw(ctx, brand, W / 2, H * 0.5, W * 0.9, W * 0.34, 0, 0.028);
  }
  const brandH = Math.round(36 * s);
  if (prefs.showBrand && brand) {
    const brandW = W * 0.42;
    drawBrandAt(ctx, brand, W - pad - brandW, pad, brandW, brandH, "right");
  }

  const items = prefs.showStats ? statsItems(ipo, prefs) : [];
  const tile = Math.round(110 * s * (prefs.logoScale / 100));
  const nameSize = Math.round(38 * s * (prefs.nameScale / 100));
  const nameLine = Math.round(nameSize * 1.16);
  const pillSize = Math.round(14 * s * (prefs.pillScale / 100));
  const pillH = Math.round(pillSize * 2.1);
  const fit = fitName(ctx, ipo.name, W - pad * 2, nameSize);
  const nameBlock = fit.size + (fit.lines.length - 1) * nameLine;
  const companyH = tile + Math.round(tile * 0.14) + nameBlock + Math.round(tile * 0.1) + pillH;
  const hasPct = gmpValue(ipo) != null && !!ipo.gmpPercent;
  const gmpH = Math.round(13 * s + 8 * s + 92 * s + (hasPct ? 32 * s : 0));
  const statRows = items.length ? Math.ceil(items.length / 2) : 0;
  const statH = Math.round(11 * s + 11 * s + 23 * s);
  const statsH = statRows ? statRows * statH + (statRows - 1) * 16 * s : 0;
  const datesH = prefs.showDates ? Math.round(11 * s + 5 * s + 18 * s) : 0;
  const noteH = prefs.note ? 20 * s : 0;
  const titleH = prefs.title ? 22 * s : 0;
  const sections =
    (prefs.showGmp ? 1 : 0) + (items.length ? 1 : 0) + (prefs.showDates ? 1 : 0) + (prefs.note ? 1 : 0);
  const gap = 20 * s;
  const qr = prefs.qr ? Math.round(80 * s) : 0;
  const footerH = qr || Math.round(52 * s);
  const footerTop = H - pad - footerH;
  const topRowBottom = pad + (prefs.showBrand && brand ? brandH : 0);
  const bodyH =
    titleH +
    companyH +
    (prefs.showGmp ? gmpH : 0) +
    statsH +
    datesH +
    noteH +
    gap * sections;
  const avail = footerTop - topRowBottom - 40 * s;
  const startY = topRowBottom + Math.max(24 * s, (avail - bodyH) / 2);

  let yy = startY;
  if (prefs.title) {
    text(ctx, prefs.title.toUpperCase(), W / 2, yy + 12 * s, 12 * s, 700, p.accent, W - pad * 2, "center");
    yy += titleH;
  }
  yy += drawCompany(ctx, ipo, logo, pad, yy, W - pad * 2, p, {
    tile,
    name: nameSize,
    line: nameLine,
    pill: pillSize,
    align: "center",
    card: p.tile,
    bare: prefs.removeLogoBg,
  });
  if (prefs.showGmp) {
    yy += gap;
    yy += drawGmpBlock(ctx, ipo, p, pad, yy, W - pad * 2, {
      size: 92 * s,
      label: 13 * s,
      gap: 8 * s,
      align: "center",
    });
  }
  if (items.length) {
    yy += gap;
    yy += drawStats(ctx, items, p, pad, yy, W - pad * 2, {
      cols: 2,
      h: statH,
      gap: 16 * s,
      label: 11 * s,
      value: 23 * s,
      align: "center",
      card: false,
      stroke: p.line,
    });
  }
  if (prefs.showDates) {
    yy += gap;
    yy += drawDates(ctx, ipo, p, pad, yy, W - pad * 2, {
      label: 11 * s,
      value: 18 * s,
      gap: 10 * s,
      cols: 4,
      align: "center",
      line: true,
    });
  }
  if (prefs.note) {
    yy += gap;
    drawNote(ctx, prefs.note, pad, yy, W - pad * 2, p, "center", 16 * s);
  }
  rule(ctx, pad, footerTop - 12 * s, W - pad * 2, p.line, 1);
  drawFooter(ctx, ipo, prefs, p, pad, footerTop, W - pad * 2, { size: 14 * s, qr, align: "center" });
}

function drawWide(
  ctx: CanvasRenderingContext2D,
  ipo: Ipo,
  logo: Art | null,
  brand: Art | null,
  prefs: Prefs,
  p: Palette,
  W: number,
  H: number,
) {
  const s = H / 630;
  const pad = Math.round(30 * s);
  const rail = prefs.template === "rail";
  const leftW = Math.round((rail ? 250 : 390) * s);
  const rightX = leftW + Math.round(34 * s);
  const rightW = W - rightX - pad;
  const spotlight = prefs.template === "spotlight";
  const split = prefs.template === "split";

  if (spotlight) {
    ctx.fillStyle = "#14111c";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.1, H * 0.1, 0, W * 0.1, H * 0.1, Math.max(W, H) * 0.9);
    g.addColorStop(0, rgba(p.accent, 0.32));
    g.addColorStop(1, rgba(p.accent, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    drawPattern(ctx, W, H, pad, "#ffffff", prefs.pattern, s, 0.7);
  } else {
    drawBackdrop(ctx, W, H, p, prefs.pattern, s);
  }

  if (split || rail) {
    ctx.fillStyle = p.accent;
    ctx.fillRect(0, 0, leftW, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, leftW, H);
    ctx.clip();
    drawPattern(ctx, leftW, H, Math.round(24 * s), p.accentInk, prefs.pattern, s, 0.5);
    if (split) {
      ctx.fillStyle = rgba(p.accentInk, 0.07);
      ctx.beginPath();
      ctx.arc(leftW * 0.86, H * 0.2, leftW * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(leftW * 0.08, H * 0.92, leftW * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const lx = pad;
  const lw = leftW - pad * 2;
  if (prefs.template === "studio" || prefs.template === "minimal") {
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftW, pad);
    ctx.lineTo(leftW, H - pad);
    ctx.stroke();
  }

  if (prefs.showBrand && brand) {
    if (prefs.template === "studio") {
      drawBrandAt(ctx, brand, lx, pad, lw, 44 * s, "left");
      ctx.fillStyle = p.accent;
      ctx.fillRect(lx, pad + 54 * s, 34 * s, 3 * s);
      if (prefs.title) text(ctx, prefs.title.toUpperCase(), lx, pad + 82 * s, 12 * s, 700, p.accent, lw);
    } else if (prefs.template === "minimal") {
      drawBrandRaw(ctx, brand, leftW / 2, H * 0.53, leftW * 0.86, leftW * 0.32, 0, 0.05);
      drawBrandAt(ctx, brand, leftW - pad - lw, pad, lw, 36 * s, "right");
      if (prefs.title) text(ctx, prefs.title.toUpperCase(), lx, pad + 14 * s, 11 * s, 700, p.accent, lw);
    } else if (spotlight) {
      box(ctx, lx, pad, lw, 76 * s, 38 * s, "#fffdfb");
      drawBrandAt(ctx, brand, lx + 16 * s, pad + 14 * s, lw - 32 * s, 48 * s, "center");
      if (prefs.title) text(ctx, prefs.title.toUpperCase(), lx, pad + 96 * s, 12 * s, 700, "#ffffff", lw);
    } else if (split) {
      box(ctx, lx + 10 * s, pad, lw - 20 * s, 76 * s, 38 * s, "#fffdfb");
      drawBrandAt(ctx, brand, lx + 26 * s, pad + 14 * s, lw - 52 * s, 48 * s, "center");
      if (prefs.title) text(ctx, prefs.title.toUpperCase(), lx + 10 * s, pad + 96 * s, 12 * s, 700, p.accentInk, lw - 20 * s);
    } else if (rail) {
      const capW = Math.round(leftW * 0.54);
      const capH = Math.round(H * 0.6);
      const capX = (leftW - capW) / 2;
      const capY = Math.round((H - capH) / 2);
      box(ctx, capX, capY, capW, capH, capW / 2, "#fffdfb");
      ctx.strokeStyle = "rgba(15,23,42,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(capX, capY, capW, capH, capW / 2);
      ctx.stroke();
      drawBrandRaw(ctx, brand, capX + capW / 2, capY + capH / 2, capH - capW * 0.38, capW * 0.64, -Math.PI / 2);
      if (prefs.title) {
        text(ctx, prefs.title.toUpperCase(), lx, pad + 12 * s, 10 * s, 700, p.accentInk, lw, "center");
      }
    }
  }

  const zoneAccent = spotlight ? "#ffffff" : split || rail ? p.accentInk : p.ink;
  const zoneMuted = spotlight
    ? "rgba(255,255,255,0.58)"
    : split || rail
      ? rgba(p.accentInk, 0.62)
      : p.muted;
  const handle = [prefs.handle, prefs.cta].filter(Boolean).join(" · ") || "Discover. Track. Share IPOs.";
  text(ctx, handle, lx, H - pad - 22 * s, 13 * s, 700, zoneAccent, lw);
  text(ctx, "GMP is unofficial · Not investment advice", lx, H - pad - 4 * s, 9.5 * s, 500, zoneMuted, lw);

  const card = spotlight;
  let cx = rightX;
  let cw = rightW;
  let cy = pad;
  let cBottom = H - pad;
  if (card) {
    box(ctx, rightX, pad, rightW, H - pad * 2, 24 * s, "#fffdfb");
    cx = rightX + 26 * s;
    cw = rightW - 52 * s;
    cy = pad + 24 * s;
    cBottom = H - pad - 24 * s;
  }

  const items = prefs.showStats ? statsItems(ipo, prefs) : [];
  const tile = Math.round(82 * s * (prefs.logoScale / 100));
  const nameSize = Math.round(27 * s * (prefs.nameScale / 100));
  const nameLine = Math.round(nameSize * 1.16);
  const pillSize = Math.round(11 * s * (prefs.pillScale / 100));
  let yy = cy;
  yy += drawCompany(ctx, ipo, logo, cx, yy, cw, p, {
    tile,
    name: nameSize,
    line: nameLine,
    pill: pillSize,
    align: "left",
    card: p.tile,
    bare: prefs.removeLogoBg,
  });
  if (prefs.showGmp) {
    yy += 14 * s;
    yy += drawGmpBlock(ctx, ipo, p, cx, yy, cw, { size: 60 * s, label: 10 * s, gap: 5 * s, align: "left" });
  }
  if (items.length) {
    yy += 14 * s;
    yy += drawStats(ctx, items, p, cx, yy, cw, {
      cols: 2,
      h: 66 * s,
      gap: 8 * s,
      label: 8.5 * s,
      value: 15 * s,
      align: "left",
      card: true,
      fill: p.soft,
      stroke: p.line,
    });
  }
  if (prefs.showDates) {
    yy += 12 * s;
    yy += drawDates(ctx, ipo, p, cx, yy, cw, {
      label: 8.5 * s,
      value: 12.5 * s,
      gap: 8 * s,
      cols: 4,
      align: "left",
      line: true,
    });
  }
  if (prefs.note) {
    yy += 10 * s;
    drawNote(ctx, prefs.note, cx, yy, cw, p, "left", 12 * s);
  }
  const qr = prefs.qr ? Math.round(56 * s) : 0;
  if (qr) drawQr(ctx, qrHref(prefs.qrLink), cx + cw - qr, cBottom - qr, qr, p.line);
}

function draw(ctx: CanvasRenderingContext2D, ipo: Ipo, logo: Art | null, brandImg: Art | null, prefs: Prefs) {
  const spec = SIZE_SPECS[prefs.size];
  const p = palette(prefs);
  ctx.clearRect(0, 0, spec.W, spec.H);
  if (spec.W > spec.H) {
    if (prefs.template === "largeprint" || prefs.template === "dateboard") {
      drawEasyWide(ctx, ipo, logo, brandImg, prefs, p, spec.W, spec.H, prefs.template === "dateboard");
    } else {
      drawWide(ctx, ipo, logo, brandImg, prefs, p, spec.W, spec.H);
    }
    return;
  }
  const aspect = spec.H / spec.W;
  const s = (spec.W / 1080) * (aspect > 1.6 ? 1.45 : aspect > 1.35 ? 1.4 : 1);
  if (prefs.template === "largeprint") drawEasy(ctx, ipo, logo, brandImg, prefs, p, spec.W, spec.H, s, false);
  else if (prefs.template === "dateboard") drawEasy(ctx, ipo, logo, brandImg, prefs, p, spec.W, spec.H, s, true);
  else if (prefs.template === "studio") drawStudio(ctx, ipo, logo, brandImg, prefs, p, spec.W, spec.H, s);
  else if (prefs.template === "spotlight") drawSpotlight(ctx, ipo, logo, brandImg, prefs, p, spec.W, spec.H, s);
  else if (prefs.template === "split") drawSplit(ctx, ipo, logo, brandImg, prefs, p, spec.W, spec.H, s);
  else if (prefs.template === "rail") drawRail(ctx, ipo, logo, brandImg, prefs, p, spec.W, spec.H, s);
  else drawMinimal(ctx, ipo, logo, brandImg, prefs, p, spec.W, spec.H, s);
}

function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function ShareCard({ ipo }: { ipo: Ipo }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [brandLogo, setBrandLogo] = useState<string | null>(() => (loadPrefs().showBrand ? DEFAULT_BRAND : null));
  const [flash, setFlash] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState("");
  const [presetName, setPresetName] = useState("");
  const spec = SIZE_SPECS[prefs.size];
  const easyRead = prefs.template === "largeprint" || prefs.template === "dateboard";

  useEffect(() => {
    setPresets(loadPresets());
  }, []);


  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // private mode / storage full: preferences just won't persist
    }
  }, [prefs]);

  useEffect(() => {
    let cancelled = false;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    draw(ctx, ipo, null, null, prefs);

    Promise.all([loadImage(customLogo ?? ipo.logo), loadImage(brandLogo)]).then(([logo, brand]) => {
      if (cancelled) return;
      const cutLogo = logo && prefs.removeLogoBg ? cutBackground(logo, prefs.logoBgTol) : logo;
      const cutBrand = brand && prefs.removeBrandBg ? cutBackground(brand, prefs.brandBgTol) : brand;
      if (!cancelled) draw(ctx, ipo, cutLogo, cutBrand, prefs);
    });

    return () => {
      cancelled = true;
    };
  }, [ipo, prefs, customLogo, brandLogo]);

  function update(patch: Partial<Prefs>) {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }

  function presetNote(message: string) {
    setFlash(message);
    setTimeout(() => setFlash(""), 2500);
  }

  function selectPreset(id: string) {
    setPresetId(id);
    if (!id) {
      setPresetName("");
      return;
    }
    const preset = presets.find((item) => item.id === id);
    if (preset) setPresetName(preset.name);
  }

  function savePreset() {
    const name = presetName.trim();
    if (!name) {
      presetNote("Name the preset first.");
      return;
    }

    const existing =
      presets.find((item) => item.id === presetId) ??
      presets.find((item) => item.name.toLowerCase() === name.toLowerCase());
    const id =
      existing?.id ??
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const next = existing
      ? presets.map((item) => (item.id === id ? { ...item, name, prefs } : item))
      : [...presets, { id, name, prefs }];

    setPresets(next);
    persistPresets(next);
    setPresetId(id);
    setPresetName(name);
    presetNote(existing ? "Preset updated." : "Preset saved.");
  }

  function loadPreset() {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) {
      presetNote("Choose a preset first.");
      return;
    }
    setPrefs(preset.prefs);
    setPresetName(preset.name);
    presetNote("Preset loaded.");
  }

  function deletePreset() {
    if (!presetId) {
      presetNote("Choose a preset first.");
      return;
    }
    const preset = presets.find((item) => item.id === presetId);
    if (!preset || !window.confirm(`Delete the “${preset.name}” preset?`)) return;

    const next = presets.filter((item) => item.id !== presetId);
    setPresets(next);
    persistPresets(next);
    setPresetId("");
    setPresetName("");
    presetNote("Preset deleted.");
  }

  function nudge(key: "logoScale" | "nameScale", delta: number) {
    setPrefs((prev) => ({
      ...prev,
      [key]: Math.min(SCALE_RANGE.max, Math.max(SCALE_RANGE.min, prev[key] + delta)),
    }));
  }

  function upload(file: File | undefined, apply: (src: string) => void) {
    if (!file || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => apply(String(reader.result));
    reader.readAsDataURL(file);
  }

  function download(type: "image/png" | "image/jpeg") {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${ipo.slug}-${prefs.template}-${prefs.size}.${type === "image/png" ? "png" : "jpg"}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      type,
      0.92,
    );
  }

  async function copyImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("unsupported");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setFlash("Image copied. Paste it anywhere.");
    } catch {
      download("image/png");
      setFlash("Clipboard blocked. PNG downloaded instead.");
    }
    setTimeout(() => setFlash(""), 3000);
  }

  return (
    <div className="card-preview">
      <div className="preview-pane">
        <canvas ref={canvasRef} width={spec.W} height={spec.H} role="img" aria-label={`Share card for ${ipo.name}`} />

        <div className="actions">
          <button className="btn" onClick={() => download("image/png")}>
            Download PNG
          </button>
          <button className="btn ghost" onClick={() => download("image/jpeg")}>
            Download JPG
          </button>
          <button className="btn ghost" onClick={copyImage}>
            Copy image
          </button>
          {flash && <p className="editor-flash" role="status">{flash}</p>}
        </div>
      </div>

      <div className="editor">
        <div className="editor-block wide">
          <span className="editor-label">Template</span>
          <div className="segmented">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                className={prefs.template === t.key ? "on" : ""}
                title={t.hint}
                onClick={() => update({ template: t.key })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="editor-hint">
            Large Print and Date Board use bigger text, three key stats and no texture.
          </span>
        </div>

        <div className="editor-block wide">
          <span className="editor-label">Size</span>
          <div className="segmented">
            {(Object.keys(SIZE_SPECS) as Size[]).map((s) => (
              <button key={s} className={prefs.size === s ? "on" : ""} onClick={() => update({ size: s })}>
                {SIZE_SPECS[s].label}
              </button>
            ))}
          </div>
          <span className="editor-hint">Square and portrait are built for Instagram posts; story for 9:16.</span>
        </div>

        <div className="editor-block wide">
          <span className="editor-label">Saved presets</span>
          <div className="preset-row">
            <select value={presetId} onChange={(e) => selectPreset(e.target.value)} aria-label="Saved preset">
              <option value="">Choose a preset</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button type="button" className="file-btn" onClick={loadPreset} disabled={!presetId}>
              Load
            </button>
            <button type="button" className="file-btn" onClick={deletePreset} disabled={!presetId}>
              Delete
            </button>
          </div>
          <div className="preset-row">
            <input
              value={presetName}
              maxLength={40}
              placeholder="Preset name"
              onChange={(e) => setPresetName(e.target.value)}
            />
            <button type="button" className="file-btn" onClick={savePreset}>
              Save preset
            </button>
          </div>
          <span className="editor-hint">Presets live in this browser. Custom logo images are not included.</span>
        </div>

        <div className="editor-block wide">
          <span className="editor-label">Colour</span>
          <div className="editor-row">
            <div className="swatches">
              {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
                <button
                  key={key}
                  className={prefs.theme === key ? "swatch on" : "swatch"}
                  style={{ background: THEMES[key].bg, borderColor: THEMES[key].accent }}
                  onClick={() => update({ theme: key })}
                  aria-label={THEMES[key].label}
                  aria-pressed={prefs.theme === key}
                  title={THEMES[key].label}
                >
                  <span style={{ background: THEMES[key].accent }} />
                </button>
              ))}
            </div>
            <label className="color-well" title="Custom accent colour">
              <input
                type="color"
                aria-label="Custom accent colour"
                value={prefs.accent || THEMES[prefs.theme].accent}
                onChange={(e) => update({ accent: e.target.value })}
              />
              <span>Custom</span>
            </label>
            {prefs.accent && (
              <button className="link-btn" onClick={() => update({ accent: "" })}>
                Auto
              </button>
            )}
            <label className="toggle">
              <input type="checkbox" checked={prefs.tinted} onChange={(e) => update({ tinted: e.target.checked })} />
              Pastel background
            </label>
          </div>
        </div>

        <div className="editor-block wide">
          <span className="editor-label">Sizes</span>
          <div className="size-grid">
            {SCALES.map(({ key, label }) => (
              <div className="size-row" key={key}>
                <span>{label}</span>
                <div className="stepper">
                  <button
                    type="button"
                    aria-label={`Decrease ${label} size`}
                    disabled={prefs[key] <= SCALE_RANGE.min}
                    onClick={() => nudge(key, -SCALE_RANGE.step)}
                  >
                    −
                  </button>
                  <span>{prefs[key]}%</span>
                  <button
                    type="button"
                    aria-label={`Increase ${label} size`}
                    disabled={prefs[key] >= SCALE_RANGE.max}
                    onClick={() => nudge(key, SCALE_RANGE.step)}
                  >
                    +
                  </button>
                </div>
                {prefs[key] !== 100 && (
                  <button className="link-btn" onClick={() => update({ [key]: 100 } as Partial<Prefs>)}>
                    Reset
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="size-sliders">
            <label className="slider-row">
              <span>Mainboard + status tags</span>
              <input
                type="range"
                min={SCALE_RANGE.min}
                max={SCALE_RANGE.max}
                step={SLIDER_STEP}
                value={prefs.pillScale}
                onChange={(e) => update({ pillScale: Number(e.target.value) })}
              />
              <span>{prefs.pillScale}%</span>
            </label>
          </div>
        </div>

        <div className="editor-block wide">
          <span className="editor-label">Logo background</span>
          <div className="bg-rows">
            <label className="toggle">
              <input
                type="checkbox"
                checked={prefs.removeLogoBg}
                onChange={(e) => update({ removeLogoBg: e.target.checked })}
              />
              Remove IPO logo background
            </label>
            {prefs.removeLogoBg && (
              <label className="range-row">
                <span>Tolerance</span>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={prefs.logoBgTol}
                  onChange={(e) => update({ logoBgTol: Number(e.target.value) })}
                />
                <span>{prefs.logoBgTol}</span>
              </label>
            )}
            <label className="toggle">
              <input
                type="checkbox"
                checked={prefs.removeBrandBg}
                onChange={(e) => update({ removeBrandBg: e.target.checked })}
              />
              Remove business logo background
            </label>
            {prefs.removeBrandBg && (
              <label className="range-row">
                <span>Tolerance</span>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={prefs.brandBgTol}
                  onChange={(e) => update({ brandBgTol: Number(e.target.value) })}
                />
                <span>{prefs.brandBgTol}</span>
              </label>
            )}
          </div>
          <span className="editor-hint">
            Your logo leads the design. Works best on plain or white backgrounds.
          </span>
        </div>

        <div className="editor-block">
          <span className="editor-label">Texture</span>
          <div className="segmented">
            {PATTERNS.map((pat) => (
              <button
                key={pat.key}
                className={prefs.pattern === pat.key ? "on" : ""}
                onClick={() => update({ pattern: pat.key })}
              >
                {pat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-block">
          <span className="editor-label">QR code</span>
          <label className="toggle">
            <input type="checkbox" checked={prefs.qr} onChange={(e) => update({ qr: e.target.checked })} />
            Add a QR code
          </label>
        </div>

        {prefs.qr && (
          <div className="editor-block wide">
            <label className="field">
              <span className="editor-label">QR link</span>
              <input
                value={prefs.qrLink}
                placeholder={`${typeof window === "undefined" ? "" : window.location.origin}/apply`}
                onChange={(e) => update({ qrLink: e.target.value })}
              />
            </label>
          </div>
        )}

        <div className="editor-block wide">
          <span className="editor-label">Show</span>
          <div className="checks">
            <label>
              <input type="checkbox" checked={prefs.showGmp} onChange={(e) => update({ showGmp: e.target.checked })} />
              GMP
            </label>
            <label>
              <input type="checkbox" checked={prefs.showStats} onChange={(e) => update({ showStats: e.target.checked })} />
              Price / lot
            </label>
            <label
              className={prefs.showStats && !easyRead ? "" : "off"}
              title={easyRead ? "Large Print and Date Board keep three stats" : undefined}
            >
              <input
                type="checkbox"
                checked={prefs.showIssue && prefs.showStats && !easyRead}
                disabled={!prefs.showStats || easyRead}
                onChange={(e) => update({ showIssue: e.target.checked })}
              />
              Issue size
            </label>
            <label>
              <input type="checkbox" checked={prefs.showDates} onChange={(e) => update({ showDates: e.target.checked })} />
              Dates
            </label>
          </div>
          {easyRead && <span className="editor-hint">Issue size is left off to keep the text large.</span>}
        </div>

        <div className="editor-block wide fields">
          <label className="field">
            <span className="editor-label">Title</span>
            <input
              value={prefs.title}
              maxLength={24}
              placeholder="IPO ALERT"
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="editor-label">Note</span>
            <input
              value={prefs.note}
              maxLength={60}
              placeholder="Apply before 5 PM"
              onChange={(e) => update({ note: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="editor-label">Handle</span>
            <input
              value={prefs.handle}
              maxLength={30}
              placeholder="@yourchannel"
              onChange={(e) => update({ handle: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="editor-label">CTA</span>
            <input
              value={prefs.cta}
              maxLength={40}
              placeholder="DM for allotment updates"
              onChange={(e) => update({ cta: e.target.value })}
            />
          </label>
        </div>

        <div className="editor-block wide">
          <span className="editor-label">Your business</span>
          <div className="editor-row">
            <label className="file-btn">
              {brandLogo ? "Change business logo" : "Upload business logo"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  upload(e.target.files?.[0], (src) => {
                    setBrandLogo(src);
                    update({ showBrand: true });
                  })
                }
              />
            </label>
            {brandLogo && (
              <button
                className="link-btn"
                onClick={() => {
                  setBrandLogo(null);
                  update({ showBrand: false });
                }}
              >
                Remove
              </button>
            )}
          </div>
          {brandLogo && <span className="note">Shown prominently in every template.</span>}
        </div>

        <div className="editor-block wide extras">
          <label className="file-btn">
            {customLogo ? "Change IPO logo" : "Upload IPO logo"}
            <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0], setCustomLogo)} />
          </label>
          {customLogo && (
            <button className="link-btn" onClick={() => setCustomLogo(null)}>
              Remove IPO logo
            </button>
          )}
          <button
            className="link-btn push"
            onClick={() => {
              setPrefs(DEFAULTS);
              setCustomLogo(null);
              setBrandLogo(DEFAULT_BRAND);
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

