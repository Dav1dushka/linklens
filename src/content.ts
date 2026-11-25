/** Content script: runs on every page the user visits. Nothing leaves the browser. */
import { attachHover, scanLinks } from "./hover";

interface Settings { highlight: boolean; showSafe: boolean }
const DEFAULTS: Settings = { highlight: true, showSafe: false };

chrome.storage.sync.get({ ...DEFAULTS }, (stored) => {
  const settings = { ...DEFAULTS, ...(stored as Partial<Settings>) };
  const pageHost = location.hostname;
  attachHover(document, { pageHost, showSafe: settings.showSafe });

  let pending = 0;
  const rescan = () => {
    if (pending) return;
    pending = window.setTimeout(() => {
      pending = 0;
      scanLinks(document, pageHost, settings.highlight);
    }, 600);
  };
  rescan();
  new MutationObserver(rescan).observe(document.documentElement, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.type === "linklens:scan") reply(scanLinks(document, pageHost, settings.highlight));
    if (msg?.type === "linklens:settings") {
      Object.assign(settings, msg.settings as Partial<Settings>);
      scanLinks(document, pageHost, settings.highlight);
    }
    return false;
  });
});
