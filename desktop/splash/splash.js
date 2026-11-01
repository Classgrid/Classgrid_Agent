// Plays the welcome screen (splash.html), starts the app (window.cgStartApp, from main.js) and fades the screen away
// once the app has drawn itself. GSAP runs the opening; Framer Motion lands the logo with a spring and plays the
// loops and the exit on the graphics card, so they stay smooth while the app starts behind them.
// Built into app/cg-splash.js by scripts/build-client.mjs.
import { gsap } from "gsap";
import { animate } from "framer-motion/dom";

const EASE = [0.22, 1, 0.36, 1];
const MIN_SHOW = 7500; // the welcome screen stays at least this long (ms), even when the app is ready sooner
const el = document.getElementById("cg-splash");
if (el) {
  window.cgSplashOn = true;
  play(el);
} else {
  window.cgStartApp?.();
}

async function play(el) {
  const $ = (s) => el.querySelector(s);
  let theme = "system";
  try { theme = localStorage.getItem("vite-ui-theme") || "system"; } catch { /* storage blocked */ }
  if (theme === "light" || (theme === "system" && matchMedia("(prefers-color-scheme: light)").matches)) el.classList.add("light");

  const word = $(".cg-word");
  word.innerHTML = [...word.textContent].map((c) => `<span>${c}</span>`).join("");
  const letters = word.querySelectorAll("span");
  const opened = performance.now();

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set([$(".cg-logo"), $(".cg-grid"), $(".cg-glow"), $(".cg-line"), $(".cg-hint")], { opacity: 1 });
    gsap.set(letters, { y: 0, opacity: 1 });
    return start(el, opened);
  }

  // The name is in Sora; wait a moment for it so the letters don't change shape while they rise
  await Promise.race([document.fonts?.load("600 46px Sora").catch(() => {}), new Promise((r) => setTimeout(r, 400))]);

  // Framer Motion: the logo lands with a spring
  animate($(".cg-logo"), { opacity: [0, 1], scale: [0.55, 1], filter: ["blur(16px)", "blur(0px)"] }, { type: "spring", stiffness: 140, damping: 16, delay: 0.05 });

  // GSAP: the grid and light come up, then the name, the line and the words
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  tl.to($(".cg-grid"), { opacity: 1, duration: 1.8, ease: "power2.out" }, 0)
    .fromTo($(".cg-glow"), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 2 }, 0)
    .to(letters, { y: 0, opacity: 1, duration: 1, stagger: 0.045 }, 0.42)
    .to($(".cg-line"), { opacity: 1, duration: 0.6, ease: "power2.out" }, 0.95)
    .to($(".cg-hint"), { opacity: 1, duration: 0.8, ease: "power2.out" }, 1.1)
    .call(() => start(el, opened), [], 1.2);

  // Framer Motion: the line fills over the welcome time with a light sweeping along it, and the glow breathing
  animate($(".cg-line b"), { transform: ["scaleX(0)", "scaleX(1)"] }, { duration: (MIN_SHOW - 1000) / 1000, ease: [0.3, 0.1, 0.2, 1], delay: 0.95 });
  animate($(".cg-line i"), { transform: ["translateX(-110%)", "translateX(230%)"] }, { duration: 1.4, ease: "easeInOut", repeat: Infinity, delay: 1 });
  animate($(".cg-glow"), { transform: ["scale(1)", "scale(1.08)"] }, { duration: 3.2, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", delay: 2.1 });
}

// Starts the app, then waits until it has replaced its loading skeleton (#app-splash) with real screens
function start(el, opened) {
  window.cgStartApp?.();
  const began = performance.now();
  const ready = () => !document.getElementById("app-splash") && document.getElementById("root")?.childElementCount;
  const wait = () => {
    if (ready() || performance.now() - began > 20000) {
      const rest = Math.max(0, opened + MIN_SHOW - performance.now());
      setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => leave(el))), rest);
    } else {
      setTimeout(wait, 50);
    }
  };
  wait();
}

function leave(el) {
  el.style.pointerEvents = "none";
  animate(el.querySelector(".cg-stack"), { scale: [1, 1.06], filter: ["blur(0px)", "blur(10px)"] }, { duration: 0.6, ease: EASE });
  animate(el, { opacity: [1, 0] }, { duration: 0.6, ease: EASE }).then(() => el.remove());
}
