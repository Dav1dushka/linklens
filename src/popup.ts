/** Toolbar popup: summary of risky links on the current tab, plus settings. */
import type { PageSummary } from "./hover";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const DEFAULTS = { highlight: true, showSafe: false };

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function render(s: PageSummary) {
  $("total").textContent = String(s.total);
  $("caution").textContent = String(s.caution);
  $("danger").textContent = String(s.danger);
  $("verdict").textContent = s.danger ? `${s.danger} link${s.danger > 1 ? "s" : ""} look like phishing`
    : s.caution ? "Some links deserve a second look" : "No risky links on this page";
  $("verdict").className = s.danger ? "danger" : s.caution ? "caution" : "ok";
  $("list").innerHTML = s.risky.map((r) => `<li class="${r.level}"><b>${esc(r.host || r.href)}</b>
    <span>${esc(r.reasons.join(" · ") || "minor signs")}</span></li>`).join("");
}

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "linklens:scan" }, (summary?: PageSummary) => {
    if (chrome.runtime.lastError || !summary) {
      $("verdict").textContent = "LinkLens cannot read this page (browser pages and the Web Store are off limits).";
      return;
    }
    render(summary);
  });
});

chrome.storage.sync.get(DEFAULTS, (stored) => {
  const s = { ...DEFAULTS, ...stored } as typeof DEFAULTS;
  for (const key of Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]) {
    const box = $<HTMLInputElement>(key);
    box.checked = s[key];
    box.addEventListener("change", () => {
      s[key] = box.checked;
      chrome.storage.sync.set({ [key]: box.checked });
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "linklens:settings", settings: { [key]: box.checked } });
      });
    });
  }
});
