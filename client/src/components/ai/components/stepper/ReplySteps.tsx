// The steps of one reply, the same for the main agent and for its helpers (the Agent map): its thinking, each tool
// as its own step, and the fold into "Worked for X sec" when the work is done
import React from "react";
import { UploadCloud } from "lucide-react";
import { AgentStepper } from "./AgentStepper";
import { WorkflowAccordion } from "./WorkflowAccordion";
import { AgentStepAccordion } from "./AgentStepAccordion";
import { ThoughtStepView } from "./ThoughtStepView";
import { TerminalToolView } from "./TerminalToolView";
import { MasterWorkflowWrapper } from "./MasterWorkflowWrapper";
import { ToolResultStep } from "./tool-results/ToolResultStep";
import { describeStep, plainStep } from "./tool-results/describeStep";
import { connectorWording, INVERT_IN_DARK } from "./tool-results/connectorWording";

// A connected app's step line, like the launch video: the app's logo, what the step did, the app's name in grey
function AppStepLine({ icon, app, invert, children }: { icon?: string; app: string; invert?: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      {icon && <img src={icon} alt="" className={`size-4 shrink-0 rounded-[3px] object-contain ${invert ? "dark:invert" : ""}`} />}
      <span className="min-w-0 break-words">{children}</span>
      <span className="shrink-0 text-slate-400 dark:text-[#6f6f6f] font-normal">{app}</span>
    </span>
  );
}
import { specialStepTitle, emailTitle } from "./tool-results/stepTitles";
import { parsePeerContent, peerNoticeText } from "@/lib/peerSessions";
import { StepWorkingContext, StepShineContext } from "./ShimmerText";
import { ImageReadStep } from "./tool-results/ImageReadStep";
import { AudioTranscribeStep } from "./tool-results/AudioTranscribeStep";
import { StepBoundary } from "./StepBoundary";
import { LiveDocStep, LIVE_DOC_TOOLS } from "@/features/live-docs/LiveDocStep";
import { CombinedReasoningBlock } from "./CombinedReasoningBlock";
import { DatabaseQueryView } from "./DatabaseQueryView";
import { FileActionView } from "./FileActionView";
import { EmailActionView } from "./EmailActionView";
import { EmailSentView } from "./EmailSentView";
import { OpenPageView } from "./OpenPageView";
import { WebSearchView } from "./WebSearchView";
import { DocumentGenerationView } from "./DocumentGenerationView";
import { KnowledgeBaseSearchView } from "./KnowledgeBaseSearchView";
import { CdnUploadView } from "./CdnUploadView";
import { PublishedPageStep } from "./PublishedPageStep";
import { PeerMessageLine, HelperMessageLine, AgentMessageLine, stepMessagesOf, PROJECT_EXPLORE_TOOLS, PROJECT_EDIT_TOOLS, PROJECT_BACKGROUND_TOOLS, ProjectExploreGroup, ProjectEditStep, ProjectPushStep, ProjectHelpersStep, CheckHelpersStep, checkHelpersReports, ComputerStep, TerminalStep, ProjectRunChanges } from "./ProjectToolSteps";
import type { AgentStep } from "../AskAiPanel";

// Some models draft whole code blocks (e.g. widget cards) in their thinking. The thinking panel shows one
// "Drafting code…" line for each such stretch instead of a wall of raw code.
const DRAFTING_LINE = "✏️ Drafting code…";
// Single, non-nested repeats only: a nested one like ([\w-]+(\s*[\w-]+)*) backtracks forever on plain sentences and froze the page
const TAG_OR_CSS_RE = /^\s*(?:<\/?[a-z][\w-]*[\s>/]|[.#]?[\w-][\w\s.#:,>+~*="'()[\]-]*\{[^}]*:)/i;
const JS_START_RE = /^\s*(?:const|let|var|function|document\.|return|if\s*\(|for\s*\(|\w+\.\w+\s*=)/;
const CLOSERS_RE = /^\s*[})\];,]+\s*$/;
export function hideCodeInThought(text: string): string {
  const withoutFences = text.replace(/```[\s\S]*?(?:```|$)/g, `\n${DRAFTING_LINE}\n`);
  const out: string[] = [];
  for (const line of withoutFences.split("\n")) {
    const isCode = line === DRAFTING_LINE || TAG_OR_CSS_RE.test(line) || CLOSERS_RE.test(line)
      || (JS_START_RE.test(line) && /[;{}=]/.test(line));
    if (isCode) {
      if (out[out.length - 1] !== DRAFTING_LINE) out.push(DRAFTING_LINE);
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

type ReplyStepsProps = {
  thought?: string;
  steps?: AgentStep[];
  /** The reply is still being worked on (steps stay open and keep their shine) */
  live: boolean;
  /** The model is thinking right now */
  thinking: boolean;
  /** How long the work took (ms), for "Worked for X sec" */
  workedMs?: number;
  /** False: the step labels don't shine while working (only the thinking does) */
  shineSteps?: boolean;
};

export function ReplySteps({ thought, steps, live, thinking, workedMs, shineSteps = true }: ReplyStepsProps) {
  // Steps stay open while the agent works, then fold into "Worked for X sec" (old messages load folded)
  const isLiveReply = live;
  const toolSteps = (steps || []).filter((s) => s.type === 'tool');
  // An answer that ended (finished, stopped or cut off) folds into "Worked for" too: a step it was
  // still running when it stopped no longer spins as if it were running (owner, 2026-11-06)
  const workDone = !isLiveReply;
  const shownSteps = isLiveReply ? (steps || []) : (steps || []).map((s) => (s.status === 'loading' ? { ...s, status: 'success' as const } : s));
  const stepper = (
<AgentStepper>
  {/* CombinedReasoningBlock MUST be first child - direct sibling of steps */}
  {((thought && thought.trim().length > 0) || (thinking)) && (
    <CombinedReasoningBlock
      sentences={thought && thought.trim().length > 0 ? hideCodeInThought(thought).trim().split(/(?<=[.!?\n])\s+/).filter(Boolean) : []}
      isStreaming={thinking && !(steps && steps.some(s => s.status === 'loading'))}
      seconds={!steps?.length && workedMs ? Math.max(1, Math.round(workedMs / 1000)) : undefined}
    />
  )}

  {/* Steps - CSS sibling hiding hides these during Phase 1 & 2 */}
  {(() => {
    const elements: React.ReactNode[] = [];
    let thoughtGroup: any[] = [];

    // Project file reads/searches in a row show as one "Exploring 2 files, 1 search" group
    let exploreGroup: any[] = [];
    const flushExplore = () => {
      if (exploreGroup.length > 0) {
        elements.push(<ProjectExploreGroup key={`explore-${exploreGroup[0].id}`} steps={exploreGroup} />);
        exploreGroup = [];
      }
    };

    const flushThoughts = () => {
      flushExplore();
      if (thoughtGroup.length > 0) {
        if (thoughtGroup.length === 1) {
          const step = thoughtGroup[0];
          elements.push(
            <ThoughtStepView
              key={step.id}
              title={step.title}
              details={step.details}
            />
          );
        } else {
          elements.push(
            <WorkflowAccordion
              key={`group-${thoughtGroup[0].id}`}
              title={`${thoughtGroup.length} steps`}
              steps={thoughtGroup.map(s => ({
                id: s.id,
                type: 'thought',
                title: s.title,
                details: s.details
              }))}
              defaultExpanded={false}
            />
          );
        }
        thoughtGroup = [];
      }
    };

    // Messages from other Classgrid sessions that this AI read after one of its steps (the app adds them to the
    // step's answer while a turn is running): each is shown under that step as a message, whole. Without this the
    // person saw only "1 message waiting" and never the message.
    const peerRowsAfter = (step: any) => {
      if (step.type !== 'tool' || typeof step.result !== 'string' || !/\n\n\[(Peer message|Session notice) from @/.test(step.result)) return;
      const blocks = step.result.split(/\n\n(?=\[(?:Peer message|Session notice) from @)/).slice(1);
      const rows = blocks.map((b: string) => parsePeerContent(b)).filter(Boolean) as NonNullable<ReturnType<typeof parsePeerContent>>[];
      if (!rows.length) return;
      flushThoughts();
      rows.forEach((p, i) => elements.push(p.notice
        ? <div key={`peer-${step.id}-${i}`} className="mb-3 pl-10 py-1 text-[13px] text-slate-500 dark:text-[#8a8a8a]">{peerNoticeText({ kind: p.notice, from: { name: p.name } })}</div>
        : <PeerMessageLine key={`peer-${step.id}-${i}`} name={p.name} text={p.text} />));
    };
    // What a helper wrote to the main agent while it works comes with the result of the main agent's next step:
    // shown under that step, whole, as "Message from Helper 2".
    const agentRowsAfter = (step: any) => {
      if (step.type !== 'tool') return;
      const rows = stepMessagesOf(step.result);
      if (!rows.length) return;
      flushThoughts();
      rows.forEach((m, i) => elements.push(<HelperMessageLine key={`agent-${step.id}-${i}`} no={m.helper} text={m.text} />));
    };
    const drawStep = (step: any) => {
      if (step.type === 'thought') {
        thoughtGroup.push(step);
      } else if (step.type === 'tool') {
        if (PROJECT_EXPLORE_TOOLS.has(step.tool)) {
          // A big file sent to the file reader instead ("Not read: …") is only for the AI
          if (step.tool === 'view_project_file' && /^Not read: /.test(String(step.result || ''))) return;
          if (thoughtGroup.length > 0) flushThoughts();
          exploreGroup.push(step);
          return;
        }
        flushThoughts();

        if (PROJECT_EDIT_TOOLS.has(step.tool)) {
          // "File already exists, use the edit tool" is only for the AI: it then edits the file,
          // and that edit is the step the user sees
          if (step.tool === 'write_project_file' && /already exists, so it was not changed/i.test(String(step.result || ''))) return;
          // A failed edit try that changed nothing ("old_text was not found…"): the AI reads the file and tries again
          if (step.tool === 'edit_project_file' && /Nothing was changed\./.test(String(step.result || ''))) return;
          elements.push(<ProjectEditStep key={step.id} step={step} />);
          return;
        }
        if (LIVE_DOC_TOOLS.has(step.tool ?? '')) {
          elements.push(<LiveDocStep key={step.id} step={step} />);
          return;
        }
        if (step.tool === 'push_project_to_github') {
          elements.push(<ProjectPushStep key={step.id} step={step} />);
          return;
        }
        if (step.tool === 'publish_page') {
          elements.push(<PublishedPageStep key={step.id} step={step} />);
          return;
        }
        if (step.tool === 'run_project_helpers') {
          elements.push(<ProjectHelpersStep key={step.id} step={step} />);
          return;
        }
        // The helpers' reports the agent read itself: "Message from Helper 1: ..." (none read: the plain step as before)
        if (step.tool === 'check_helpers' && step.status !== 'loading' && checkHelpersReports(step.result).length) {
          elements.push(<CheckHelpersStep key={step.id} step={step} />);
          return;
        }
        if (step.tool === 'computer') {
          elements.push(<ComputerStep key={step.id} step={step} />);
          return;
        }
        if (PROJECT_BACKGROUND_TOOLS.has(step.tool ?? '')) {
          // Same look as a normal command: the command (or the check run inside it) and its output
          const bgCommand = step.tool === 'start_background_command'
            ? String(step.args?.command || '')
            : step.tool === 'check_background_command'
              ? (step.args?.run_inside ? String(step.args.run_inside) : `check job ${step.args?.job_id || ''}`)
              : `stop job ${step.args?.job_id || ''}`;
          elements.push(
            <TerminalStep
              key={step.id}
              name="Bash"
              description={step.args?.description ? String(step.args.description) : undefined}
              command={bgCommand}
              output={step.result}
              status={step.status}
            />
          );
          return;
        }

        // Render specific tool views
        if (step.tool === 'run_code' || step.tool === 'execute_terminal_command') {
          elements.push(
            <AgentStepAccordion
              key={step.id}
              title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? (step.tool === 'run_code' ? 'Executing Code' : 'Running a command')}
              status={step.status}                                              >
              <TerminalToolView
                command={step.args?.command || step.args?.code || 'Running...'}
                output={step.result || 'Waiting for output...'}
                running={step.status === 'loading'}
                shell={step.args?.shell}
              />
            </AgentStepAccordion>
          );
          elements.push(<ProjectRunChanges key={`changes-${step.id}`} result={step.result} />);
          return;
        }

        if (step.tool === 'unified_db_query') {
          let results = [];
          try {
            if (step.result && step.result.startsWith('[')) {
              results = JSON.parse(step.result.split('\n\n[SYSTEM DIRECTIVE')[0]);
            } else if (step.result && step.result.startsWith('{')) {
              results = [JSON.parse(step.result)];
            }
          } catch (e) { }
          elements.push(
            <AgentStepAccordion
              key={step.id}
              title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? "Querying Database"}
              status={step.status}                                              >
              <DatabaseQueryView
                query={JSON.stringify(step.args, null, 2)}
                results={results}
              />
            </AgentStepAccordion>
          );
          return;
        }

        if (step.tool === 'parse_document') {
          elements.push(
            <AgentStepAccordion
              key={step.id}
              title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? "Uploaded File"}
              status={step.status}                                              >
              <FileActionView fileName={step.args?.url?.split('/').pop() || 'document'} />
            </AgentStepAccordion>
          );
          return;
        }

        if (step.tool === 'send_email') {
          const draftingStep = (
            <AgentStepAccordion
              key={`${step.id}-draft`}
              title={emailTitle(step.args, false, step.status) ?? (step.status === 'success' ? "Drafted email" : "Drafting email")}
              status={step.status === 'success' ? 'success' : step.status}                                              >
              <EmailActionView
                to={step.args?.to || "Unknown Recipient"}
                subject={step.args?.subject || "No Subject"}
                bodyPreview={step.args?.htmlBody || step.args?.body || "Empty body"}
              />
            </AgentStepAccordion>
          );

          if (step.status === 'success') {
            let toCount = 1;
            if (step.args?.to && step.args.to.includes(',')) {
              toCount = step.args.to.split(',').length;
            }
            elements.push(
              <React.Fragment key={step.id}>
                {draftingStep}
                <AgentStepAccordion
                  key={`${step.id}-sent`}
                  title={emailTitle(step.args, true, "success") ?? "Sent email"}
                  status="success"
                >
                  <EmailSentView
                    toCount={toCount}
                    subject={step.args?.subject || "No Subject"}
                  />
                </AgentStepAccordion>
              </React.Fragment>
            );
          } else {
            elements.push(draftingStep);
          }
          return;
        }

        if (step.tool === 'open_url') {
          elements.push(
            <AgentStepAccordion
              key={step.id}
              title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? (step.status === 'loading' ? "Opening page" : step.status === 'error' ? "Couldn't open page" : "Opened page")}
              status={step.status}
            >
              <OpenPageView url={step.args?.url} result={step.result} status={step.status} />
            </AgentStepAccordion>
          );
          return;
        }

        if (step.tool === 'search_web') {
          let searchResults = [];
          let searchError;
          if (step.result) {
            if (step.result.startsWith('Web Search failed')) {
              searchError = step.result;
            } else {
              try {
                const parsed = JSON.parse(step.result);
                if (parsed.results && Array.isArray(parsed.results)) {
                  searchResults = parsed.results;
                }
              } catch (e) {
                searchError = "Could not parse search results.";
              }
            }
          }
          elements.push(
            <AgentStepAccordion
              key={step.id}
              title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? "Searched the web"}
              status={step.status}                                              >
              <WebSearchView
                query={step.args?.query}
                searchDomain={step.args?.domain}
                results={searchResults}
                error={searchError}
              />
            </AgentStepAccordion>
          );
          return;
        }

        if (step.tool === 'generate_pdf' || step.tool === 'generate_pdf_from_db') {
          let fileName = "document.pdf";
          let pageCount = 1;
          let size = "Unknown";

          if (step.result && step.result.includes("SUCCESS")) {
            size = "Available via CDN";
          }

          elements.push(
            <AgentStepAccordion
              key={step.id}
              title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? (step.tool === 'generate_pdf_from_db' ? "Generating database report" : "Generating PDF document")}
              status={step.status}                                              >
              <DocumentGenerationView
                fileName={step.args?.title ? `${step.args.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf` : fileName}
                pageCount={pageCount}
                size={size}
              />
            </AgentStepAccordion>
          );
          return;
        }

        if (step.tool === 'search_knowledge_base') {
          elements.push(
            <AgentStepAccordion
              key={step.id}
              title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? "Searched Knowledge Base"}
              status={step.status}                                              >
              <KnowledgeBaseSearchView
                results={[{
                  title: step.args?.query || "Search Query",
                  source: "Internal Knowledge Base"
                }]}
              />
            </AgentStepAccordion>
          );
          return;
        }

        if (step.tool === 'upload_file_to_cdn') {
          let cdnUrl = "";
          if (step.result && step.result.includes("Public URL:")) {
            cdnUrl = step.result.split("Public URL:")[1].trim();
          }
          elements.push(
            <AgentStepAccordion
              key={step.id}
              title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? "Upload file to CDN"}
              status={step.status}                                                icon={<UploadCloud className="h-4 w-4" />}
            >
              <CdnUploadView
                fileName={step.args?.fileName || "upload.file"}
                url={cdnUrl}
                status={step.status}
                error={step.error || (!cdnUrl ? step.result : undefined)}
              />
            </AgentStepAccordion>
          );
          return;
        }

        // Image the AI is looking at: shown right away (live), then its answer
        // Mastero: its card asking for the project's name or photo sits on the chat box (masteroAsk); the
        // steps only say it was asked
        if (step.tool === 'mastero_ask') {
          const photo = step.args?.ask === 'logo';
          elements.push(<ToolResultStep key={step.id} tool={step.tool} args={step.args} result={undefined} status={step.status} text={step.status === 'loading' ? 'Asking…' : photo ? "Asked for the project's photo" : step.args?.ask === 'confirm' ? 'Asked to confirm Mastero' : "Asked for the project's name"} />);
          return;
        }

        // Audio being turned into text: the file with a player right away, then the transcript
        if (step.tool === 'transcribe_audio') {
          elements.push(<AudioTranscribeStep key={step.id} args={step.args} result={step.result} status={step.status} />);
          return;
        }

        const isImageUpload = step.tool === 'upload_sandbox_file_to_cdn'
          && (/^image\//.test(String(step.args?.mimeType ?? '')) || /\.(png|jpe?g|gif|webp)$/i.test(String(step.args?.sandboxFilePath ?? '')));
        if (step.tool === 'analyze_image' || step.tool === 'view_image' || isImageUpload) {
          elements.push(
            <ImageReadStep
              key={step.id}
              tool={step.tool}
              args={step.args}
              result={step.result}
              status={step.status}
              text={isImageUpload
                ? (step.status === 'loading' ? 'Uploading image...' : 'Uploaded image')
                : (step.status === 'loading' ? 'Analyzing image...' : 'Analyzed image')}
            />
          );
          return;
        }

        // A message this AI sent to another Classgrid session: shown the same way as one it received, "Message to
        // @name" with the whole text, not as a step (owner, 2026-11-23: "show sent just how you show message from").
        // One that was not delivered (held, refused, no such session) stays a step, so the line says what happened.
        if (step.tool === 'message_classgrid_session' && typeof step.args?.text === 'string' && step.args.text.trim()) {
          const answer = typeof step.result === 'string' ? step.result.trim() : '';
          const delivered = answer.match(/^Delivered to @(.+?)'s inbox/);
          if (step.status === 'loading' || delivered) {
            const asked = String(step.args?.target ?? '').trim().replace(/^@/, '');
            // (a session id or a pid is not a name: the name comes from the receipt once it is there)
            const name = delivered?.[1] ?? (asked && !/^[0-9a-f-]{8,}$/i.test(asked) && !/^\d+$/.test(asked) ? asked : '');
            // (the receipt is the tool's own answer: delivered, its message id, not read yet, busy or idle)
            elements.push(<PeerMessageLine key={step.id} name={name} text={step.args.text.trim()} to receipt={delivered ? answer.split(/\n\n\[/)[0] : undefined} />);
            return;
          }
        }

        // A message the main agent sent to a helper, and one a helper sent to the main agent: the whole text, with
        // what the other side's inbox answered under it. One that was not delivered stays a step that says why.
        if (step.tool === 'message_helper' && typeof step.args?.message === 'string' && step.args.message.trim()) {
          const answer = typeof step.result === 'string' ? step.result.trim() : '';
          const delivered = /^(Delivered to Helper|Message sent\.)/.test(answer);
          const no = Number(step.args?.helper);
          if ((step.status === 'loading' || delivered) && Number.isFinite(no)) {
            elements.push(<HelperMessageLine key={step.id} no={no} text={step.args.message.trim()} to receipt={delivered ? answer.split(/\n\n\[/)[0] : undefined} />);
            return;
          }
        }
        // (in a helper's own steps: a message of the main agent that the helper read)
        if (step.tool === 'main_message' && typeof step.args?.message === 'string') {
          elements.push(<AgentMessageLine key={step.id} label="Message from the main agent" text={step.args.message.trim()} />);
          return;
        }
        if (step.tool === 'tell_main' && typeof step.args?.message === 'string' && step.args.message.trim()) {
          const answer = typeof step.result === 'string' ? step.result.trim() : '';
          const delivered = /^(Delivered to the main AI|Sent to the main AI)/.test(answer);
          if (step.status === 'loading' || delivered) {
            // ("AI" in the server's words for the helper; the chat says "agent")
            const receipt = delivered ? answer.split(/\n\n\[/)[0]!.replace(/\bthe main AI\b/g, 'the main agent') : (step.args?.wait_for_answer === true ? 'Waiting for the main agent to answer…' : undefined);
            elements.push(<AgentMessageLine key={step.id} label="Message to the main agent" text={step.args.message.trim()} receipt={receipt} />);
            return;
          }
        }

        // Say what the step actually did and found ("Found 5 classroom assignments: …")
        const described = describeStep(step.tool, step.args, step.result, step.status);
        // A connected app: its logo and name on the line (the words stay the described ones, "Found 2 events: …")
        const wording = connectorWording(step.tool, step.args, step.status);
        // A step with no words of its own: its own name said plainly, the app's operation for a connected app
        // ("Appending block children in Notion..."). Never one fixed line for every tool (owner, 2026-11-23).
        const opApp = ({ notion_connector: 'Notion', google_workspace_connector: 'Google Workspace', zoom_connector: 'Zoom' } as Record<string, string>)[step.tool];
        const plain = opApp && step.args?.operation ? plainStep(String(step.args.operation), step.status, ` in ${opApp}`) : plainStep(step.tool, step.status);
        const line = described ?? wording?.text ?? plain;
        elements.push(
          <ToolResultStep
            key={step.id}
            tool={step.tool}
            args={step.args}
            result={step.result}
            status={step.status}
            text={wording ? <AppStepLine icon={wording.icon} app={wording.app} invert={INVERT_IN_DARK.has(wording.app)}>{line}</AppStepLine> : line}
          />
        );
      }
    };
    shownSteps.forEach((step) => { drawStep(step); peerRowsAfter(step); agentRowsAfter(step); });

    flushThoughts();
    return elements.map((el, i) => React.isValidElement(el)
      ? <StepBoundary key={el.key ?? i} tool={(el.props as any)?.step?.tool}>{el}</StepBoundary>
      : el);
  })()}
</AgentStepper>
  );
  // Every step label keeps its shine until the whole reply is finished
  const stepperLive = <StepShineContext.Provider value={shineSteps}><StepWorkingContext.Provider value={!workDone}>{stepper}</StepWorkingContext.Provider></StepShineContext.Provider>;
  return toolSteps.length > 0 ? (
    <MasterWorkflowWrapper isFinished={workDone} durationMs={workedMs} stepCount={toolSteps.length}>
      {stepperLive}
    </MasterWorkflowWrapper>
  ) : stepperLive;
}
