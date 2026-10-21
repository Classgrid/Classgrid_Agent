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

import React, { useState, useEffect, useMemo } from 'react';
import { useHierarchyTree } from '../queries/useHierarchyTree';
import { useTerminology } from '../hooks/useTerminology';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/marketing_ui/select';
import { Spinner } from '@/components/marketing_ui/spinner';
import type { HierarchyNode } from '../types/classroom.types';

interface HierarchySelectorProps {
  onDivisionSelect: (divisionId: string | null) => void;
  className?: string;
}

export const HierarchySelector: React.FC<HierarchySelectorProps> = ({ onDivisionSelect, className = '' }) => {
  const { data: treeData, isLoading: isTreeLoading } = useHierarchyTree();
  const { data: termData, isLoading: isTermLoading } = useTerminology();

  const [selections, setSelections] = useState<Record<number, string>>({});

  const hierarchyLabels = termData?.terminology?.hierarchy || [];
  const tree = treeData?.tree || [];

  // Reset downstream selections when an upstream selection changes
  const handleSelect = (levelIndex: number, nodeId: string) => {
    setSelections(prev => {
      const next = { ...prev, [levelIndex]: nodeId };
      // Clear all selections deeper than levelIndex
      Object.keys(next).forEach(key => {
        if (Number(key) > levelIndex) {
          delete next[Number(key)];
        }
      });
      return next;
    });
  };

  // Build the list of available options for each level based on current selections
  const levels = useMemo(() => {
    const result: { label: string; options: HierarchyNode[]; selectedValue: string | undefined }[] = [];
    
    let currentNodes = tree;
    for (let i = 0; i < hierarchyLabels.length; i++) {
      const selectedNodeId = selections[i];
      const selectedNode = currentNodes.find(n => n._id === selectedNodeId);
      
      result.push({
        label: hierarchyLabels[i],
        options: currentNodes,
        selectedValue: selectedNodeId
      });

      if (selectedNode && selectedNode.children && selectedNode.children.length > 0) {
        currentNodes = selectedNode.children;
      } else {
        // If no node selected, or selected node has no children, stop showing further dropdowns
        break;
      }
    }
    return result;
  }, [tree, hierarchyLabels, selections]);

  // When the deepest selection changes, call onDivisionSelect
  useEffect(() => {
    if (levels.length > 0) {
      let isLeaf = false;
      let leafId = null;

      let current = tree;
      for (let i = 0; i <= Object.keys(selections).length; i++) {
        const selId = selections[i];
        if (!selId) break;
        const node = current.find(n => n._id === selId);
        if (node) {
          if (!node.children || node.children.length === 0) {
            isLeaf = true;
            leafId = node._id;
            break;
          } else {
            current = node.children;
          }
        }
      }

      onDivisionSelect(isLeaf ? leafId : null);
    }
  }, [selections, levels, tree, hierarchyLabels, onDivisionSelect]);

  if (isTreeLoading || isTermLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="w-4 h-4" /> Loading hierarchy...</div>;
  }

  if (tree.length === 0) {
    return <div className="text-sm text-muted-foreground italic">No hierarchy structure available.</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {levels.map((level, index) => (
        <div key={index} className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{level.label}</label>
          <Select 
            value={level.selectedValue || ""} 
            onValueChange={(val) => handleSelect(index, val)}
          >
            <SelectTrigger className="w-full bg-white border-gray-200">
              <SelectValue placeholder={`Select ${level.label}`} />
            </SelectTrigger>
            <SelectContent>
              <div className="max-h-[220px] overflow-y-auto pr-1">
                {level.options.map(opt => (
                  <SelectItem key={opt._id} value={opt._id}>{opt.name}</SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
};
