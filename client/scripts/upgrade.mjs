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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentsDir = path.join(__dirname, 'src', 'components');

const colorMap = {
  // Backgrounds
  'bg-white': 'bg-background',
  'bg-zinc-950': 'bg-background',
  'bg-gray-50': 'bg-surface-1',
  'bg-slate-50': 'bg-surface-1',
  'bg-zinc-50': 'bg-surface-1',
  'bg-gray-100': 'bg-surface-2',
  'bg-slate-100': 'bg-surface-2',
  'bg-zinc-100': 'bg-surface-2',
  'bg-gray-900': 'bg-surface-1',
  'bg-slate-900': 'bg-surface-1',
  'bg-zinc-900': 'bg-surface-1',
  'bg-gray-800': 'bg-surface-2',
  'bg-slate-800': 'bg-surface-2',
  'bg-zinc-800': 'bg-surface-2',
  'bg-red-500': 'bg-danger',
  'bg-red-600': 'bg-danger',
  'bg-emerald-500': 'bg-success',
  'bg-green-500': 'bg-success',
  'bg-yellow-500': 'bg-warning',
  'bg-amber-500': 'bg-warning',
  
  // Texts
  'text-gray-500': 'text-muted-foreground',
  'text-slate-500': 'text-muted-foreground',
  'text-zinc-500': 'text-muted-foreground',
  'text-gray-400': 'text-muted-foreground',
  'text-slate-400': 'text-muted-foreground',
  'text-zinc-400': 'text-muted-foreground',
  'text-gray-900': 'text-foreground',
  'text-slate-900': 'text-foreground',
  'text-zinc-900': 'text-foreground',
  'text-gray-800': 'text-foreground',
  'text-zinc-100': 'text-foreground',
  'text-slate-100': 'text-foreground',
  'text-red-500': 'text-danger',
  'text-red-600': 'text-danger',
  'text-green-500': 'text-success',
  'text-emerald-500': 'text-success',
  'text-yellow-500': 'text-warning',
  'text-amber-500': 'text-warning',
  
  // Borders
  'border-gray-200': 'border-border',
  'border-slate-200': 'border-border',
  'border-zinc-200': 'border-border',
  'border-gray-100': 'border-border',
  'border-slate-100': 'border-border',
  'border-zinc-100': 'border-border',
  'border-gray-800': 'border-border',
  'border-slate-800': 'border-border',
  'border-zinc-800': 'border-border',
};

// Also apply structural changes depending on file name
const processFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Replace Colors
  Object.entries(colorMap).forEach(([oldClass, newClass]) => {
    // Look for whole words
    const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
    content = content.replace(regex, newClass);
  });

  // 2. Add Interactions
  const fileName = path.basename(filePath, '.tsx');

  // Universal interactable additions: Buttons, anchors
  // Look for className="..." and if it contains hover: or active: maybe enhance it.
  
  // Helper to safely add classes if not exist inside a specific component or general
  const ensureClass = (str, cls) => {
    if (!str.includes(cls)) {
      return `${str} ${cls}`;
    }
    return str;
  };

  // Specific component rules
  if (fileName.toLowerCase().includes('card') || filePath.includes('Card')) {
    // Add lift to card
    content = content.replace(/className={cn\(\s*"([^"]+)"/g, (match, classes) => {
      if (classes.includes('bg-card') || classes.includes('rounded-')) {
         return `className={cn(\n        "${ensureClass(classes, 'transition-all duration-200 ease-in-out hover:shadow-md hover:-translate-y-[2px]')}"`;
      }
      return match;
    });
  }

  if (fileName.toLowerCase().includes('button')) {
    content = content.replace(/className={cn\(\s*"([^"]+)"/g, (match, classes) => {
      return `className={cn(\n        "${ensureClass(classes, 'transition-all duration-200 ease-in-out active:scale-[0.98]')}"`;
    });
  }

  if (fileName.toLowerCase().includes('table')) {
    content = content.replace(/className={cn\(\s*"([^"]+)"/g, (match, classes) => {
      if (classes.includes('border-b') && classes.includes('transition-colors')) {
        return `className={cn(\n        "${ensureClass(classes, 'hover:bg-muted/50 data-[state=selected]:bg-muted')}"`;
      }
      return match;
    });
  }

  if (fileName.toLowerCase().includes('tabs')) {
    content = content.replace(/className={cn\(\s*"([^"]+)"/g, (match, classes) => {
      if (classes.includes('data-[state=active]')) {
        return `className={cn(\n        "${ensureClass(classes, 'transition-all duration-200 ease-in-out')}"`;
      }
      return match;
    });
  }

  if (fileName.toLowerCase().includes('dialog') || fileName.toLowerCase().includes('modal')) {
    // Modals: scale + fade (Dialog overlay and content)
    content = content.replace(/"data-\[state=open\]:animate-in[^"]*"/g, (match) => {
      if (match.includes('DialogOverlay')) {
        return `"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"`;
      }
      return `"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] transition-all duration-200 ease-out"`;
    });
  }
  
  if (fileName.toLowerCase().includes('dropdown')) {
    content = content.replace(/"data-\[state=open\]:animate-in[^"]*"/g, (match) => {
      return `"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 transition-all duration-200 ease-out"`;
    });
  }

  // Generic focus rings and disabled states across the board
  // Just generic string replacement for outline-none, add focus-visible:ring-2
  content = content.replace(/focus:outline-none/g, 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
};

const walkSync = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkSync(filePath);
    } else if (stat.isFile() && filePath.endsWith('.tsx')) {
      processFile(filePath);
    }
  }
};

walkSync(componentsDir);
console.log("Done updating components.");
