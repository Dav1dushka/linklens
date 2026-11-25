/**
 * Link analysis: pure functions, no DOM, no browser APIs.
 * Given a link's href and its visible text, list the warning signs a careful
 * person would check before clicking, and turn them into a risk level.
 */
import { BRANDS, SHORTENERS, SUSPICIOUS_TLDS, TWO_LEVEL_SUFFIXES } from "./data";
import { toUnicodeLabel } from "./punycode";

export type Severity = "info" | "warn" | "danger";
export type Level = "ok" | "caution" | "danger";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface Analysis {
  href: string;
  /** Host as a person would read it (punycode decoded). */
  displayHost: string;
  /** "example.co.uk" for "login.example.co.uk". */
  registrable: string;
  score: number;
  level: Level;
  findings: Finding[];
}

const WEIGHT: Record<Severity, number> = { info: 8, warn: 22, danger: 45 };

// Letters from other scripts that look like Latin ones, plus digit swaps.
const CONFUSABLE: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j", "ѕ": "s",
  "ԁ": "d", "ӏ": "l", "ԛ": "q", "ԝ": "w", "һ": "h", "ɡ": "g", "α": "a", "ο": "o", "ν": "v", "ρ": "p",
  "τ": "t", "κ": "k", "ı": "i", "ɩ": "i", "0": "o", "1": "l", "3": "e", "5": "s", "@": "a",
};

/** Map look-alike characters to the Latin letter they imitate ("pаypa1" -> "paypal"). */
export function skeleton(label: string): string {
  let out = "";
  for (const ch of label.toLowerCase()) out += CONFUSABLE[ch] ?? ch;
  return out.replace(/rn/g, "m").replace(/vv/g, "w");
}

export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Best effort "registrable domain" using a small list of two-level suffixes. */
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  const take = TWO_LEVEL_SUFFIXES.has(lastTwo) ? 3 : 2;
  return labels.slice(-take).join(".");
}

const scriptOf = (ch: string): string =>
  /[a-z]/i.test(ch) ? "latin" : /[Ѐ-ӿ]/.test(ch) ? "cyrillic" : /[Ͱ-Ͽ]/.test(ch) ? "greek" : "other";

function isIpHost(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[") || /^0x[0-9a-f]+$/i.test(host) || /^\d+$/.test(host);
}

/** Pull a domain out of link text like "Go to paypal.com/account" or "https://www.paypal.com". */
export function domainInText(text: string): string | null {
  const m = text.trim().toLowerCase().match(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/:?#]|\s|$)/);
  return m ? m[1].replace(/^www\./, "") : null;
}

export function analyzeLink(href: string, text = "", pageHost = ""): Analysis {
  const findings: Finding[] = [];
  const add = (id: string, severity: Severity, title: string, detail: string) =>
    findings.push({ id, severity, title, detail });

  let url: URL;
  try {
    url = new URL(href, pageHost ? `https://${pageHost}/` : undefined);
  } catch {
    return { href, displayHost: "", registrable: "", score: 0, level: "ok", findings: [] };
  }

  if (url.protocol === "javascript:" || url.protocol === "data:") {
    add("script-url", "danger", "Runs code instead of opening a page",
      `This ${url.protocol.slice(0, -1)}: link executes or embeds content directly.`);
    return finish(href, "", "", findings);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { href, displayHost: "", registrable: "", score: 0, level: "ok", findings: [] }; // mailto:, tel:, ...
  }

  const host = url.hostname.toLowerCase();
  const labels = host.split(".");
  const unicodeLabels = labels.map(toUnicodeLabel);
  const displayHost = unicodeLabels.join(".");
  const registrable = registrableDomain(host);
  const regLabel = registrable.split(".")[0];
  const regUnicode = toUnicodeLabel(regLabel);
  const tld = labels[labels.length - 1];

  if (url.username || url.password || /@/.test(href.split("?")[0].replace(/^[a-z]+:\/\//i, "").split("/")[0])) {
    add("userinfo", "danger", "Text before an @ hides the real site",
      `Everything before "@" is ignored: this link really goes to ${displayHost}.`);
  }

  if (isIpHost(host)) {
    add("ip-host", "danger", "Points to a raw IP address", "Real companies use domain names, not bare IP addresses.");
  }

  // Internationalised (punycode) names that imitate Latin ones.
  if (labels.some((l) => l.startsWith("xn--"))) {
    const scripts = new Set([...regUnicode].filter((c) => /\p{L}/u.test(c)).map(scriptOf));
    const brand = BRANDS.find((b) => skeleton(regUnicode) === b.label);
    if (brand) {
      const odd = [...new Set([...regUnicode].filter((c) => c.charCodeAt(0) > 127))];
      const which = odd.length === 1 ? `The letter "${odd[0]}" is not Latin` : `The letters ${odd.join(" ")} are not Latin`;
      add("homoglyph", "danger", `Imitates ${brand.name} with look-alike letters`,
        `${which}: the real address is ${host}, not ${brand.domain}.`);
    } else if (scripts.size > 1) {
      add("mixed-script", "danger", "Mixes alphabets in one name",
        `"${regUnicode}" combines ${[...scripts].join(" and ")} letters, a common disguise.`);
    } else {
      add("idn", "info", "International domain name", `Shown as "${displayHost}", encoded as "${host}".`);
    }
  }

  // Typosquatting and brand impersonation (ASCII names).
  const legit = BRANDS.find((b) => b.domains.includes(registrable));
  if (!legit && !isIpHost(host)) {
    const sk = skeleton(regLabel);
    const typo = BRANDS.find((b) => {
      if (sk === b.label && regLabel !== b.label) return true;                    // paypa1, g00gle
      const d = editDistance(regLabel, b.label);
      if (d === 0 || b.label.length < 5) return false;
      if (b.label.length >= 9) return d <= 2;                                      // micorsotf
      if (b.label.length >= 6) return d === 1;                                     // amazom, paypai
      return d === 1 && regLabel.length === b.label.length;                        // appie, but not apples
    });
    if (typo && !findings.some((f) => f.id === "homoglyph")) {
      add("lookalike", "danger", `Looks like ${typo.name}, but is not`,
        `"${registrable}" is one or two characters away from ${typo.domain}.`);
    } else {
      const inName = BRANDS.find((b) => b.label.length >= 4 && sk.includes(b.label));
      const inSub = BRANDS.find((b) => b.label.length >= 4 && labels.slice(0, -registrable.split(".").length)
        .some((l) => skeleton(l).includes(b.label)));
      if (inName) {
        const disguised = !regLabel.includes(inName.label);
        add("brand-in-name", "danger",
          disguised ? `Disguised ${inName.name} name` : `Uses the ${inName.name} name on someone else's domain`,
          `${registrable} is not owned by ${inName.name} (${inName.domain}).`);
      } else if (inSub) {
        add("brand-in-subdomain", "danger", `"${inSub.name}" is only a subdomain here`,
          `The site is really ${registrable}; "${inSub.label}" is just a prefix anyone can add.`);
      }
    }
  }

  // Link text promises one site, href goes to another.
  const shown = domainInText(text);
  if (shown && registrableDomain(shown) !== registrable && !shown.endsWith("." + registrable)) {
    add("text-mismatch", "danger", "The text and the destination differ",
      `It says ${shown}, but opens ${displayHost}.`);
  }

  if (SHORTENERS.has(registrable)) {
    add("shortener", "warn", "Shortened link hides the destination", `${registrable} redirects somewhere you cannot see yet.`);
  }
  if (url.protocol === "http:") {
    add("no-https", "warn", "Not encrypted (http)", "Anything typed on this page can be read or changed on the way.");
  }
  if (SUSPICIOUS_TLDS.has(tld)) {
    add("tld", "info", `Unusual ending: .${tld}`, `.${tld} domains are cheap and often used for throwaway phishing sites.`);
  }
  if (labels.length >= 5) {
    add("deep-subdomains", "info", "Very long chain of subdomains", "Long hostnames push the real domain out of view.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    add("port", "info", `Unusual port :${url.port}`, "Normal websites do not need a port number in the link.");
  }
  if (!legit && /(log-?in|sign-?in|verify|account|secure|update|wallet|password)/i.test(url.pathname + host)) {
    add("bait-words", "info", "Login or verification words", "Phishing links often promise an urgent account check.");
  }

  return finish(href, displayHost, registrable, findings);
}

function finish(href: string, displayHost: string, registrable: string, findings: Finding[]): Analysis {
  const score = Math.min(100, findings.reduce((s, f) => s + WEIGHT[f.severity], 0));
  const level: Level = findings.some((f) => f.severity === "danger") || score >= 60 ? "danger" : score >= 20 ? "caution" : "ok";
  return { href, displayHost, registrable, score, level, findings };
}
