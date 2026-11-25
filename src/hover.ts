/**
 * Watches links inside a root element: shows the card on hover and can mark
 * risky links. Shared by the extension's content script and the demo page.
 */
import { analyzeLink, type Analysis } from "./analyze";
import { Card } from "./card";

export interface HoverOptions {
  pageHost: string;
  showSafe: boolean;   // also show the card for links with no warning signs
}

const MARK_CSS = `a[data-linklens="danger"]{outline:2px dashed #ff5c7a!important;outline-offset:2px!important}
a[data-linklens="caution"]{outline:2px dashed #f5b942!important;outline-offset:2px!important}`;

const cache = new Map<string, Analysis>();

export function inspect(a: HTMLAnchorElement, pageHost: string): Analysis {
  const text = (a.innerText || a.textContent || "").slice(0, 300);
  const key = `${a.href}\u0000${text}`;
  let result = cache.get(key);
  if (!result) {
    result = analyzeLink(a.href, text, pageHost);
    if (cache.size > 2000) cache.clear();
    cache.set(key, result);
  }
  return result;
}

export function attachHover(root: Document | HTMLElement, opts: HoverOptions): () => void {
  const card = new Card(root instanceof Document ? root : root.ownerDocument);
  let timer = 0;
  let current: HTMLAnchorElement | null = null;

  const over = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || a === current) return;
    current = a;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const result = inspect(a, opts.pageHost);
      if (result.level === "ok" && !opts.showSafe) return card.hide();
      card.show(result, a.getBoundingClientRect());
    }, 140);
  };
  const out = (e: Event) => {
    const to = (e as MouseEvent).relatedTarget as Node | null;
    if (current && to && current.contains(to)) return;
    current = null;
    clearTimeout(timer);
    card.hide();
  };
  const focus = (e: Event) => over(e);  // keyboard users get the card on Tab too

  root.addEventListener("mouseover", over);
  root.addEventListener("mouseout", out);
  root.addEventListener("focusin", focus);
  root.addEventListener("focusout", out);
  window.addEventListener("scroll", () => card.hide(), { passive: true });
  return () => {
    root.removeEventListener("mouseover", over);
    root.removeEventListener("mouseout", out);
    root.removeEventListener("focusin", focus);
    root.removeEventListener("focusout", out);
  };
}

export interface PageSummary {
  total: number;
  caution: number;
  danger: number;
  risky: { href: string; host: string; level: Analysis["level"]; score: number; reasons: string[] }[];
}

/** Analyse every link in `root`; optionally outline the risky ones. */
export function scanLinks(root: ParentNode, pageHost: string, mark: boolean): PageSummary {
  const doc = root instanceof Document ? root : (root as Node).ownerDocument!;
  if (mark && !doc.getElementById("linklens-marks")) {
    const style = doc.createElement("style");
    style.id = "linklens-marks";
    style.textContent = MARK_CSS;
    doc.head?.append(style);
  }
  const summary: PageSummary = { total: 0, caution: 0, danger: 0, risky: [] };
  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    const r = inspect(a, pageHost);
    summary.total += 1;
    if (r.level !== "ok") {
      summary[r.level] += 1;
      summary.risky.push({ href: r.href, host: r.displayHost, level: r.level, score: r.score,
        reasons: r.findings.filter((f) => f.severity !== "info").map((f) => f.title) });
    }
    if (mark && r.level !== "ok") a.dataset.linklens = r.level;
    else delete a.dataset.linklens;
  });
  summary.risky.sort((x, y) => y.score - x.score);
  summary.risky = summary.risky.slice(0, 20);
  return summary;
}
