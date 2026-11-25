/** Demo page: the same hover logic as the extension, plus a playground. */
import { analyzeLink } from "./analyze";
import { CARD_CSS, cardHtml } from "./card";
import { attachHover, scanLinks } from "./hover";

const inbox = document.getElementById("inbox")!;
attachHover(inbox, { pageHost: "mail.example", showSafe: true });
scanLinks(inbox, "mail.example", true);
inbox.addEventListener("click", (e) => {
  if ((e.target as Element).closest("a")) {
    e.preventDefault(); // demo links never open
    const note = document.getElementById("blocked")!;
    note.hidden = false;
    setTimeout(() => (note.hidden = true), 2200);
  }
});

// Playground: type any link and see the card that LinkLens would show.
const url = document.getElementById("pg-url") as HTMLInputElement;
const text = document.getElementById("pg-text") as HTMLInputElement;
const host = document.getElementById("pg-card")!;
const root = host.attachShadow({ mode: "open" });
root.innerHTML = `<style>${CARD_CSS}
.card { position: static; opacity: 1; transform: none; width: 100%; max-width: none; box-shadow: none; }</style>
<div class="card on" aria-live="polite"></div>`;
const card = root.querySelector(".card")!;

function update() {
  const value = url.value.trim();
  if (!value) {
    card.innerHTML = `<div class="host">Type or paste a link above.</div>`;
    return;
  }
  const href = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  card.innerHTML = cardHtml(analyzeLink(href, text.value));
}
url.addEventListener("input", update);
text.addEventListener("input", update);
document.querySelectorAll<HTMLButtonElement>("[data-try]").forEach((b) =>
  b.addEventListener("click", () => {
    url.value = b.dataset.try!;
    text.value = b.dataset.text ?? "";
    update();
  }),
);
update();
