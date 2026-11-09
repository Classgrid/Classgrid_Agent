// A picture on this computer is made small enough right here to go to the AI in one message. Before, a picture up to
// 3.5 MB went to the server in 512 KB pieces, one round trip each (2026-11-09: a phone photo took seven), and the AI
// models look at pictures at about 1600 px anyway, so nothing the AI could read is lost. In the Classgrid app the
// app's own image tools do it (Electron); in Classgrid Code, which has no Electron, Windows' own imaging
// (System.Drawing through PowerShell) does, like pdfpages.js draws PDF pages.
const { spawn } = require("node:child_process");
const path = require("node:path");

const ONE_STEP_BYTES = 500 * 1024; // fits one socket message as base64 (the connection takes 1 MB per message)
// Longest side and JPEG quality to try, in order, until the picture fits
const STEPS = [[1600, 82], [1200, 72], [900, 65]];

const SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($env:CG_IMG)
$max = [int]$env:CG_MAX
$scale = [Math]::Min(1, $max / [Math]::Max($img.Width, $img.Height))
$w = [Math]::Max(1, [int][Math]::Round($img.Width * $scale)); $h = [Math]::Max(1, [int][Math]::Round($img.Height * $scale))
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $w, $h)
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]$env:CG_QUALITY)
$out = New-Object System.IO.MemoryStream
$bmp.Save($out, $jpeg, $params)
[Console]::Out.WriteLine([Convert]::ToBase64String($out.ToArray()))
`;

// The Classgrid app: Electron's own image tools (PNG and JPEG pictures)
function withElectron(buf, ext) {
  let nativeImage = null;
  try { nativeImage = require("electron").nativeImage; } catch { /* not inside the app */ }
  if (!nativeImage?.createFromBuffer) return null;
  const img = nativeImage.createFromBuffer(buf);
  if (!img || img.isEmpty()) return null;
  const { width, height } = img.getSize();
  for (const [max, quality] of STEPS) {
    const scale = Math.min(1, max / Math.max(width, height));
    const small = scale < 1 ? img.resize({ width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), quality: "good" }) : img;
    if (ext === ".png" && max === STEPS[0][0]) {
      const png = small.toPNG(); // (a drawing or a screenshot stays sharp as PNG when that is small enough)
      if (png.length <= ONE_STEP_BYTES) return { buf: png, mime: "image/png" };
    }
    const jpg = small.toJPEG(quality);
    if (jpg.length <= ONE_STEP_BYTES) return { buf: jpg, mime: "image/jpeg" };
  }
  return null;
}

// Classgrid Code (no Electron): Windows' own imaging. PNG, JPEG, GIF (its first picture) and BMP; not WebP.
function withWindows(file, max, quality) {
  return new Promise((resolve, reject) => {
    const p = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", Buffer.from(SCRIPT, "utf16le").toString("base64")], {
      windowsHide: true,
      env: { ...process.env, CG_IMG: path.resolve(file), CG_MAX: String(max), CG_QUALITY: String(quality) },
    });
    let out = "", err = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    const timer = setTimeout(() => { try { p.kill(); } catch { /* gone */ } reject(new Error("the picture took too long to make smaller")); }, 60000);
    p.on("error", (e) => { clearTimeout(timer); reject(e); });
    p.on("close", () => {
      clearTimeout(timer);
      const b64 = out.trim().split(/\r?\n/).pop() || "";
      if (!b64 || !/^[A-Za-z0-9+/=]+$/.test(b64)) return reject(new Error(err.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || "the picture couldn't be made smaller"));
      resolve(Buffer.from(b64, "base64"));
    });
  });
}

/** { buf, mime } small enough for one message, or null when this picture can't be made smaller here. */
async function shrinkPicture(file, buf, ext) {
  const fromApp = withElectron(buf, ext);
  if (fromApp) return fromApp;
  if (ext === ".webp") return null;
  for (const [max, quality] of STEPS) {
    const jpg = await withWindows(file, max, quality);
    if (jpg.length <= ONE_STEP_BYTES) return { buf: jpg, mime: "image/jpeg" };
  }
  return null;
}

module.exports = { shrinkPicture, ONE_STEP_BYTES };
