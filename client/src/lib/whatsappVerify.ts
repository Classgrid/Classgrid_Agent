// Verifying a WhatsApp number (sign-up's optional step, and Settings > Verify WhatsApp number).
// Meta only lets Classgrid send the code to someone who messaged its number in the last 24 hours, so the person sends
// a first message. That message says which Classgrid they are on ("Hi Classgrid Web" / "Hi Classgrid Desktop"; the
// phone app sends "Hi Classgrid App"), so the reply on WhatsApp names the right place to go back to (the help bot,
// lib/whatsapp/login-help-bot.ts in the website's repo).

export const WHATSAPP_HELP_NUMBER = "918149277038";
export const WHATSAPP_HELP_NUMBER_SHOWN = "+91 81492 77038";

const onDesktopApp = import.meta.env.VITE_DESKTOP === "1";

/** The first message the person sends: "Hi Classgrid Desktop" in the desktop app, "Hi Classgrid Web" on the website. */
export const WHATSAPP_HELLO_TEXT = onDesktopApp ? "Hi Classgrid Desktop" : "Hi Classgrid Web";

/** Opens WhatsApp on Classgrid's number with the first message typed in. */
export const whatsappHelloLink = () => `https://wa.me/${WHATSAPP_HELP_NUMBER}?text=${encodeURIComponent(WHATSAPP_HELLO_TEXT)}`;

/** "919876543210" from what was typed: spaces, + and dashes dropped; a bare 10-digit number is taken as India (+91). */
export function normalizeWhatsappInput(raw: string): string | null {
  const digits = String(raw || "").replace(/[\s+\-()]/g, "");
  if (!digits || !/^\d+$/.test(digits) || digits.length < 10 || digits.length > 15) return null;
  return digits.length === 10 ? `91${digits}` : digits;
}
