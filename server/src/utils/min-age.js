// Classgrid is for adults: 18 and over (owner, 2026-11-25: "our app is not for below 18, you allow anyone to use it,
// fix that"). The sign-up screens asked for an age of 13 or more and the server took whatever it was sent.
//
// The screens (website, desktop app, phone app) now ask for 18, and the server refuses a younger age itself, so a
// screen that still has the old number (an app not updated yet) cannot let a younger person finish signing up.
// An account made before this day is not touched here.

/** The youngest age that may have a Classgrid account */
export const MIN_AGE = 18;
/** Above this an age is a typing mistake */
export const MAX_AGE = 120;

/** An age was sent at all (a sign-up step that does not ask for the age sends none) */
export const ageGiven = (age) => age !== undefined && age !== null && String(age).trim() !== "";

/** Why this age cannot sign up, as the sentence the person sees; "" when it can */
export function ageProblem(age) {
    const n = Number(String(age ?? "").trim());
    if (!ageGiven(age) || !Number.isInteger(n) || n <= 0 || n > MAX_AGE) return "Please enter a valid age.";
    if (n < MIN_AGE) return `You need to be ${MIN_AGE} or older to use Classgrid.`;
    return "";
}
