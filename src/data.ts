/** Frequently impersonated brands and the domains they really own. */
export interface Brand {
  name: string;
  label: string;     // the part a phisher imitates
  domain: string;    // main domain, for messages
  domains: string[]; // every legitimate registrable domain
}

const b = (name: string, label: string, ...domains: string[]): Brand => ({ name, label, domain: domains[0], domains });

export const BRANDS: Brand[] = [
  b("PayPal", "paypal", "paypal.com", "paypal.me", "paypalobjects.com"),
  b("Google", "google", "google.com", "google.it", "google.co.uk", "googleusercontent.com"),
  b("Gmail", "gmail", "gmail.com"),
  b("Microsoft", "microsoft", "microsoft.com", "microsoftonline.com", "live.com", "office.com", "outlook.com"),
  b("Outlook", "outlook", "outlook.com", "live.com", "office.com"),
  b("Apple", "apple", "apple.com", "icloud.com"),
  b("iCloud", "icloud", "icloud.com", "apple.com"),
  b("Amazon", "amazon", "amazon.com", "amazon.it", "amazon.de", "amazon.co.uk", "amazonaws.com"),
  b("Facebook", "facebook", "facebook.com", "fb.com", "fbcdn.net"),
  b("Instagram", "instagram", "instagram.com"),
  b("WhatsApp", "whatsapp", "whatsapp.com"),
  b("Netflix", "netflix", "netflix.com"),
  b("GitHub", "github", "github.com", "github.io", "githubusercontent.com"),
  b("LinkedIn", "linkedin", "linkedin.com"),
  b("Dropbox", "dropbox", "dropbox.com"),
  b("Steam", "steampowered", "steampowered.com", "steamcommunity.com"),
  b("Steam Community", "steamcommunity", "steamcommunity.com", "steampowered.com"),
  b("Binance", "binance", "binance.com"),
  b("Coinbase", "coinbase", "coinbase.com"),
  b("Telegram", "telegram", "telegram.org", "t.me"),
  b("Discord", "discord", "discord.com", "discord.gg", "discordapp.com"),
  b("Spotify", "spotify", "spotify.com"),
  b("Roblox", "roblox", "roblox.com"),
  b("Epic Games", "epicgames", "epicgames.com"),
  b("DHL", "dhl", "dhl.com", "dhl.it", "dhl.de"),
  b("FedEx", "fedex", "fedex.com"),
  b("Poste Italiane", "poste", "poste.it", "posteitaliane.it"),
  b("Intesa Sanpaolo", "intesasanpaolo", "intesasanpaolo.com"),
  b("PrivatBank", "privatbank", "privatbank.ua"),
  b("Monobank", "monobank", "monobank.ua"),
];

export const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rb.gy", "ow.ly", "s.id", "shorturl.at",
  "tiny.cc", "buff.ly", "rebrand.ly", "t.ly", "bl.ink", "short.io",
]);

export const SUSPICIOUS_TLDS = new Set([
  "zip", "mov", "xyz", "top", "click", "link", "work", "rest", "fit", "gq", "tk", "ml", "cf", "ga", "country",
  "kim", "support", "icu", "cam", "buzz",
]);

/** A tiny slice of the Public Suffix List: enough for common two-level endings. */
export const TWO_LEVEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au", "co.jp", "co.nz", "com.br", "com.ua",
  "co.in", "com.tr", "co.za", "com.mx", "com.cn", "com.ar", "co.kr", "com.pl", "gov.it", "edu.it",
]);
