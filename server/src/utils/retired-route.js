// An address of the old product that reached an AI model with no plan check, no limit and no charge, and that no
// Classgrid app uses any more (the website, the desktop app, Classgrid Code, the extension and the phone app were all
// searched on 2026-11-21: none calls it). It answered any signed-in person, so someone at 100 percent of their
// session could still get answers from a model through it, as many as they liked (owner, that day: "fix it right
// now"). Placed in front of the old handler, which is left as it was and no longer runs: the address now answers
// 410 Gone and reaches no model.
export function retiredAiRoute(req, res) {
    res.status(410).json({ error: "This is no longer available.", code: "gone" });
}
