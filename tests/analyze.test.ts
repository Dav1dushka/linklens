import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeLink, domainInText, editDistance, registrableDomain, skeleton } from "../src/analyze";
import { decode, toUnicodeLabel } from "../src/punycode";

const ids = (href: string, text = "") => analyzeLink(href, text).findings.map((f) => f.id);
const level = (href: string, text = "") => analyzeLink(href, text).level;

test("punycode decoding (RFC 3492 sample strings)", () => {
  assert.equal(decode("mnchen-3ya"), "münchen");
  assert.equal(decode("e1afmkfd"), "пример");
  assert.equal(decode("80ak6aa92e"), "аррӏе");                   // the famous all-Cyrillic "apple"
  assert.equal(toUnicodeLabel("xn--pypal-4ve"), "pаypal");     // Cyrillic а
  assert.equal(toUnicodeLabel("example"), "example");
  assert.equal(toUnicodeLabel("xn--!!"), "xn--!!");               // invalid stays as-is
});

test("helpers", () => {
  assert.equal(skeleton("pаypa1"), "paypal");
  assert.equal(skeleton("rnicrosoft"), "microsoft");
  assert.equal(editDistance("amazon", "arnazon"), 2);
  assert.equal(registrableDomain("login.secure.example.co.uk"), "example.co.uk");
  assert.equal(registrableDomain("a.b.paypal.com"), "paypal.com");
  assert.equal(domainInText("Log in at https://www.PayPal.com/signin"), "paypal.com");
  assert.equal(domainInText("Click here"), null);
});

test("legitimate links stay quiet", () => {
  for (const href of ["https://www.paypal.com/signin", "https://accounts.google.com/", "https://github.com/Dav1dushka",
    "https://en.wikipedia.org/wiki/Phishing", "https://www.amazon.co.uk/gp/cart"]) {
    assert.equal(level(href), "ok", href);
  }
  assert.deepEqual(ids("mailto:someone@example.com"), []);
});

test("homoglyph domain imitating a brand", () => {
  const a = analyzeLink("https://xn--pypal-4ve.com/login");
  assert.equal(a.displayHost, "pаypal.com");
  assert.ok(a.findings.some((f) => f.id === "homoglyph"));
  assert.equal(a.level, "danger");
});

test("whole-script Cyrillic look-alike", () => {
  const a = analyzeLink("https://xn--80ak6aa92e.com/");
  assert.equal(a.displayHost, "аррӏе.com");
  assert.ok(a.findings.some((f) => f.id === "homoglyph" && f.title.includes("Apple")));
});

test("typosquatting and digit swaps", () => {
  assert.ok(ids("https://paypa1.com").includes("lookalike"));
  assert.ok(ids("https://arnazon.com").includes("lookalike"));
  assert.ok(ids("https://micros0ft.com/account").includes("lookalike"));
  assert.ok(ids("https://amazom.com").includes("lookalike"));
  assert.ok(ids("https://appie.com").includes("lookalike"));
  assert.ok(!ids("https://apples.com").includes("lookalike"));     // an extra letter on a short name is a real word
});

test("brand used on someone else's domain", () => {
  assert.ok(ids("https://paypal-secure-login.xyz").includes("brand-in-name"));
  assert.ok(ids("https://paypal.com.account-check.net/").includes("brand-in-subdomain"));
  assert.ok(ids("https://micros0ft-login.com/oauth").includes("brand-in-name"));   // digit swap inside a longer name
  assert.ok(ids("https://g00gle.account.example/").includes("brand-in-subdomain"));
  assert.equal(level("https://paypal.com.account-check.net/"), "danger");
});

test("tricks in the URL itself", () => {
  assert.ok(ids("https://www.google.com@evil.example/").includes("userinfo"));
  assert.ok(ids("http://192.0.2.10/bank/login").includes("ip-host"));
  assert.ok(ids("javascript:alert(1)").includes("script-url"));
  assert.ok(ids("https://bit.ly/3abcd").includes("shortener"));
  assert.ok(ids("http://example.com").includes("no-https"));
  assert.ok(ids("https://example.com:8443/").includes("port"));
});

test("link text that lies about the destination", () => {
  const a = analyzeLink("https://evil.example/paypal", "https://www.paypal.com/myaccount");
  assert.ok(a.findings.some((f) => f.id === "text-mismatch"));
  assert.equal(a.level, "danger");
  assert.ok(!ids("https://help.github.com/x", "github.com").includes("text-mismatch")); // subdomain of the same site
});

test("relative links resolve against the page", () => {
  const a = analyzeLink("/account", "", "www.paypal.com");
  assert.equal(a.registrable, "paypal.com");
  assert.equal(a.level, "ok");
});

test("score is capped and levels are ordered", () => {
  const worst = analyzeLink("http://paypal.com.verify-account.xyz:8080/login", "https://paypal.com");
  assert.equal(worst.score, 100);
  assert.equal(worst.level, "danger");
  assert.equal(level("https://shop.example.top/"), "ok");          // one minor sign is not an alarm
  assert.equal(level("http://shop.example.top/"), "caution");
});
