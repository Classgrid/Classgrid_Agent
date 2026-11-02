// Chat steps for the live doc tools: "Created Trip plan [Open]", "Edited Trip plan [Open]", "Read ...", "Replied to a comment"
import { FileText } from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Row } from "@/components/ai/components/stepper/ProjectToolSteps";
import { ShimmerText } from "@/components/ai/components/stepper/ShimmerText";

export const LIVE_DOC_TOOLS = new Set(["create_doc", "edit_doc", "read_doc", "doc_comments"]);

type Step = { id: string; tool?: string; status?: string; args?: any; result?: string };

const docIdOf = (step: Step) =>
  String(step.result || "").match(/\/docs\/([0-9a-f]{24})/i)?.[1] || String(step.args?.doc_id || "").match(/([0-9a-f]{24})/i)?.[1] || "";
const titleOf = (step: Step) => String(step.result || "").match(/^(?:Created|Edited|Doc|Replied to the comment on|Resolved the comment on) "([^"]+)"/)?.[1] || step.args?.title || "";

const WORDS: Record<string, [string, string, string]> = {
  create_doc: ["Creating", "Created", "Could not create the doc"],
  edit_doc: ["Editing", "Edited", "Could not edit the doc"],
  read_doc: ["Reading", "Read", "Could not read the doc"],
};

export function LiveDocStep({ step }: { step: Step }) {
  const loading = step.status === "loading";
  const result = String(step.result || "").trim();
  const failed = !loading && /^error/i.test(result);
  // A failed edit try that changed nothing: the AI reads the doc and tries again
  if (failed && step.tool === "edit_doc" && /Nothing was changed\./.test(result)) return null;

  const id = docIdOf(step);
  const title = titleOf(step);
  let label: string;
  if (step.tool === "doc_comments") {
    const resolve = step.args?.action === "resolve";
    label = loading ? (resolve ? "Resolving a comment" : "Replying to a comment") : failed ? "Could not answer the comment" : resolve ? "Resolved a comment" : "Replied to a comment";
  } else {
    const [doing, done, fail] = WORDS[step.tool || ""] ?? ["Reading", "Read", "Could not read the doc"];
    label = loading ? doing : failed ? fail : done;
  }
  const showOpen = !loading && !failed && !!id && (step.tool === "create_doc" || step.tool === "edit_doc");

  return (
    <div className="flex flex-col">
      <div className="flex items-center min-w-0">
        <Row>
          <FileText className="size-3.5 shrink-0" />
          <ShimmerText active={loading} className="shrink-0">{label}</ShimmerText>
          {title && step.tool !== "doc_comments" && <span className="font-medium text-foreground/90 truncate">{title}</span>}
          {loading && <Spinner className="size-3.5 shrink-0" />}
        </Row>
        {showOpen && (
          <a
            href={import.meta.env.VITE_DESKTOP === "1" ? `https://chat.classgrid.in/docs/${id}` : `/docs/${id}`}
            target="_blank"
            rel="noreferrer"
            className="relative z-10 -ml-1 shrink-0 inline-flex items-center h-6 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-accent"
          >
            Open
          </a>
        )}
      </div>
      {failed && <div className="ml-10 -mt-1 mb-1 text-xs text-red-600 dark:text-red-500">{result.replace(/^error:\s*/i, "")}</div>}
    </div>
  );
}
