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

import React, { ReactNode } from 'react';
import { AgentStepAccordion } from './AgentStepAccordion';
import { AgentStepper } from './AgentStepper';
import { CombinedReasoningBlock } from './CombinedReasoningBlock';
import { SimpleLogStepView } from './SimpleLogStepView';
import { KnowledgeBaseSearchView } from './KnowledgeBaseSearchView';
import { FileText, Plane, Network } from 'lucide-react';

export type WorkflowStepType = 
  | 'thought' 
  | 'log' 
  | 'knowledge_search';

export interface WorkflowStep {
  id: string | number;
  type: WorkflowStepType;
  title?: string;
  details?: string;
  text?: string;
  icon?: 'plane' | 'file' | 'network';
  results?: Array<{
    title: string;
    source?: string;
    icon?: 'plane' | 'file' | 'network';
  }>;
}

interface WorkflowAccordionProps {
  title: string;
  steps: WorkflowStep[];
  defaultExpanded?: boolean;
}

// Helper to resolve icon strings to components
const resolveIcon = (iconName?: string) => {
  if (iconName === 'plane') return <Plane className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />;
  if (iconName === 'file') return <FileText className="w-4 h-4" strokeWidth={2} />;
  if (iconName === 'network') return <Network className="w-4 h-4" strokeWidth={1.5} />;
  return undefined;
};

export function WorkflowAccordion({ title, steps, defaultExpanded = false }: WorkflowAccordionProps) {
  return (
    <AgentStepAccordion 
      title={`${steps.length} steps`}
      status="success" 
      defaultExpanded={defaultExpanded}
    >
      <AgentStepper>
        {steps.map((step) => {
          if (step.type === 'thought') {
            return (
              <CombinedReasoningBlock 
                key={step.id}
                sentences={[step.details || ""]}
              />
            );
          }
          
          if (step.type === 'log') {
            return (
              <SimpleLogStepView 
                key={step.id}
                text={step.text || ""} 
                icon={resolveIcon(step.icon)}
              />
            );
          }

          if (step.type === 'knowledge_search') {
            return (
              <KnowledgeBaseSearchView 
                key={step.id}
                providerIcon={<div className="w-4 h-4 bg-black dark:bg-white text-white dark:text-black rounded-sm flex items-center justify-center text-[10px] font-bold">N</div>}
                results={step.results?.map(r => ({
                  ...r,
                  icon: resolveIcon(r.icon)
                }))}
              />
            );
          }

          return null;
        })}
      </AgentStepper>
    </AgentStepAccordion>
  );
}
