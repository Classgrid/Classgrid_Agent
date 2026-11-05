// Classgrid Code only: a chat's PDF in the file preview. The editor's panel can't show a PDF in a frame (it stayed
// blank) or load the file itself, so the editor fetches its bytes and the pages are drawn here, like the Classgrid
// app's file tab. The website keeps its own viewer.
import { useEffect, useState } from "react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { PdfView, pdfWorkerUrl } from "@/features/superadmin/components/StudioLocalFileView";

type EditorDesktop = { fetchFile?: (url: string) => Promise<{ type: string; data: string } | null> };
const desk = () => (window as unknown as { classgridDesktop?: EditorDesktop }).classgridDesktop;

export default function EditorPdfPreview({ src }: { src: string }) {
  const [data, setData] = useState<Uint8Array | null>(null);
  const [worker, setWorker] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let gone = false;
    let workerUrl = "";
    (async () => {
      try {
        // (the pdf.js worker from a copy of its code: the panel's own files are on another address, where a worker
        // can't be started)
        const code = await fetch(pdfWorkerUrl).then((r) => r.text());
        workerUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
        let bytes: Uint8Array;
        if (/^(blob|data):/i.test(src)) bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
        else {
          const got = await desk()?.fetchFile?.(src);
          if (!got?.data) throw new Error("the PDF couldn't be loaded");
          const raw = atob(got.data);
          bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        }
        if (!gone) { setWorker(workerUrl); setData(bytes); }
      } catch {
        if (!gone) setFailed(true);
      }
    })();
    return () => { gone = true; if (workerUrl) URL.revokeObjectURL(workerUrl); };
  }, [src]);

  return (
    <div className="relative w-full max-w-4xl h-[80vh] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-sm text-muted-foreground">This PDF couldn't be shown here. Download it to open it.</div>
      ) : data && worker ? (
        <PdfView data={data} workerSrc={worker} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center"><Spinner className="size-5" /></div>
      )}
    </div>
  );
}
