// A scanned PDF (pictures of pages, no text inside) is turned into page pictures right here, with Windows' own PDF
// engine (Windows.Data.Pdf), so the AI gets small page pictures instead of the server getting the whole PDF first.
// Works in the Classgrid app and in Classgrid Code (no Electron needed). Pictures are made small (JPEG) so one step
// stays under the connection's 1 MB per message; the AI asks for the next pages with start_page.
const { spawn } = require("node:child_process");

const WIDTH = 1000; // wide enough to read the text on a page
const QUALITY = 50;
const MAX_PAGES = 20;
const BUDGET = 640 * 1024; // picture bytes per step (sent as text, a third bigger: under the 1 MB message limit)

const SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing
$ext = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asOp = $ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation${"`"}1' } | Select-Object -First 1
$asAct = $ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } | Select-Object -First 1
function Await($op, [Type]$t) { $task = $asOp.MakeGenericMethod($t).Invoke($null, @($op)); try { [void]$task.Wait(-1) } catch { throw ($task.Exception.InnerException.Message) }; $task.Result }
function AwaitAct($op) { $task = $asAct.Invoke($null, @($op)); try { [void]$task.Wait(-1) } catch { throw ($task.Exception.InnerException.Message) } }
[void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]$env:CG_QUALITY)
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($env:CG_PDF)) ([Windows.Storage.StorageFile])
$doc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
[Console]::Out.WriteLine("PAGES $($doc.PageCount)")
$first = [int]$env:CG_FIRST; $last = [Math]::Min([int]$doc.PageCount, $first + [int]$env:CG_COUNT)
$budget = [int]$env:CG_BUDGET; $used = 0
for ($i = $first; $i -lt $last; $i++) {
  $page = $doc.GetPage($i)
  $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opts.DestinationWidth = [uint32]$env:CG_WIDTH
  $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  AwaitAct ($page.RenderToStreamAsync($stream, $opts))
  $reader = New-Object Windows.Storage.Streams.DataReader ($stream.GetInputStreamAt(0))
  [void](Await ($reader.LoadAsync([uint32]$stream.Size)) ([uint32]))
  $png = New-Object byte[] ([int]$stream.Size)
  $reader.ReadBytes($png)
  $img = [System.Drawing.Image]::FromStream((New-Object System.IO.MemoryStream (,$png)))
  $out = New-Object System.IO.MemoryStream
  $img.Save($out, $jpeg, $params)
  $img.Dispose(); $page.Dispose()
  $bytes = $out.ToArray()
  if ($used -gt 0 -and $used + $bytes.Length -gt $budget) { break }
  $used += $bytes.Length
  [Console]::Out.WriteLine("PAGE $($i + 1) " + [Convert]::ToBase64String($bytes))
}
`;

/** { pages, first, images: [base64 jpg] } for pages from startPage (1-based), or throws with the reason. */
function pdfPagePictures(file, startPage = 1) {
  const first = Math.max(0, (Number(startPage) || 1) - 1);
  return new Promise((resolve, reject) => {
    const p = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", Buffer.from(SCRIPT, "utf16le").toString("base64")], {
      windowsHide: true,
      env: { ...process.env, CG_PDF: require("node:path").resolve(file), CG_FIRST: String(first), CG_COUNT: String(MAX_PAGES), CG_WIDTH: String(WIDTH), CG_QUALITY: String(QUALITY), CG_BUDGET: String(BUDGET) },
    });
    let out = "", err = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    const timer = setTimeout(() => { try { p.kill(); } catch { /* gone */ } reject(new Error("the PDF's pages took too long to turn into pictures")); }, 120000);
    p.on("error", (e) => { clearTimeout(timer); reject(e); });
    p.on("close", (code) => {
      clearTimeout(timer);
      const lines = out.split(/\r?\n/);
      const pages = Number((lines.find((l) => l.startsWith("PAGES ")) || "").slice(6)) || 0;
      const images = lines.filter((l) => l.startsWith("PAGE ")).map((l) => l.split(" ")[2]).filter(Boolean);
      if (!images.length) {
        const why = err.replace(/<[^>]+>/g, " ").replace(/_x000D__x000A_/g, " ").replace(/#< CLIXML/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
        return reject(new Error(code === 0 && pages && first >= pages ? `it has only ${pages} pages` : why || "its pages couldn't be turned into pictures"));
      }
      resolve({ pages, first: first + 1, images });
    });
  });
}

module.exports = { pdfPagePictures };
