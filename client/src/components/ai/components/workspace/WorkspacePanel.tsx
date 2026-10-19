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
import React, { useState } from "react";
import { X, FileText, Code, Eye, ListTodo, CheckCircle2, Circle, Loader2, XCircle, ExternalLink, Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

export type WorkspaceTab = "files" | "plan" | "code" | "preview";

interface WorkspacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  chatFiles: any[];
  setPreviewFile: (file: any) => void;
  hasPlan: boolean;
  hasSandboxFiles: boolean;
  isStreaming?: boolean;
  liveSiteUrl?: string | null;
  planNode?: React.ReactNode;
  currentHtml?: string;
  currentCss?: string;
  currentJs?: string;
  planSteps?: any[];
  completedPlanSteps?: string[];
  planStepStatus?: Record<string, "running" | "done" | "failed">;
  sandboxFiles?: Record<string, string>;
}

// Projects that need a build step (Vite/React/Next) cannot run as a plain srcDoc preview
function needsBuildStep(files: Record<string, string>): boolean {
  const html = files["index.html"] || files["/index.html"] || "";
  if (/<script[^>]*src=["'][^"']*\.(?:jsx|tsx)["']/i.test(html)) return true;
  const pkg = files["package.json"] || files["/package.json"];
  if (!pkg) return false;
  try {
    const parsed = JSON.parse(pkg);
    const deps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
    return ["vite", "react", "next"].some((d) => d in deps);
  } catch {
    return /"(?:vite|react|next)"\s*:/.test(pkg);
  }
}

type TreeNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: Record<string, TreeNode>;
};

function buildFileTree(files: Record<string, string>): TreeNode[] {
  const root: Record<string, TreeNode> = {};

  Object.keys(files).forEach((filePath) => {
    // Treat paths that might have leading slashes properly (e.g. /css/style.css)
    const parts = filePath.replace(/^\//, "").split("/");
    let currentLevel = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath += (currentPath ? "/" : "") + part;
      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: part,
          type: index === parts.length - 1 ? "file" : "folder",
          path: currentPath,
          children: index === parts.length - 1 ? undefined : {},
        };
      }
      if (index < parts.length - 1) {
        currentLevel = currentLevel[part].children!;
      }
    });
  });

  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "folder" ? -1 : 1;
    });
  };

  const convertToArray = (obj: Record<string, TreeNode>): TreeNode[] => {
    const arr = Object.values(obj);
    arr.forEach((node) => {
      if (node.children) {
        node.children = convertToArray(node.children) as any;
      }
    });
    return sortNodes(arr);
  };

  return convertToArray(root);
}

const FileTreeNode = ({
  node,
  selectedFile,
  onSelect,
  level = 0,
}: {
  node: TreeNode;
  selectedFile: string;
  onSelect: (path: string) => void;
  level?: number;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = selectedFile === node.path || selectedFile === `/${node.path}`;

  if (node.type === "folder") {
    return (
      <div className="w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left px-2 py-1.5 hover:bg-white/5 rounded text-[13px] flex items-center gap-1.5 text-gray-300 transition-colors"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-gray-500" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-gray-500" />
          )}
          {isOpen ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div className="flex flex-col">
            {(node.children as any as TreeNode[]).map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                selectedFile={selectedFile}
                onSelect={onSelect}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`w-full text-left py-1.5 pr-2 rounded text-[13px] flex items-center gap-2 transition-colors ${
        isSelected ? "bg-blue-500/10 text-blue-400" : "text-gray-400 hover:bg-white/5 hover:text-gray-300"
      }`}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
    >
      <FileText className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-blue-400" : "text-gray-500"}`} />
      <span className="truncate">{node.name}</span>
    </button>
  );
};

// Simple debounce hook for smooth iframe updates
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function WorkspacePanel({
  isOpen,
  onClose,
  chatFiles,
  setPreviewFile,
  hasPlan,
  hasSandboxFiles,
  isStreaming = false,
  liveSiteUrl,
  planNode,
  currentHtml = "",
  currentCss = "",
  currentJs = "",
  planSteps,
  completedPlanSteps,
  planStepStatus,
  sandboxFiles = {},
}: WorkspacePanelProps) {
  // Debounce the code for iframe rendering (300ms) to avoid browser freeze
  const debouncedHtml = useDebounce(currentHtml, 300);
  const debouncedCss = useDebounce(currentCss, 300);
  const debouncedJs = useDebounce(currentJs, 300);
  const debouncedFiles = useDebounce(sandboxFiles, 300);
  const isBuildProject = React.useMemo(() => needsBuildStep(sandboxFiles), [sandboxFiles]);

  // Determine which tabs to show based on state
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("files");
  const [selectedFile, setSelectedFile] = useState<string>("index.html");

  const highlightedCode = React.useMemo(() => {
    const code = sandboxFiles[selectedFile] || "// Select a file to view its code";
    const extension = selectedFile.split('.').pop() || 'text';
    const language = extension === 'js' ? 'javascript' : extension === 'html' ? 'xml' : extension;
    try {
      if (hljs.getLanguage(language)) {
        return hljs.highlight(code, { language }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch (e) {
      return code; // Fallback to raw text
    }
  }, [sandboxFiles, selectedFile]);

  // Auto-switch to plan if a plan exists and we were on files
  React.useEffect(() => {
    if (hasPlan && activeTab === "files") {
      setActiveTab("plan");
    }
  }, [hasPlan]);

  // Auto-switch to preview once sandbox files arrive
  React.useEffect(() => {
    if (hasSandboxFiles && (activeTab === "files" || activeTab === "plan")) {
      setActiveTab("preview");
    }
  }, [hasSandboxFiles]);

  // Page shown in the preview when the site links to another of its own pages (null = the main page)
  const [previewPage, setPreviewPage] = useState<string | null>(null);
  const previewFrameRef = React.useRef<HTMLIFrameElement>(null);

  const previewSrcDoc = React.useMemo(() => {
    const pageHtml = previewPage ? (debouncedFiles[previewPage] ?? debouncedFiles[`/${previewPage}`]) : undefined;
    let html = pageHtml ?? debouncedHtml;
    const inlined = new Set<string>();
    const resolve = (ref: string) => {
      const path = ref.replace(/^\.?\//, "");
      const content = debouncedFiles[path] ?? debouncedFiles[`/${path}`];
      if (content !== undefined) inlined.add(path);
      return content;
    };
    // Inline every local stylesheet the page links
    html = html.replace(/<link\s+[^>]*href=["']([^"':]+\.css)["'][^>]*>/gi, (tag, href) => {
      const css = resolve(href);
      return css === undefined ? tag : `<style>\n${css}\n</style>`;
    });
    // Inline every local script the page links (keeps module/defer timing). Deferred scripts move to the end
    // of <body> as plain top-level code, so their functions stay global like with a real defer.
    const deferred: string[] = [];
    html = html.replace(/<script\s+([^>]*)src=["']([^"':]+\.js)["']([^>]*)><\/script>/gi, (tag, pre, src, post) => {
      const js = resolve(src);
      if (js === undefined) return tag;
      const attrs = `${pre} ${post}`;
      if (/type=["']module["']/i.test(attrs)) return `<script type="module">\n${js}\n</script>`;
      const inline = `<script>\ntry {\n${js}\n} catch(e) { console.error(e); }\n</script>`;
      if (/\bdefer\b/i.test(attrs)) {
        deferred.push(inline);
        return "";
      }
      return inline;
    });
    if (deferred.length > 0) {
      html = /<\/body>/i.test(html)
        ? html.replace(/<\/body>/i, () => `${deferred.join("\n")}\n</body>`)
        : `${html}\n${deferred.join("\n")}`;
    }
    // Fallback: inject style.css / script.js even when the page does not link them
    if (debouncedCss && !inlined.has("style.css")) {
      html = html.replace(/<\/head>/i, () => `<style>\n${debouncedCss}\n</style>\n</head>`);
    }
    if (debouncedJs && !inlined.has("script.js")) {
      html = html.replace(/<\/body>/i, () => `<script>\ntry {\n${debouncedJs}\n} catch(e) { console.error(e); }\n</script>\n</body>`);
    }
    // Links inside the preview: the page runs from srcDoc, so a plain link would resolve against chat.classgrid.in
    // and load our own app inside the preview. #anchors scroll in place, links to the project's own pages are
    // handed to the panel (it swaps the page), real websites open in a new tab, forms never navigate.
    const navScript = `<script>(function(){
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
  if(!a)return;
  var href=a.getAttribute('href')||'';
  if(/^(javascript:|mailto:|tel:)/i.test(href))return;
  if(href.charAt(0)==='#'){
    e.preventDefault();
    var id=decodeURIComponent(href.slice(1));
    var el=id?(document.getElementById(id)||document.querySelector('[name="'+id.replace(/"/g,'')+'"]')):null;
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});else if(!id)window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  e.preventDefault();
  var low=href.toLowerCase();
  if(low.indexOf('http://')===0||low.indexOf('https://')===0||low.indexOf('//')===0){window.open(href,'_blank','noopener');return;}
  parent.postMessage({__cgPreviewNav:true,href:href},'*');
},true);
document.addEventListener('submit',function(e){e.preventDefault();},true);
})();<\/script>`;
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => `${navScript}
</body>`) : `${html}
${navScript}`;
    return html;
  }, [debouncedHtml, debouncedCss, debouncedJs, debouncedFiles, previewPage]);

  // A link to another page of the project: show that page if the project has it, otherwise ignore the click
  React.useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.data?.__cgPreviewNav || e.source !== previewFrameRef.current?.contentWindow) return;
      const path = (String(e.data.href || "").split(/[?#]/)[0] ?? "").replace(/^\.?\//, "").replace(/^\/+/, "");
      if (!path || path === "index.html") { setPreviewPage(null); return; }
      const candidates = [path, `${path}.html`, `${path.replace(/\/$/, "")}/index.html`];
      const found = candidates.find((c) => debouncedFiles[c] !== undefined || debouncedFiles[`/${c}`] !== undefined);
      if (found) setPreviewPage(found);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [debouncedFiles]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 450, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className="shrink-0 h-full bg-background border-l border-border/50 flex flex-col overflow-hidden shadow-xl z-50 max-sm:fixed max-sm:inset-0 max-sm:!w-full max-sm:z-[130] max-sm:border-l-0"
    >
      <div className="shrink-0 flex items-center justify-between px-4 pt-3 h-14 border-b border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {hasPlan && (
            <Button
              variant={activeTab === "plan" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("plan")}
              className="text-xs h-8"
            >
              <ListTodo className="h-4 w-4 mr-2" />
              Plan
            </Button>
          )}
          {hasSandboxFiles && (
            <>
              <Button
                variant={activeTab === "code" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("code")}
                className="text-xs h-8"
              >
                <Code className="h-4 w-4 mr-2" />
                Code
              </Button>
              <Button
                variant={activeTab === "preview" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("preview")}
                className="text-xs h-8"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </>
          )}
          <Button
            variant={activeTab === "files" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("files")}
            className="text-xs h-8"
          >
            <FileText className="h-4 w-4 mr-2" />
            Files
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 shrink-0 ml-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto w-full sm:w-[450px]">
        {activeTab === "files" && (
          <div className="p-4">
            {chatFiles.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center mt-10">
                No files referenced yet
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {chatFiles.map((f, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setPreviewFile({ src: f.url, name: f.name, mimeType: f.mimeType })
                    }
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted transition-colors text-left cursor-pointer"
                  >
                    <div className="h-10 w-10 shrink-0 bg-primary/10 rounded flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{f.name}</div>
                      <div className="text-[11px] text-muted-foreground uppercase">
                        {f.mimeType
                          .split("/")
                          .pop()
                          ?.replace("vnd.openxmlformats-officedocument.spreadsheetml.sheet", "excel")
                          .replace("jpeg", "jpg")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "plan" && (
          <div className="p-4 h-full overflow-y-auto">
            {planNode && <div className="mb-6">{planNode}</div>}
            
            {planSteps && (
              <div className="space-y-3 mt-4">
                <h3 className="text-sm font-semibold text-foreground/80 mb-4">Execution Steps</h3>
                {planSteps.map((step, idx) => {
                  // Live status from plan_step_update SSE events; completedPlanSteps kept as fallback
                  const status = planStepStatus?.[step.id]
                    || (completedPlanSteps?.includes(step.id) ? 'done' : (step.status || 'pending'));
                  
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-md bg-muted/30 border border-border/50">
                      {status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : status === 'running' ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0 mt-0.5" />
                      ) : status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/50 shrink-0 mt-0.5" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${status === 'done' ? 'text-foreground/70 line-through' : 'text-foreground'}`}>
                          {typeof step.title === 'object' ? JSON.stringify(step.title) : String(step.title || "")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {!planNode && !planSteps && !hasPlan && (
              <div className="text-sm text-muted-foreground text-center mt-10">
                No active plan
              </div>
            )}
          </div>
        )}

        {activeTab === "code" && (
          <div className="flex h-full">
            {/* File tree sidebar */}
            <div className="w-48 shrink-0 bg-[#f4f4f5] dark:bg-[#111111] border-r border-black/10 dark:border-white/[0.08] overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-2 mb-2 select-none">Project Files</div>
              {Object.keys(sandboxFiles).length === 0 ? (
                <div className="text-xs text-muted-foreground p-2">No files yet</div>
              ) : (
                buildFileTree(sandboxFiles).map((node) => (
                  <FileTreeNode
                    key={node.path}
                    node={node}
                    selectedFile={selectedFile}
                    onSelect={setSelectedFile}
                  />
                ))
              )}
            </div>
            {/* Selected file code */}
            <div className="flex-1 overflow-auto bg-white dark:bg-[#000000] text-xs font-mono text-gray-700 dark:text-gray-300 relative flex flex-col">
              <div className="flex items-center px-4 py-2.5 border-b border-black/10 dark:border-white/[0.08] bg-[#f4f4f5] dark:bg-[#111111] text-gray-500 dark:text-gray-400 shrink-0 select-none">
                <FileText className="h-3.5 w-3.5 mr-2 text-gray-500" />
                {selectedFile || "No file selected"}
              </div>
              <div className="flex-1 flex overflow-auto min-h-0 relative">
                <div className="w-12 shrink-0 bg-white dark:bg-[#000000] border-r border-black/10 dark:border-white/[0.08] flex flex-col items-end pt-4 pb-4 select-none text-gray-400 dark:text-[#404040]">
                  {((sandboxFiles[selectedFile] || "").match(/\n/g) || []).concat('').map((_, i) => (
                    <div key={i} className="px-3 leading-[22px]">{i + 1}</div>
                  ))}
                </div>
                <div className="flex-1 min-w-0 pt-4 pb-4 px-4 overflow-auto">
                  <pre className="m-0 bg-transparent p-0"><code 
                    className={`hljs language-${selectedFile.split('.').pop()} !bg-transparent !p-0 block leading-[22px]`} 
                    dangerouslySetInnerHTML={{ __html: highlightedCode }} 
                  /></pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <div className="h-full w-full bg-white relative">
            {isBuildProject ? (
              liveSiteUrl ? (
                <div className="flex flex-col h-full">
                  <div className="shrink-0 px-3 py-2 text-xs text-muted-foreground bg-muted/40 border-b border-border/50 flex items-center gap-2">
                    <span className="truncate">This project needs a build step. Showing the live site:</span>
                    <a href={liveSiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline flex items-center gap-1 shrink-0">
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <iframe
                    className="w-full flex-1 border-0"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    src={liveSiteUrl}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full px-6 text-sm text-center text-muted-foreground">
                  This project uses a build step (React/Vite/Next), so it can't be previewed here. The preview is available after deploy.
                </div>
              )
            ) : isStreaming && !debouncedHtml ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="text-sm">Building Preview...</div>
              </div>
            ) : !debouncedHtml ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Waiting for rendering...
              </div>
            ) : (
              <iframe
                ref={previewFrameRef}
                className="w-full h-full border-0"
                // No allow-same-origin: the generated site must not be able to read Classgrid's login or storage
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
                srcDoc={previewSrcDoc}
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
