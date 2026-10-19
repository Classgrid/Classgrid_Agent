/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef } from "react";
import createGlobe from "cobe";
import { cn } from "@/lib/utils";

const GLOBE_SCALE = 1.06;
const GLOBE_RADIUS = 1200 * (0.8 * GLOBE_SCALE / 2);
const graphitePalette = {
  highlight: "#2A2D31",
  base: "#171717",
  shadow: "#1D2024",
};
const hexToRgb = (hex) => {
  const value = hex.replace("#", "");

  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
};
const globeBaseTint = hexToRgb(graphitePalette.base).map((channel) => channel * 9.85);

export const Globe = ({ className, showLabel = false }) => {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  // Maharashtra (Pune, inland India)
  const HQ_LAT = 18.5204;
  const HQ_LON = 73.8567;

  useEffect(() => {
    let currentPhi = 0; // Start facing India

    // Setup 2D overlay canvas for text labels
    const overlay = overlayRef.current;
    const ctx = overlay.getContext('2d');
    overlay.width = 1200; // match cobe's internal resolution
    overlay.height = 1200;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0.15,
      dark: 1,
      diffuse: 1.18,
      scale: GLOBE_SCALE,
      mapSamples: 16000,
      mapBrightness: 3.45,
      mapBaseBrightness: 0,
      baseColor: globeBaseTint,
      markerColor: [1, 1, 1],
      glowColor: [0.82, 0.82, 0.82],
      markers: [],
      onRender: (state) => {
        currentPhi += 0.005;
        state.phi = currentPhi;
        state.theta = 0;

        // Clear overlay
        ctx.clearRect(0, 0, 1200, 1200);

        const projectLocation = ([lat, lon]) => {
          // Exact reverse-engineered projection from Cobe's internal GLSL shader
          const PI = Math.PI;
          const latRad = lat * (PI / 180);
          const lonRad = (lon * (PI / 180)) - PI; // cobe subtracts PI internally

          // Cobe's local point vector
          const sx = -Math.cos(latRad) * Math.cos(lonRad);
          const sy = Math.sin(latRad);
          const sz = Math.cos(latRad) * Math.sin(lonRad);

          const cosPhi = Math.cos(state.phi);
          const sinPhi = Math.sin(state.phi);
          const cosTheta = Math.cos(state.theta);
          const sinTheta = Math.sin(state.theta);

          // Inverse of Cobe's mat3 J(theta, phi) rotation matrix applied to the local point
          const fx = sx * cosPhi + sz * sinPhi;
          const fy = sx * (sinPhi * sinTheta) + sy * cosTheta + sz * (-cosPhi * sinTheta);
          const fz = sx * (-sinPhi * cosTheta) + sy * sinTheta + sz * (cosPhi * cosTheta);

          return {
            x: 600 + fx * GLOBE_RADIUS,
            y: 600 - fy * GLOBE_RADIUS,
            z: fz,
          };
        };

        // Only draw the label when requested; keep the old label logic available.
        const { x: cx, y: cy, z: fz } = projectLocation([HQ_LAT, HQ_LON]);
        if (showLabel && fz > 0.05) {
          // Draw label background
          const text = "MAHARASHTRA";
          ctx.font = "bold 22px 'Inter', sans-serif";
          const metrics = ctx.measureText(text);
          const textWidth = metrics.width;
          const textHeight = 22;
          const padX = 10;
          const padY = 6;
          const boxW = textWidth + padX * 2;
          const boxH = textHeight + padY * 2;
          const boxX = cx - boxW / 2;
          const boxY = cy - boxH - 16; // Position above the dot

          // Pointer line from label to dot
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 4);
          ctx.lineTo(cx, boxY + boxH);
          ctx.stroke();

          // White background box
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, 4);
          ctx.fill();

          // Text
          ctx.fillStyle = 'black';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, cx, boxY + boxH / 2);
        }
      },
    });

    return () => {
      globe.destroy();
    };
  }, [showLabel]);

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{
        width: 650,
        height: 650,
        maxWidth: "100%",
        maxHeight: "100%",
        isolation: "isolate",
      }}
    >
      {/* 2D Canvas overlay for labels — exact same pixel space as cobe */}
      <canvas
        ref={overlayRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: "100%",
          height: "100%",
          aspectRatio: 1,
          pointerEvents: 'none',
          zIndex: 30,
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          aspectRatio: 1,
          pointerEvents: "none",
        }}
        className="opacity-100 z-10 pointer-events-none"
      />
    </div>
  );
};

export default Globe;
