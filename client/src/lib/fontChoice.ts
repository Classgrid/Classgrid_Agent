// The font style picked in Settings > General > Font (owner, 2026-11-15: "add all 4 inside settings, I will choose",
// on the website and the desktop app, as on the phone). Kept in this browser (localStorage) and applied as
// <html data-font="…"> before the first paint; styles/global.css sets the fonts for each choice.
//
//   default  Sora headings + DM Sans text (the phone app's look)
//   web      Sora headings + the device's own font for text (the website's look until now, so it is what you get
//            until you pick another)
//   system   the device's own font everywhere, headings too
//   serif    Newsreader everywhere (the book-style font of the new-chat greeting)

export type FontChoice = "default" | "web" | "system" | "serif";

export const FONT_CHOICES: { id: FontChoice; label: string; hint: string }[] = [
  { id: "default", label: "Default", hint: "Sora headings, DM Sans text (like the phone app)" },
  { id: "web", label: "Web", hint: "Sora headings, your device's font for text" },
  { id: "system", label: "System", hint: "Your device's own font everywhere" },
  { id: "serif", label: "Serif", hint: "Newsreader, a book-style font" },
];

const KEY = "classgrid:font";
const FALLBACK: FontChoice = "web";
const isChoice = (v: unknown): v is FontChoice => FONT_CHOICES.some((c) => c.id === v);

export function getFontChoice(): FontChoice {
  try {
    const saved = localStorage.getItem(KEY);
    return isChoice(saved) ? saved : FALLBACK;
  } catch {
    return FALLBACK; // storage blocked: the website's own look
  }
}

export function applyFontChoice(choice: FontChoice = getFontChoice()) {
  document.documentElement.dataset.font = choice;
}

export function setFontChoice(choice: FontChoice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
  applyFontChoice(choice);
}
