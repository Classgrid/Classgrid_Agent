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

import React from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/marketing_ui/toggle-group';
import { AgentStepper } from '@/components/ai/components/stepper/AgentStepper';
import { AgentStepAccordion } from '@/components/ai/components/stepper/AgentStepAccordion';
import { DatabaseQueryView } from '@/components/ai/components/stepper/DatabaseQueryView';
import { DocumentGenerationView } from '@/components/ai/components/stepper/DocumentGenerationView';
import { EmailSentView } from '@/components/ai/components/stepper/EmailSentView';
import { WebSearchView } from '@/components/ai/components/stepper/WebSearchView';
import { EmailActionView } from '@/components/ai/components/stepper/EmailActionView';
import { CombinedReasoningBlock } from '@/components/ai/components/stepper/CombinedReasoningBlock';
import { MasterWorkflowTestingWrapper } from '@/components/ai/components/stepper/MasterWorkflowTestingWrapper';

export function AgentUITestingPage() {
  const { theme, setTheme } = useTheme();
  const [visibleSteps, setVisibleSteps] = React.useState(0);
  const [typedText, setTypedText] = React.useState("");

  const fullText = "The user wants me to identify the students involved in the cafeteria incident, cross-reference their records, search for the school's disciplinary guidelines, draft an email to their parents, send it, and finally generate an official PDF warning letter.";

  // Progressive reveal simulation
  React.useEffect(() => {
    const intervals = [
      0,      
      5000,   
      7000,   
      9000,   
      11000,  
      13000   
    ];
    
    intervals.forEach((delay, index) => {
      setTimeout(() => {
        setVisibleSteps(index + 1);
      }, delay);
    });

    // Simulate typing effect starting at 0s and ending at 4.5s
    let words = fullText.split(" ");
    let currentWords = [];
    let wordIndex = 0;
    
    const typingInterval = setInterval(() => {
      if (wordIndex < words.length) {
        currentWords.push(words[wordIndex]);
        setTypedText(currentWords.join(" "));
        wordIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 4500 / words.length);

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-background text-foreground relative p-8 transition-colors duration-200">
      {/* Sleek Segmented Theme Toggle Button (Top Right) */}
      <div className="absolute top-4 right-4 bg-card border border-border rounded-full p-1 shadow-sm">
        <ToggleGroup
          type="single"
          value={theme}
          onValueChange={(val) => {
            if (val) setTheme(val);
          }}
          className="gap-1"
        >
          <ToggleGroupItem value="system" aria-label="System" className="rounded-full h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <Monitor className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="light" aria-label="Light" className="rounded-full h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <Sun className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" aria-label="Dark" className="rounded-full h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <Moon className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="max-w-[700px] mx-auto pt-16 space-y-4">
        {/* --- WORKFLOW 1: DISCIPLINARY EMAIL --- */}
        <div className="mb-12">
          <MasterWorkflowTestingWrapper totalTimeMs={30000}>
            <AgentStepper>
              {/* 1. First Thought */}
              {visibleSteps >= 1 && (
                <CombinedReasoningBlock
                  sentences={typedText ? [typedText] : []}
                  isStreaming={visibleSteps < 2}
                  autoFinishMs={5000}
                />
              )}

              {/* 2. Database Query */}
              {visibleSteps >= 2 && (
                <AgentStepAccordion
                  title="Querying database"
                  status="success"
                  defaultExpanded={false}
                  executionTimeMs={1000}
                >
                  <DatabaseQueryView
                    query='db.students.find({ incidents: "cafeteria_fight" })\n  .select({ name: 1, parentsEmail: 1 })'
                    results={[
                      {
                        _id: "stu_1",
                        name: "Student 1",
                        parentsEmail: "student1@demo.edu"
                      },
                      {
                        _id: "stu_2",
                        name: "Student 2",
                        parentsEmail: "student2@demo.edu"
                      }
                    ]}
                  />
                </AgentStepAccordion>
              )}

              {/* 3. Web Search */}
              {visibleSteps >= 3 && (
                <AgentStepAccordion
                  title="Searched the web"
                  status="success"
                  defaultExpanded={false}
                  executionTimeMs={2000}
                >
                  <WebSearchView
                    query="Classgrid demo school disciplinary guidelines for suspension"
                    searchDomain="classgrid.in"
                    results={[
                      {
                        title: "Student Code of Conduct & Disciplinary Guidelines",
                        url: "https://demo.classgrid.in/guidelines/conduct"
                      },
                      {
                        title: "Temporary Suspension Policy | Parent Handbook",
                        url: "https://demo.classgrid.in/parents/suspension-policy"
                      }
                    ]}
                  />
                </AgentStepAccordion>
              )}

              {/* 4. Drafted Email */}
              {visibleSteps >= 4 && (
                <AgentStepAccordion
                  title="Drafted email"
                  status="success"
                  defaultExpanded={false}
                  executionTimeMs={3000}
                >
                  <EmailActionView
                    to={Array.from({ length: 50 }, (_, i) => `student${i + 1}@demo.edu`).join(', ')}
                    subject="URGENT: Regarding the latest disciplinary action"
                    bodyPreview={`Dear Principal and Parents,\n\nI am writing to inform you that following the recent incident in the cafeteria, we have decided to implement a temporary suspension for the student involved.\n\nPlease refer to the attached documentation for full details on the incident report and the school board's disciplinary guidelines.\n\nBest regards,\nClassgrid AI Assistant`}
                  />
                </AgentStepAccordion>
              )}

              {/* 5. Sent Email */}
              {visibleSteps >= 5 && (
                <AgentStepAccordion
                  title="Sent email"
                  status="success"
                  defaultExpanded={false}
                  executionTimeMs={4000}
                >
                  <EmailSentView
                    toCount={50}
                    subject="URGENT: Regarding the latest disciplinary action"
                  />
                </AgentStepAccordion>
              )}

              {/* 6. Generated PDF */}
              {visibleSteps >= 6 && (
                <AgentStepAccordion
                  title="Generated PDF document"
                  status="success"
                  defaultExpanded={true}
                  executionTimeMs={5000}
                >
                  <DocumentGenerationView
                    fileName="official_warning_letter.pdf"
                    pageCount={3}
                    size="1.2 MB"
                  />
                </AgentStepAccordion>
              )}
            </AgentStepper>
          </MasterWorkflowTestingWrapper>
        </div>
      </div>
    </div>
  );
}
