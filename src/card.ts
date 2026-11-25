/**
 * The hover card. Lives in a shadow root so the page's CSS cannot restyle it
 * and our CSS cannot leak into the page.
 */
import type { Analysis } from "./analyze";

const HEAD: Record<Analysis["level"], { label: string; color: string }> = {
  ok: { label: "No warning signs", color: "#3ecf8e" },
  caution: { label: "Be careful", color: "#f5b942" },
  danger: { label: "Likely phishing", color: "#ff5c7a" },
};

export const CARD_CSS = `
:host { all: initial; }
.card { position: fixed; z-index: 2147483647; width: 320px; max-width: calc(100vw - 16px); box-sizing: border-box;
  font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #ecebf5; background: #12111c;
  border: 1px solid rgba(255,255,255,.12); border-radius: 12px; box-shadow: 0 18px 40px rgba(0,0,0,.45);
  overflow: hidden; pointer-events: none; opacity: 0; transform: translateY(4px); transition: opacity .12s, transform .12s; }
.card.on { opacity: 1; transform: none; }
.top { display: flex; align-items: center; gap: 8px; padding: 9px 12px; font-weight: 700; }
.dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.score { margin-left: auto; font: 600 11px ui-monospace, monospace; opacity: .7; }
.host { padding: 8px 12px 10px; font: 13px ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; color: #b9b5cc; }
.host b { color: #fff; font-weight: 700; }
.host u { text-decoration: 2px wavy underline #ff5c7a; text-underline-offset: 3px; }
ul { list-style: none; margin: 0; padding: 8px 12px 10px; border-top: 1px solid rgba(255,255,255,.08); display: grid; gap: 7px; }
li { display: grid; grid-template-columns: 8px 1fr; gap: 8px; }
li i { width: 6px; height: 6px; border-radius: 50%; margin-top: 6px; }
li strong { display: block; font-weight: 600; color: #fff; }
li span { color: #a9a4bf; }
.foot { padding: 6px 12px; font-size: 11px; color: #7f7a96; border-top: 1px solid rgba(255,255,255,.06); }
`;

const SEV_COLOR = { info: "#7cc7ff", warn: "#f5b942", danger: "#ff5c7a" };

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** "login.paypal.com.evil.xyz" with the registrable part ("evil.xyz") in bold. */
export function hostHtml(a: Analysis): string {
  const parts = a.displayHost.split(".");
  const n = a.registrable ? a.registrable.split(".").length : 0;
  if (!n || parts.length < n) return esc(a.displayHost);
  const prefix = parts.slice(0, -n).join(".");
  const owner = parts.slice(-n).join(".");
  return (prefix ? `${mark(prefix)}.` : "") + `<b>${mark(owner)}</b>`;
}

/** Escape, and underline characters outside ASCII so swapped letters stand out. */
function mark(s: string): string {
  return [...s].map((c) => (c.charCodeAt(0) > 127 ? `<u title="U+${c.codePointAt(0)!.toString(16).toUpperCase()}">${esc(c)}</u>` : esc(c))).join("");
}

export function cardHtml(a: Analysis): string {
  const h = HEAD[a.level];
  const items = a.findings
    .map((f) => `<li><i style="background:${SEV_COLOR[f.severity]}"></i><div><strong>${esc(f.title)}</strong><span>${esc(f.detail)}</span></div></li>`)
    .join("");
  return `<div class="top" style="background:${h.color}1f"><span class="dot" style="background:${h.color}"></span>${h.label}<span class="score">${a.score}/100</span></div>
<div class="host">${a.displayHost ? hostHtml(a) : esc(a.href.slice(0, 80))}</div>
${items ? `<ul>${items}</ul>` : ""}<div class="foot">LinkLens · the bold part is who really owns the site</div>`;
}

export class Card {
  private el: HTMLDivElement;

  constructor(doc: Document = document) {
    const host = doc.createElement("linklens-card");
    const root = host.attachShadow({ mode: "closed" });
    const style = doc.createElement("style");
    style.textContent = CARD_CSS;
    this.el = doc.createElement("div");
    this.el.className = "card";
    this.el.setAttribute("role", "tooltip");
    root.append(style, this.el);
    doc.documentElement.append(host);
  }

  show(a: Analysis, anchor: DOMRect): void {
    this.el.innerHTML = cardHtml(a);
    const w = Math.min(320, window.innerWidth - 16);
    const left = Math.max(8, Math.min(anchor.left, window.innerWidth - w - 8));
    const below = anchor.bottom + 8;
    this.el.style.left = `${left}px`;
    this.el.style.top = `${below}px`;
    this.el.classList.add("on");
    const h = this.el.offsetHeight;
    if (below + h > window.innerHeight - 8) this.el.style.top = `${Math.max(8, anchor.top - h - 8)}px`;
  }

  hide(): void {
    this.el.classList.remove("on");
  }
}
