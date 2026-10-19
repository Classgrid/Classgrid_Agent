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
const fs = require('fs');

const path = 'c:\\CLASSGRIDPLATFORM\\classgrid_platoform-desktop-\\client\\src\\features\\superadmin\\pages\\AgentUISandboxPage.tsx';
let code = fs.readFileSync(path, 'utf8');

// The file contains multiple AgentStepper components.
// We can split by '<AgentStepper>' and process each workflow block.
const parts = code.split('<AgentStepper>');

for (let i = 1; i < parts.length; i++) {
  let workflowStr = parts[i];
  
  let currentDelay = 0;
  
  // Replace all AgentStepAccordion to inject executionTimeMs if not present
  workflowStr = workflowStr.replace(/<AgentStepAccordion\s+title="[^"]+"\s+status="[^"]+"\s+defaultExpanded=\{[^}]+\}(?:\s+executionTimeMs=\{[^}]+\})?/g, (match) => {
    // If it already has executionTimeMs, keep it and update our counter
    if (match.includes('executionTimeMs=')) {
      const matchDelay = match.match(/executionTimeMs={(\d+)}/);
      if (matchDelay) {
        currentDelay = parseInt(matchDelay[1], 10);
      }
      return match;
    } else {
      // It doesn't have one. Generate one!
      currentDelay += 1200 + Math.floor(Math.random() * 500); // Add 1.2s to 1.7s per step
      return match + `\n              executionTimeMs={${currentDelay}}`;
    }
  });

  parts[i] = workflowStr;
}

const finalCode = parts.join('<AgentStepper>');
fs.writeFileSync(path, finalCode, 'utf8');
console.log('Successfully injected executionTimeMs into all workflows!');
