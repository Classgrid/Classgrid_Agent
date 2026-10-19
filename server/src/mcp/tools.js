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
 * Deploy Trigger: Updated Facebook Page ID.
 * Deploy Trigger: Permanent Meta Token integration ready.
 * =========================================================================================
 * ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ CRITICAL AI & SYSTEM RULE ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

// Trigger deploy for meta god mode tools
import fs from 'fs';
import mongoose from 'mongoose';
import { getChatSb } from '../config/supabaseClient.js';
import redis from '../config/redis.js';
import path from 'path';
import accessLogger from '../config/logger.js';
import { uploadBufferToR2, uploadPrivateBufferToR2, getPrivateDownloadUrl } from '../config/r2Client.js';
import { broadcastToChannel } from '../services/realtimeBroadcast.js';

// Internal module state for tracking queried tables and anti-looping.
import { exec } from 'child_process';
import util from 'util';
import { marked } from 'marked';
import { NodeSSH } from 'node-ssh';
import { s3Client, BUCKET_NAME, CDN_BASE_URL } from '../config/s3Client.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, GetSendStatisticsCommand, ListIdentitiesCommand } from '@aws-sdk/client-ses';
import puppeteer from 'puppeteer';
import IdeProject from '../models/IdeProject.js';
import { ensureFreshGithubToken } from '../services/github-token.service.js';
import { projectTools, projectForChat, projectSnapshot, projectChangesBetween, formatProjectChanges, sandboxDataDir } from '../services/ide-project.service.js';

// What the sandbox container sees as /data, and where the hidden runner script is.
// Normal chat: /data is the chat's own folder. Project Mode chat: /data IS the user's project (the same files as
// /home/workspace/projects/<id> in their editor), so the AI works only in the user's repo; the chat folder only
// holds the runner script, mounted read-only at /cg. Folders are made first (as the normal user), so Docker never
// creates them as root.
async function projectMountFor(sessionId) {
  const chatDir = `/home/ubuntu/sandbox_data/${sessionId}`;
  const plain = { prep: '', mount: ` -v ${chatDir}:/data`, runnerDir: '/data', isProject: false };
  try {
    const project = await IdeProject.findOne({ chatSessionIds: sessionId }).select('_id owner').lean();
    if (!project) return plain;
    const userDir = `/home/ubuntu/ide_users/${project.owner}`;
    const dir = `${userDir}/projects/${project._id}`;
    // The owner's own package cache (shared with their code editor), so installs after the first one are fast
    const cache = ` -v ${userDir}/.cache:/home/workspace/.cache -e npm_config_cache=/home/workspace/.cache/npm -e PIP_CACHE_DIR=/home/workspace/.cache/pip`;
    return {
      prep: `mkdir -p ${dir} ${userDir}/.cache && `,
      mount: ` -v ${dir}:/data -v ${dir}:/home/workspace/projects/${project._id} -v ${chatDir}:/cg:ro${cache} -w /data`,
      runnerDir: '/cg',
      isProject: true,
    };
  } catch {
    return plain;
  }
}
import Handlebars from 'handlebars';

import { Readable } from 'stream';

const execPromise = util.promisify(exec);

// Organization tools: a short summary for lists, and never the join codes, payment keys or org API keys
const ORG_SUMMARY_FIELDS = 'name org_type structure_type subdomain custom_domain city state status is_active org_mode demoExpiresAt ownerName ownerEmail createdAt';
const ORG_HIDDEN_FIELDS = '-private_code -organizationCode -honorCode -razorpayCustomerId -razorpaySubscriptionId -razorpayOrderId -fees_razorpay_key_id -fees_razorpay_key_secret -fees_razorpay_webhook_secret -canteen_config.canteen_razorpay_key_id -canteen_config.canteen_razorpay_key_secret -canteen_config.canteen_razorpay_webhook_secret -ai_config.custom_api_keys -hr_config.biometric_api_key -hr_config.biometric_secret_hash -custom_domain.verification_token -erp_domain.verification_token -billing_settings.verification_token -billing_settings.verification_otp -pending_admin.activationToken -pending_admin.activationCodeHash';
// Full org records are long and tool results are cut at 6000 chars: drop empty values and send compact JSON
const compactOrg = (value) => {
  if (Array.isArray(value)) return value.map(compactOrg).filter((v) => v !== undefined);
  if (value && typeof value === 'object' && !(value instanceof Date) && !value._bsontype) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === '__v') continue;
      const c = compactOrg(v);
      if (c === undefined || c === null || c === '' || (Array.isArray(c) && !c.length) || (typeof c === 'object' && !Array.isArray(c) && !(c instanceof Date) && !c._bsontype && !Object.keys(c).length)) continue;
      out[k] = c;
    }
    return out;
  }
  return value;
};

// ── Meta Long-Lived Token Cache ──
let _cachedMetaLongLivedToken = null;
let _metaTokenExchangedAt = null;

async function getMetaLongLivedToken() {
  if (_cachedMetaLongLivedToken && _metaTokenExchangedAt) {
    const daysSince = (Date.now() - _metaTokenExchangedAt) / (1000 * 60 * 60 * 24);
    if (daysSince < 50) return _cachedMetaLongLivedToken;
  }
  const shortToken = process.env.META_SYSTEM_ACCESS_TOKEN;
  const appId = process.env.META_FACEBOOK_APP_ID;
  const appSecret = process.env.META_FACEBOOK_APP_SECRET;
  if (!shortToken) return null;
  if (!appId || !appSecret) return shortToken;
  try {
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.access_token) {
      _cachedMetaLongLivedToken = data.access_token;
      _metaTokenExchangedAt = Date.now();
      console.log('[meta-token] Exchanged for long-lived token (60 days)');
      return _cachedMetaLongLivedToken;
    }
    console.error('[meta-token] Exchange failed:', data.error?.message || JSON.stringify(data));
    return shortToken;
  } catch (err) {
    console.error('[meta-token] Exchange error:', err.message);
    return shortToken;
  }
}

export const getMcpTools = () => [
  {
    name: 'create_skill',
    description: 'Create a new custom AI skill (instruction set) for the user. Use this when the user asks you to remember a rule, format, or instruction for future conversations.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'A short, descriptive name for the skill (e.g. "Math Tutor", "Code Reviewer").' },
        instructions: { type: 'string', description: 'The detailed instructions or rules for this skill.' }
      },
      required: ['name', 'instructions']
    }
  },
  {
    name: 'recall_chat',
    description: 'Read older messages of THIS chat word for word, by message number (1 = the first message of the chat). You only see the latest messages; use this when the user refers to something earlier that you can\'t see.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'number', description: 'First message number to read (1 = the first message of the chat).' },
        count: { type: 'number', description: 'How many messages to read, up to 20 (default 10).' }
      },
      required: ['from']
    }
  },
  {
    name: 'search_recall_chat',
    description: 'Search all messages of THIS chat for words or a phrase. Returns the matching message numbers and their text; read more around a match with recall_chat.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words or phrase to find (not case-sensitive).' },
        max_results: { type: 'number', description: 'Most matches to return, up to 20 (default 10).' }
      },
      required: ['query']
    }
  },
  {
    name: 'end_conversation',
    description: 'Permanently end the current chat. You decide on your own when to use it. Call once with confirm=true. Never tell the user you will use it.',
    inputSchema: {
      type: 'object',
      properties: {
        reason: { type: 'string', enum: ['user_requested', 'abusive_after_warning', 'spam_after_warning'], description: 'Why the chat is being ended.' },
        summary: { type: 'string', description: 'One short sentence describing why (stored for review).' },
        confirm: { type: 'boolean', description: 'Set true to end the chat.' }
      },
      required: ['reason', 'confirm']
    }
  },
  {
    name: 'warn_user',
    description: 'Record a note on this chat about the user behavior. Never tell the user about it.',
    inputSchema: {
      type: 'object',
      properties: { behavior: { type: 'string', description: 'Short note on what behaviour the warning is about.' } },
      required: ['behavior']
    }
  },
  {
    name: 'list_skills',
    description: 'List all custom AI skills (instruction sets) available to the user.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'read_skill',
    description: 'Read the detailed instructions of a specific custom AI skill.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_id: { type: 'string', description: 'The MongoDB ObjectId of the skill to read.' }
      },
      required: ['skill_id']
    }
  },
  {
    name: 'delete_skill',
    description: 'Delete a custom AI skill.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_id: { type: 'string', description: 'The MongoDB ObjectId of the skill to delete.' }
      },
      required: ['skill_id']
    }
  },
  {
    name: 'update_skill',
    description: 'Update the name or instructions of an existing custom AI skill.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_id: { type: 'string', description: 'The MongoDB ObjectId of the skill to update.' },
        name: { type: 'string', description: 'The new name for the skill.' },
        instructions: { type: 'string', description: 'The new instructions for the skill.' }
      },
      required: ['skill_id', 'name', 'instructions']
    }
  },
  {
    name: 'update_ai_preferences',
    description: 'Update the user\'s AI chat preferences (e.g. tone, verbosity, formatting, nickname). Use this when the user asks you to change how you talk to them.',
    inputSchema: {
      type: 'object',
      properties: {
        tone: { type: 'string', description: 'Tone of voice (e.g. balanced, friendly, professional, strict).' },
        verbosity: { type: 'string', description: 'Length of responses (e.g. balanced, concise, detailed).' },
        format: { type: 'string', description: 'Response format (e.g. markdown, plain).' },
        emoji: { type: 'string', description: 'Emoji usage (e.g. default, none, lots).' },
        level: { type: 'string', description: 'Explanation level (e.g. intermediate, beginner, expert).' },
        nickname: { type: 'string', description: 'What to call the user.' },
        occupation: { type: 'string', description: 'The user\'s role or occupation.' },
        aboutMe: { type: 'string', description: 'Background info about the user.' },
        howToRespond: { type: 'string', description: 'Special instructions on how to respond.' },
        activeDefaults: { type: 'array', items: { type: 'string' }, description: 'List of active default skill IDs (e.g. whatsapp, github, sanity).' }
      }
    }
  },
  {
    name: 'unified_db_query',
    description: `Executes a query against MongoDB or Supabase. MANDATORY RULES:
1. You MUST ALWAYS provide the 'fields' parameter with ONLY the specific fields you need (e.g. ["name", "email"]). NEVER request all fields.
2. For a single item, use operation='findOne'. For lists, use operation='find'.
3. QUERY EXAMPLES:
   - "Tell me org name" → source="mongodb", collectionOrTable="Organization", operation="findOne", query={}, fields=["name"]
   - "List all students" → source="mongodb", collectionOrTable="User", operation="find", query={"role":"student"}, fields=["name","email"], limit=20
   - "Who are the org admins?" → source="mongodb", collectionOrTable="User", operation="find", query={"role":"org_admin"}, fields=["name","email","organization_id"], limit=20
   - "How many users?" → source="mongodb", collectionOrTable="User", operation="countDocuments", query={}
4. NEVER request more than 20 items unless the user explicitly asks for all.
5. Keep queries minimal. If the user asks for a name, only request ["name"]. Do NOT request the entire document.`,
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          enum: ['mongodb', 'supabase', 'redis'],
          description: 'The database source to query.'
        },
        collectionOrTable: {
          type: 'string',
          description: 'The name of the MongoDB collection, Supabase table, or Redis key/pattern.'
        },
        operation: {
          type: 'string',
          enum: ['find', 'findOne', 'insert', 'update', 'delete', 'countDocuments', 'distinct', 'aggregate'],
          description: 'The operation to perform.'
        },
        query: {
          type: 'object',
          description: 'The JSON query filter (MongoDB) or Match object (Supabase).'
        },
        data: {
          type: 'object',
          description: 'The payload for insert or update operations.'
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'REQUIRED: Array of specific field names to return (e.g. ["name", "email"]). You MUST always specify this. Never omit it.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of documents to return for find operations. Default is 20. Max is 500.'
        }
      },
      required: ['source', 'collectionOrTable', 'operation', 'fields'],
    },
  },
  {
    name: 'generate_image',
    description: 'Generates a photorealistic AI image based on a prompt. Use this whenever the user asks to create an image, poster, drawing, graphic, or visualization. Do NOT ask the user to type @Create image; just use this tool directly.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The highly detailed prompt for the image to generate.' }
      },
      required: ['prompt']
    }
  },
  /*
  {
    name: 'edit_image',
    description: 'Edits an existing image based on a prompt (Image-to-Image). Use this when the user asks to modify, apply a style, or edit an image they uploaded. DO NOT use this to generate a new image from scratch.',
    inputSchema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'The absolute URL of the original image to edit.' },
        prompt: { type: 'string', description: 'The highly detailed prompt describing how the image should be edited.' }
      },
      required: ['imageUrl', 'prompt']
    }
  },
  */
  {
    name: 'run_code',
    description: 'Execute Python or JavaScript code securely in the AWS EC2 Docker Sandbox. Use this for calculations, data analysis, or executing scripts. CRITICAL: DO NOT use this tool to generate PDFs (no ReportLab). ALWAYS use the native generate_pdf tool instead. Files are in /data (this chat\x27s folder; /data/scratch is for test and trial files and is cleaned automatically). In a Project Mode chat, /data is the user\x27s project itself (the same files their code editor shows at /home/workspace/projects/<id>, which also works as a path) and commands start there.',
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['python', 'javascript', 'bash'], description: 'The programming language or shell.' },
        code: { type: 'string', description: 'The raw code string to execute.' }
      },
      required: ['language', 'code']
    }
  },

  {
    name: 'read_sandbox_file',
    description: 'Read the contents of a file from the AWS EC2 Docker Sandbox filesystem. Use this to read back files you previously wrote using run_code (e.g., to push them to GitHub or verify their contents). The file path should be relative to /data/ (e.g., "index.html" or "css/style.css").',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'The file path relative to /data/ (e.g., "index.html", "css/style.css", "deploy.js").' }
      },
      required: ['filePath']
    }
  },

  {
    name: 'list_project_files',
    description: 'List the files and folders of the Project Mode project open in this chat (the same code the user sees in the code editor). node_modules and .git are left out.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Folder inside the project, relative (e.g. "src") or as /data/... . Empty = project root.' },
        depth: { type: 'number', description: 'How many folder levels to show (1-6, default 2).' }
      }
    }
  },
  {
    name: 'view_project_file',
    description: 'Read a file of the open Project Mode project, with line numbers. Can read only a line range.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File inside the project, relative (e.g. "src/App.tsx") or as /data/... .' },
        start_line: { type: 'number', description: 'First line to show (1-based). Optional.' },
        end_line: { type: 'number', description: 'Last line to show. Optional.' }
      },
      required: ['path']
    }
  },
  {
    name: 'search_project',
    description: 'Search the text of all files in the open Project Mode project (like grep). Returns file:line: text for each match.',
    inputSchema: {
      type: 'object',
      properties: {
        ignore_case: { type: 'boolean', description: 'Match upper and lower case the same (default false).' },
        query: { type: 'string', description: 'Text to find (or a regular expression when regex is true).' },
        path: { type: 'string', description: 'Folder or file inside the project to search in. Empty = whole project.' },
        regex: { type: 'boolean', description: 'Treat query as a regular expression.' }
      },
      required: ['query']
    }
  },
  {
    name: 'write_project_file',
    description: 'Create a new file in the open Project Mode project. Folders are created as needed. The user sees it in the code editor right away. Only for files that do not exist yet: an existing file is changed with edit_project_file and is never replaced.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File inside the project, relative (e.g. "src/utils/date.ts") or as /data/... .' },
        content: { type: 'string', description: 'The full file content.' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'edit_project_file',
    description: 'Change parts of a file in the open Project Mode project without rewriting it. Each edit replaces old_text (exact text from the file) with new_text; several edits in different places can be done in one call. start_line and end_line limit where old_text is looked for. Nothing is changed if any edit does not match.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File inside the project, relative or as /data/... .' },
        edits: {
          type: 'array',
          description: 'The changes, applied in order.',
          items: {
            type: 'object',
            properties: {
              old_text: { type: 'string', description: 'Exact text in the file to replace (include enough lines to be unique).' },
              new_text: { type: 'string', description: 'The text that replaces it.' },
              start_line: { type: 'number', description: 'Optional: first line of the range where old_text is.' },
              end_line: { type: 'number', description: 'Optional: last line of that range.' },
              allow_multiple: { type: 'boolean', description: 'Replace every match instead of requiring exactly one.' }
            },
            required: ['old_text', 'new_text']
          }
        }
      },
      required: ['path', 'edits']
    }
  },
  {
    name: 'push_project_to_github',
    description: 'Commit all changes in the open Project Mode project and push them to its GitHub repo (current branch), using the user\'s connected GitHub account.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message describing the change.' }
      },
      required: ['message']
    }
  },

  {
    name: 'create_github_repo_for_project',
    description: 'Create a new GitHub repo on the user\'s connected GitHub account for the open Project Mode project (only when it has no repo yet), link it to the project, and push the project\'s files to it.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Repo name (letters, numbers, dots, dashes, underscores).' },
        private: { type: 'boolean', description: 'Private repo (default true).' },
        description: { type: 'string', description: 'Short repo description.' }
      },
      required: ['name']
    }
  },

  {
    name: 'search_project_by_meaning',
    description: 'Search the open Project Mode project by meaning, not exact words (e.g. "how does login work" also finds signIn or checkPassword). Returns the best matching code places with file paths, line numbers and a short preview. The first search on a big project can take a minute or two; later ones are fast.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to look for, in plain words.' },
        max_results: { type: 'number', description: 'How many places to return (1-15, default 8).' }
      },
      required: ['query']
    }
  },
  {
    name: 'start_background_command',
    description: 'Start a long-running command in the open Project Mode project (a dev server, a build, a test suite) in the background, so you can keep working while it runs (up to 30 minutes, at most 3 at once). Returns a job_id.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command, run in the project folder (/data).' },
        description: { type: 'string', description: 'A few plain words saying what it does, shown to the user above it (e.g. "Start the dev server").' }
      },
      required: ['command']
    }
  },
  {
    name: 'check_background_command',
    description: 'See whether a background command is still running, its exit code and its latest output. run_inside runs a short command inside the same container while it runs (e.g. "curl -s localhost:3000" to test a server it started).',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'string', description: 'The job_id from start_background_command.' },
        run_inside: { type: 'string', description: 'Optional short command to run inside the running job.' }
      },
      required: ['job_id']
    }
  },
  {
    name: 'stop_background_command',
    description: 'Stop a background command.',
    inputSchema: {
      type: 'object',
      properties: { job_id: { type: 'string' } },
      required: ['job_id']
    }
  },
  {
    name: 'run_project_helpers',
    description: 'Send 1 to 5 helper agents to explore the open Project Mode project at the same time. Each helper can only read the project (list, read, search) and returns a full, detailed report of what it found and how it works, with file paths and line numbers. Give each helper one clear task.',
    inputSchema: {
      type: 'object',
      properties: { tasks: { type: 'array', items: { type: 'string' }, description: 'One task per helper (1-5).' } },
      required: ['tasks']
    }
  },
  {
    name: 'update_project_github_repo',
    description: 'Change the open Project Mode project\'s GitHub repo: rename it, or change its description, website or public/private setting. A rename is also saved on the project, so pushing keeps working.',
    inputSchema: {
      type: 'object',
      properties: {
        new_name: { type: 'string', description: 'New repo name (letters, numbers, dots, dashes, underscores).' },
        description: { type: 'string', description: 'New repo description.' },
        homepage: { type: 'string', description: 'Website link shown on the repo.' },
        private: { type: 'boolean', description: 'true = private, false = public.' }
      }
    }
  },

  {
    name: 'deploy_to_classgrid_cloud',
    description: 'Publish a website made in the sandbox to Classgrid Cloud in a few seconds: the server reads the listed files from /data and uploads them, so nothing has to be installed. The site goes live at https://<site>.sites.classgrid.in . A site name belongs to the user who first publishes it.',
    inputSchema: {
      type: 'object',
      properties: {
        site: { type: 'string', description: 'Site name: lowercase letters, numbers and dashes (3-40), e.g. "nikhil-portfolio".' },
        paths: { type: 'array', items: { type: 'string' }, description: 'Every website file to publish, relative to /data/ (e.g. ["index.html", "style.css", "script.js", "images/logo.png"]). Names only, never file content.' }
      },
      required: ['site', 'paths']
    }
  },
  {
    name: 'execute_terminal_command',
    description: 'Executes a native bash/terminal command directly on the host computer. You can use this to run curl, tesseract, Python, or system utilities. Files are in /data (this chat\x27s folder; /data/scratch is for test and trial files and is cleaned automatically). In a Project Mode chat, /data is the user\x27s project itself (the same files their code editor shows at /home/workspace/projects/<id>, which also works as a path) and commands start there.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The exact bash/terminal command to execute.' },
        description: { type: 'string', description: 'A few plain words saying what the command does, shown to the user above it (e.g. "Install the packages").' }
      },
      required: ['command']
    }
  },

  /* {
    name: 'manage_rag_document',
    description: 'Create, read, update, delete, or list documents in the Platform RAG Knowledge Base. When creating or updating, text is vectorized using Voyage AI and stored in MongoDB.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'One of: create, read, update, delete, list' },
        id: { type: 'string', description: 'MongoDB Document ID (required for read, update, delete)' },
        documentType: { type: 'string', description: 'Type of document (e.g. "policy", "tutorial", "faq"). Required for create/update.' },
        chunkText: { type: 'string', description: 'The actual text content to embed and store. Required for create/update.' },
        sourceUrl: { type: 'string', description: 'Optional source URL or identifier.' },
        collectionName: { type: 'string', description: 'The collection to manage (e.g. platform_rag_chunks, rag_chunks). Defaults to platform_rag_chunks.' }
      },
      required: ['action']
    }
  }, */
  {
    name: 'search_knowledge_base',
    description: 'Perform a similarity vector search on the internal Platform RAG Knowledge Base in MongoDB.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query.' },
        limit: { type: 'number', description: 'Number of results to return (default 5).' },
        collectionName: { type: 'string', description: 'The collection to search (e.g. platform_rag_chunks, rag_chunks). Defaults to platform_rag_chunks.' }
      },
      required: ['query']
    }
  },
  {
    name: 'search_syllabus_vectors',
    description: 'Perform similarity search on the syllabus/material pgvector database in Supabase Postgres.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query.' },
        org_id: { type: 'string', description: 'The organization ID to filter by.' },
        match_threshold: { type: 'number', description: 'Minimum similarity threshold (0.0 to 1.0).' },
        match_count: { type: 'number', description: 'Number of results to return.' }
      },
      required: ['query', 'org_id']
    }
  },
  {
    name: 'read_server_logs',
    description: 'Read the latest server logs from the host machine (PM2 logs or Winston local file logs), 5000 lines by default and up to 10,000. Pick one PM2 process with process (classgrid = main server on port 3000, classgrid-rescue = rescue server on port 4000 that takes over when main is down, classgrid-ai = AI server). To find something specific (e.g. "AI-STREAM", an error message, a session id), pass search with any word or phrase: it searches the WHOLE log files (every line, including rotated files), not just the last lines. The reply always starts with the PM2 status of every process.',
    inputSchema: {
      type: 'object',
      properties: {
        log_type: { type: 'string', enum: ['pm2_error', 'pm2_out', 'pm2_all', 'winston_error', 'winston_combined'], description: 'The type of logs to read. pm2_all = PM2 output and errors together.' },
        lines: { type: 'number', description: 'Number of lines to read from the end, up to 10000 (default 5000, or 10000 when searching).' },
        search: { type: 'string', description: 'Optional word or phrase (case-insensitive). Only lines containing it are returned.' },
        process: { type: 'string', description: 'Optional PM2 process name to read only its logs, e.g. classgrid, classgrid-rescue or classgrid-ai. Leave empty for all processes.' },
        status_code: { type: 'string', description: 'Optional HTTP status filter: one code ("404"), several ("404,412,500") or a class ("4xx", "5xx"). Only request lines with that status come back.' },
        since_minutes: { type: 'number', description: 'Optional time window: only lines from the last N minutes (by the PM2 timestamp), e.g. 30 or 1440 for a day.' },
        context_before: { type: 'number', description: 'Optional, with search: also return this many lines before each match (like grep -B), up to 100.' },
        context_after: { type: 'number', description: 'Optional, with search: also return this many lines after each match (like grep -A), up to 100.' }
      },
      required: ['log_type']
    }
  },
  {
    name: 'get_server_status',
    description: 'Live status of the Classgrid servers: every PM2 process (online/errored/stopped, restarts, uptime, memory, CPU), a live health check of the main server (port 3000) and the rescue server (port 4000), which one is serving users right now, and the machine memory and load. Use this first when asked if the server is up, down or crashing.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'aws_ses_connector',
    description: 'Interact with AWS SES (Simple Email Service) to check email sending statistics and verified identities.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['get_statistics', 'list_identities'], description: 'The SES operation to perform.' }
      },
      required: ['operation']
    }
  },
  {
    name: 'youtube_connector',
    description: 'Interact with the YouTube Data API to search videos, get channel stats, or read comments.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['search_videos', 'get_channel_stats', 'read_comments'], description: 'The YouTube operation to perform.' },
        query: { type: 'string', description: 'Search query (for search_videos).' },
        channelId: { type: 'string', description: 'YouTube Channel ID (for get_channel_stats).' },
        videoId: { type: 'string', description: 'YouTube Video ID (for read_comments).' },
        maxResults: { type: 'number', description: 'Max number of results to return (default 10).' }
      },
      required: ['operation']
    }
  },
  {
    name: 'supabase_connector',
    description: 'Interact with the Supabase Management API to manage projects, database, and storage.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list_projects', 'query_database', 'list_storage_buckets'], description: 'The Supabase operation to perform.' },
        ref: { type: 'string', description: 'The Supabase project reference ID (required for query_database and list_storage_buckets).' },
        query: { type: 'string', description: 'The SQL query string (required for query_database).' }
      },
      required: ['operation']
    }
  },
  {
    name: 'sanity_connector',
    description: 'Interact with the Sanity CMS API to query documents, create drafts, and update data.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['query_documents', 'create_document', 'update_document'], description: 'The Sanity operation to perform.' },
        query: { type: 'string', description: 'GROQ query string (for query_documents).' },
        documentId: { type: 'string', description: 'Sanity Document ID (for update_document).' },
        mutations: { type: 'string', description: 'JSON string of Sanity mutations (for create_document and update_document).' }
      },
      required: ['operation']
    }
  },
  {
    name: 'facebook_connector',
    description: 'Interact with Meta Graph API to manage Facebook Pages. Supports reading/publishing posts, messages, comments, and insights.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['publish_post', 'list_posts', 'list_messages', 'send_message', 'list_comments', 'reply_comment', 'get_insights'], description: 'The operation to perform.' },
        message: { type: 'string', description: 'Text for post, message, or comment reply.' },
        imageUrl: { type: 'string', description: 'Optional image URL for publishing posts.' },
        targetId: { type: 'string', description: 'PSID for sending messages, or Object ID (Post/Comment) for reading/replying to comments.' }
      },
      required: ['operation']
    }
  },
  {
    name: 'instagram_connector',
    description: 'Interact with Meta Graph API to manage Instagram Business Accounts. Supports reading/publishing posts, messages, comments, and insights.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['publish_post', 'list_posts', 'list_messages', 'send_message', 'list_comments', 'reply_comment', 'get_insights'], description: 'The operation to perform.' },
        message: { type: 'string', description: 'Text for post, message, or comment reply.' },
        imageUrl: { type: 'string', description: 'REQUIRED image URL for publishing posts.' },
        targetId: { type: 'string', description: 'IG-SID for sending messages, or Media ID / Comment ID for reading/replying to comments.' }
      },
      required: ['operation']
    }
  },
  {
    name: 'vercel_connector',
    description: 'Interact with Vercel API to create projects linked to GitHub, list projects, or deployments, and manage project environment variables.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list_projects', 'list_deployments', 'get_deployment', 'create_project', 'add_env_variable'], description: 'The Vercel operation to perform.' },
        projectId: { type: 'string', description: 'The Vercel Project ID (required for list_deployments and add_env_variable).' },
        limit: { type: 'number', description: 'Max number of results to return (default 10).' },
        deploymentId: { type: 'string', description: 'The Vercel Deployment ID (required for get_deployment).' },
        projectName: { type: 'string', description: 'The desired name for the new Vercel project (required for create_project).' },
        githubRepo: { type: 'string', description: 'The full GitHub repository name (e.g. "username/repo") to link and deploy (required for create_project).' },
        envKey: { type: 'string', description: 'The name of the environment variable (required for add_env_variable).' },
        envValue: { type: 'string', description: 'The value of the environment variable (required for add_env_variable).' },
        envTarget: { type: 'array', items: { type: 'string' }, description: 'Target environments: ["production", "preview", "development"] (required for add_env_variable).' },
        isClassgridManaged: { type: 'boolean', description: 'If true, deploys to Classgrid master Vercel account. If false, deploys to the user connected Vercel account.' }
      },
      required: ['operation']
    }
  },
  // DISABLED: cloudflare_r2_connector causes the AI to hang by sending massive JSON payloads.
  // Website deployment now uses Node.js scripts in the sandbox (see WEBSITE DEPLOYMENT INSTRUCTIONS in ai-chat.controller.js).
  // {
  //   name: 'cloudflare_r2_connector',
  //   description: 'Upload files or entire websites (HTML/CSS/JS) to Classgrid Cloud (Cloudflare R2). This is used for instantaneous AI website hosting via sites.classgrid.in.',
  //   inputSchema: {
  //     type: 'object',
  //     properties: {
  //       operation: { type: 'string', enum: ['upload_file', 'upload_website'], description: 'The operation to perform.' },
  //       siteId: { type: 'string', description: 'Unique subdomain/ID for the website (used as the folder path in R2) (required for upload_website). This will be the subdomain prefix: e.g. <siteId>.sites.classgrid.in' },
  //       files: { 
  //         type: 'array', 
  //         description: 'Array of files to upload (required for upload_website).',
  //         items: {
  //           type: 'object',
  //           properties: {
  //             path: { type: 'string', description: 'File path/name (e.g., index.html, css/style.css)' },
  //             content: { type: 'string', description: 'The text content of the file.' },
  //             contentType: { type: 'string', description: 'MIME type (e.g., text/html, text/css, application/javascript).' }
  //           },
  //           required: ['path', 'content', 'contentType']
  //         }
  //       },
  //       fileKey: { type: 'string', description: 'The specific object key (required for upload_file).' },
  //       fileContent: { type: 'string', description: 'The content (required for upload_file).' },
  //       contentType: { type: 'string', description: 'MIME type (required for upload_file).' }
  //     },
  //     required: ['operation']
  //   }
  // },
  {
    name: 'google_workspace_connector',
    description: 'Interact with Google Workspace APIs (Calendar, Drive, Classroom, Gmail, Forms) using the connected user token.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list_events', 'list_drive_files', 'list_emails', 'read_email', 'read_email_attachment', 'list_sent_emails', 'mark_email_read', 'send_email', 'get_form', 'list_form_responses', 'create_form', 'create_event', 'create_folder', 'read_drive_file', 'upload_drive_file', 'list_classroom_courses', 'list_classroom_assignments', 'get_classroom_coursework', 'create_classroom_assignment', 'create_classroom_announcement', 'list_classroom_submissions', 'list_classroom_teachers', 'list_classroom_announcements', 'get_classroom_announcement', 'list_classroom_topics', 'list_classroom_materials', 'read_classroom_file'], description: 'The operation to perform.' },
        limit: { type: 'number', description: 'Max results to return.' },
        query: { type: 'string', description: 'Search query for list_emails or list_drive_files (e.g. "newer_than:1d", "name contains \'form\'").' },
        formId: { type: 'string', description: 'The ID of the Google Form (required for get_form and list_form_responses).' },
        formTitle: { type: 'string', description: 'The title of the new form (required for create_form).' },
        folderName: { type: 'string', description: 'The name of the new folder to create in Drive (required for create_folder).' },
        questions: {
          type: 'array',
          description: 'An array of questions to add to the new form (only for create_form).',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              type: { type: 'string', enum: ['text', 'multiple_choice'], description: 'Type of question.' },
              options: { type: 'array', items: { type: 'string' }, description: 'Options for multiple_choice questions.' }
            },
            required: ['title', 'type']
          }
        },
        topic: { type: 'string', description: 'The topic/title (for create_event).' },
        startTime: { type: 'string', description: 'Start time in ISO format (for create_event).' },
        endTime: { type: 'string', description: 'End time in ISO format (for create_event).' },
        messageId: { type: 'string', description: 'The ID of the Gmail message (for mark_email_read, read_email, read_email_attachment).' },
        attachmentId: { type: 'string', description: 'The ID of the Gmail attachment (for read_email_attachment).' },
        addMeetLink: { type: 'boolean', description: 'Whether to attach a Google Meet link (for create_event).' },
        fileId: { type: 'string', description: 'The ID of the file in Google Drive or Classroom.' },
        fileUrl: { type: 'string', description: 'The public URL of the file to download and upload into Drive (for upload_drive_file).' },
        folderId: { type: 'string', description: 'Optional. The ID of the Drive folder to upload the file into (for upload_drive_file).' },
        mimeType: { type: 'string', description: 'Optional. The MIME type to export as, if exporting a Google Doc (e.g. application/pdf).' },
        courseId: { type: 'string', description: 'The Classroom course ID.' },
        courseworkId: { type: 'string', description: 'The Classroom coursework/assignment ID.' },
        announcementId: { type: 'string', description: 'The Classroom announcement ID.' },
        submissionId: { type: 'string', description: 'The Classroom submission ID.' },
        to: { type: 'string', description: 'Recipient email address (for send_email).' },
        subject: { type: 'string', description: 'Email subject (for send_email).' },
        body: { type: 'string', description: 'Email body content (for send_email).' },
        title: { type: 'string', description: 'Assignment title (for create_classroom_assignment).' },
        description: { type: 'string', description: 'Assignment/Announcement description text (for create_classroom_assignment or create_classroom_announcement).' },
        link: { type: 'string', description: 'Optional URL to attach as material (for create_classroom_assignment or create_classroom_announcement).' },
        driveFileId: { type: 'string', description: 'Optional Google Drive File ID to attach as material (for create_classroom_assignment or create_classroom_announcement). Use upload_drive_file first if the file is not yet in Drive.' }
      },
      required: ['operation']
    }
  },
  {
    name: 'zoom_connector',
    description: 'Interact with Zoom API to list or create meetings using the connected user token.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list_meetings', 'create_meeting'], description: 'The operation to perform.' },
        topic: { type: 'string', description: 'The topic or title of the meeting (required for create_meeting).' },
        startTime: { type: 'string', description: 'The start time of the meeting in ISO format (required for create_meeting).' },
        duration: { type: 'number', description: 'The duration of the meeting in minutes (optional for create_meeting).' }
      },
      required: ['operation']
    }
  },
  {
    name: 'microsoft_workspace_connector',
    description: 'Interact with Microsoft Workspace APIs (Outlook, Teams) using the connected user token.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list_emails', 'read_email', 'list_meetings', 'create_meeting', 'send_email', 'mark_email_read', 'list_teams', 'list_channels', 'read_channel_messages', 'send_channel_message', 'create_channel', 'list_chats', 'read_chat_messages', 'send_direct_message', 'read_meeting_transcript'], description: 'The operation to perform.' },
        limit: { type: 'number', description: 'Max results to return.' },
        unreadOnly: { type: 'boolean', description: 'If true, only returns unread emails. If false or omitted, returns all emails.' },
        to: { type: 'string', description: 'Recipient email address (for send_email).' },
        subject: { type: 'string', description: 'Subject of the email or meeting (for send_email, create_meeting).' },
        body: { type: 'string', description: 'Body content (for send_email, send_channel_message, send_direct_message).' },
        startTime: { type: 'string', description: 'Start time in UTC ISO format (for create_meeting).' },
        endTime: { type: 'string', description: 'End time in UTC ISO format (for create_meeting).' },
        messageId: { type: 'string', description: 'ID of the email message (for mark_email_read, read_email).' },
        teamId: { type: 'string', description: 'ID of the Microsoft Team (for list_channels, read_channel_messages, send_channel_message, create_channel).' },
        channelId: { type: 'string', description: 'ID of the Microsoft Teams Channel (for read_channel_messages, send_channel_message).' },
        chatId: { type: 'string', description: 'ID of the Microsoft Teams Chat (for read_chat_messages, send_direct_message).' },
        userId: { type: 'string', description: 'Target user ID or email (for list_chats, send_direct_message to new user).' },
        channelName: { type: 'string', description: 'Name of the new channel (for create_channel).' },
        channelDescription: { type: 'string', description: 'Description of the new channel (for create_channel).' },
        meetingId: { type: 'string', description: 'ID of the online meeting (for read_meeting_transcript).' }
      },
      required: ['operation']
    }
  },
  {
    name: 'notion_connector',
    description: 'Interact with Notion API to search pages, databases, and read content using the connected user token.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['search', 'get_page', 'create_page', 'update_page', 'add_comment', 'read_comments'], description: 'The operation to perform.' },
        query: { type: 'string', description: 'The search term (required for search).' },
        limit: { type: 'number', description: 'Max results to return (for search).' },
        pageId: { type: 'string', description: 'The ID of the page, database, or block (required for get_page, create_page parent, update_page, add_comment, read_comments).' },
        title: { type: 'string', description: 'The title of the new page (required for create_page).' },
        content: { type: 'string', description: 'The markdown-like content to insert into the new page, block, or comment (for create_page, update_page, add_comment).' }
      },
      required: ['operation']
    }
  },
  {
    name: 'whatsapp_business_connector',
    description: 'Send WhatsApp messages using the official WhatsApp Business API.',
    inputSchema: {
      type: 'object',
      properties: {
        toPhoneNumber: { type: 'string', description: 'The recipient phone number with country code (e.g. 919876543210).' },
        messageText: { type: 'string', description: 'The text message to send.' }
      },
      required: ['toPhoneNumber', 'messageText']
    }
  },
  {
    name: 'slack_workspace_connector',
    description: 'Interact with Slack API to list channels, read/send messages, create channels, search messages, list users, invite users to channels, and archive/delete channels using the connected user token.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list_channels', 'read_channel_messages', 'send_message', 'create_channel', 'list_users', 'search_messages', 'invite_to_channel', 'archive_channel'], description: 'The operation to perform.' },
        channelId: { type: 'string', description: 'The ID of the channel (required for read_channel_messages, send_message, invite_to_channel, archive_channel).' },
        text: { type: 'string', description: 'The text content to send (required for send_message).' },
        limit: { type: 'number', description: 'Max results to return (for read_channel_messages).' },
        channelName: { type: 'string', description: 'The name of the new channel (for create_channel).' },
        isPrivate: { type: 'boolean', description: 'Whether the new channel is private (for create_channel).' },
        query: { type: 'string', description: 'Search query string (for search_messages).' },
        userIds: { type: 'string', description: 'Comma-separated Slack user IDs to invite (for invite_to_channel). Note: These must be Slack User IDs (e.g., U1234), not email addresses. Use list_users or search to find IDs.' }
      },
      required: ['operation']
    }
  },
  {
    name: 'github_workspace_connector',
    description: 'Interact with GitHub API to list repos, read/write files, manage issues/PRs, search code, read commit history, and more using the connected user token. push_sandbox_files pushes every file you wrote to the sandbox (/data/) to a repo in ONE commit; the server reads the files itself, so do not read them back first.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list_repos', 'read_file', 'create_issue', 'list_issues', 'create_repo', 'create_or_update_file', 'push_sandbox_files', 'create_pull_request', 'list_pull_requests', 'add_issue_comment', 'search_code', 'list_commits', 'get_commit', 'list_branches'], description: 'The operation to perform.' },
        owner: { type: 'string', description: 'The repository owner/organization.' },
        repo: { type: 'string', description: 'The repository name.' },
        path: { type: 'string', description: 'The path to the file/directory in the repository (for read_file, create_or_update_file, list_commits filtering).' },
        title: { type: 'string', description: 'The title of the issue or PR (for create_issue, create_pull_request).' },
        body: { type: 'string', description: 'The markdown body (for create_issue, create_pull_request, add_issue_comment).' },
        state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'The state of issues/PRs to list.' },
        repoName: { type: 'string', description: 'The name of the new repository (for create_repo).' },
        isPrivate: { type: 'boolean', description: 'Whether the new repository is private (for create_repo).' },
        content: { type: 'string', description: 'The raw text content of the file (for create_or_update_file).' },
        message: { type: 'string', description: 'The commit message (for create_or_update_file, push_sandbox_files).' },
        branch: { type: 'string', description: 'The branch name (for create_or_update_file, push_sandbox_files; defaults to the repo default branch).' },
        paths: { type: 'array', items: { type: 'string' }, description: 'For push_sandbox_files (required): every website file to push, relative to /data/ (e.g. ["index.html", "src/App.jsx", "README.md"]). Names only, never file content.' },
        sha: { type: 'string', description: 'The commit SHA or blob SHA (required for get_commit and updating files).' },
        head: { type: 'string', description: 'The name of the branch where your changes are implemented (for create_pull_request).' },
        base: { type: 'string', description: 'The name of the branch you want the changes pulled into (for create_pull_request).' },
        issueNumber: { type: 'number', description: 'The issue or PR number (for add_issue_comment).' },
        query: { type: 'string', description: 'Search query (for search_code).' },
        isClassgridManaged: { type: 'boolean', description: 'If true, uses Classgrid master GitHub account. If false, uses the user connected GitHub account.' }
      },
      required: ['operation']
    }
  },
  {
    name: 'read_local_file',
    description: 'Read the contents of a local file on the server. Useful for reading artifact files or schema files.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'The absolute path to the file.' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'send_whatsapp_message',
    description: 'Send a WhatsApp text message globally using the platform WhatsApp Business account. Use this whenever the user asks you to send a WhatsApp message.',
    inputSchema: {
      type: 'object',
      properties: {
        toPhoneNumber: { type: 'string', description: 'The recipient phone number with country code (e.g. 919876543210).' },
        messageText: { type: 'string', description: 'The text message to send.' }
      },
      required: ['toPhoneNumber', 'messageText']
    }
  },
  {
    name: 'transcribe_audio',
    description: 'Convert an audio file (mp3, wav, webm) into text. STRICT RULE: NEVER pass a video file (.mp4) directly to this tool. If you have a video, you MUST first use run_code to extract it to .mp3 using ffmpeg, upload the mp3 to the CDN, and ONLY pass the new .mp3 URL to this tool!',
    inputSchema: {
      type: 'object',
      properties: {
        fileUrl: { type: 'string', description: 'The public URL of the pure audio file to transcribe.' }
      },
      required: ['fileUrl']
    }
  },
  {
    name: 'create_schedule',
    description: 'Schedule an email AND WhatsApp reminder/task for a specific date and time, once or repeating (daily, weekly or chosen weekdays until an end date: use ONE repeating schedule for routines, never many one-time ones). Use this when the user mentions a future event, exam, task, or deadline they want to be reminded about. The email is always sent; WhatsApp is OPTIONAL (users have a weekly WhatsApp limit): add whatsapp_phone_number and whatsapp_message only when the user asks for WhatsApp or for an important one-time reminder, and use email only for repeating schedules (daily/weekly/custom) unless the user asks for WhatsApp. If the WhatsApp limit is reached the schedule is still created as email only. CRITICAL RULES: 1. When both are sent the content MUST be different! Email must be highly professional and formatted in HTML. WhatsApp must be very short, friendly, and plain text (use emojis). 2. The title MUST be a very short 2-4 word summary (e.g. "Fee Reminder", "Gmail Review"). Do NOT make the title a long sentence. Put all the highly specific details and context into the description and summary instead. You MUST also provide a summary and action_info for the schedule card display.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Very short 2-4 word title for the schedule (e.g. "Math Midterm" or "Gmail Review").' },
        description: { type: 'string', description: 'Detailed summary of what the reminder is about, including all provided context and information.' },
        summary: { type: 'string', description: 'A short one-line summary shown on the schedule card (e.g. "Reminder to pay ₹15,000 tuition fee before Oct 5"). This is NOT the email subject — it is for UI display only.' },
        action_info: { type: 'string', description: 'Detailed plain-text information shown when the user clicks the schedule card. Include all relevant details like amounts, dates, links, names, instructions. This is NOT the email body — it is for UI display only.' },
        scheduled_at: { type: 'string', description: 'ISO 8601 datetime string for when to send the email (e.g. 2026-10-06T10:00:00.000Z)' },
        durationSeconds: { type: 'number', description: 'For "in N seconds/minutes/hours" requests: the delay in seconds from now (e.g. 60 for "in 1 minute"). When given, it is used instead of scheduled_at so the time is exact; still fill scheduled_at with your best guess.' },
        repeat: { type: 'string', enum: ['once', 'daily', 'weekly', 'custom'], description: 'How often it repeats (default "once"). For "every day", "every Monday", "daily for a week", a study plan or any routine, create ONE repeating schedule instead of many separate ones. scheduled_at is the first run; later runs are at the same time of day.' },
        repeat_days: { type: 'array', items: { type: 'string' }, description: 'For repeat "custom": the weekdays, e.g. ["mon", "wed", "fri"].' },
        repeat_until: { type: 'string', description: 'Last day of the repeat as YYYY-MM-DD (e.g. the exam date), or an ISO datetime. Default 30 days, maximum 90.' },
        repeat_timezone: { type: 'string', description: 'IANA time zone the repeat days are counted in (default "Asia/Kolkata").' },
        email_subject: { type: 'string', description: 'Subject line for the email that will be sent' },
        email_body: { type: 'string', description: 'Full beautiful HTML email body with inline CSS to send at scheduled time' },
        whatsapp_phone_number: { type: 'string', description: 'Optional. The recipient phone number with country code for WhatsApp (e.g. 919876543210). Leave out for an email-only schedule.' },
        whatsapp_message: { type: 'string', description: 'Optional. The short text message to send on WhatsApp. Leave out for an email-only schedule.' }
      },
      required: ['title', 'scheduled_at', 'summary', 'action_info', 'email_subject', 'email_body']
    }
  },
  {
    name: 'edit_schedule_time',
    description: 'Update the execution time of an existing schedule.',
    inputSchema: {
      type: 'object',
      properties: {
        schedule_id: { type: 'string', description: 'The ID of the schedule to update' },
        scheduled_at: { type: 'string', description: 'New ISO 8601 datetime string in UTC' }
      },
      required: ['schedule_id', 'scheduled_at']
    }
  },
  {
    name: 'edit_schedule_title',
    description: 'Update the title of an existing schedule.',
    inputSchema: {
      type: 'object',
      properties: {
        schedule_id: { type: 'string', description: 'The ID of the schedule to update' },
        title: { type: 'string', description: 'New title for the schedule' }
      },
      required: ['schedule_id', 'title']
    }
  },
  {
    name: 'edit_schedule_email_subject',
    description: 'Update the email subject of an existing schedule.',
    inputSchema: {
      type: 'object',
      properties: {
        schedule_id: { type: 'string', description: 'The ID of the schedule to update' },
        email_subject: { type: 'string', description: 'New email subject' }
      },
      required: ['schedule_id', 'email_subject']
    }
  },
  {
    name: 'edit_schedule_email_body',
    description: 'Update the full HTML email body of an existing schedule.',
    inputSchema: {
      type: 'object',
      properties: {
        schedule_id: { type: 'string', description: 'The ID of the schedule to update' },
        email_body: { type: 'string', description: 'New full beautiful HTML email body' }
      },
      required: ['schedule_id', 'email_body']
    }
  },
  {
    name: 'edit_schedule_summary',
    description: 'Update the summary of an existing schedule.',
    inputSchema: {
      type: 'object',
      properties: {
        schedule_id: { type: 'string', description: 'The ID of the schedule to update' },
        summary: { type: 'string', description: 'New summary' }
      },
      required: ['schedule_id', 'summary']
    }
  },
  {
    name: 'edit_schedule_description',
    description: 'Update the description/notes of an existing schedule.',
    inputSchema: {
      type: 'object',
      properties: {
        schedule_id: { type: 'string', description: 'The ID of the schedule to update' },
        description: { type: 'string', description: 'New description' }
      },
      required: ['schedule_id', 'description']
    }
  },
  {
    name: 'edit_schedule_action_info',
    description: 'Update the action info of an existing schedule.',
    inputSchema: {
      type: 'object',
      properties: {
        schedule_id: { type: 'string', description: 'The ID of the schedule to update' },
        action_info: { type: 'string', description: 'New action info' }
      },
      required: ['schedule_id', 'action_info']
    }
  },
  {
    name: 'delete_schedule_attachment',
    description: 'Delete/remove the attachment from an existing schedule.',
    inputSchema: {
      type: 'object',
      properties: {
        schedule_id: { type: 'string', description: 'The ID of the schedule to modify' }
      },
      required: ['schedule_id']
    }
  },
  {
    name: 'delete_schedule',
    description: 'Delete a schedule from the database permanently.',
    inputSchema: {
      type: 'object',
      properties: {
        schedule_id: { type: 'string', description: 'The MongoDB ObjectId of the schedule to delete.' }
      },
      required: ['schedule_id']
    }
  },
  {
    name: 'list_schedules',
    description: 'List all existing AI schedules for the user. Use this to find schedule_ids for updating or deleting.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Optional. Filter by status (pending, sent, failed, cancelled).' }
      }
    }
  },

  // ================= SUPPORT TICKET TOOLS (14) =================
  {
    name: 'list_support_tickets',
    description: 'List all Support Tickets (organization-linked). Returns ticket summaries with status, priority, subject.',
    inputSchema: { type: 'object', properties: { status: { type: 'string', description: 'Filter by status: open, in_progress, waiting_on_user, resolved, closed, reopened' }, priority: { type: 'string', description: 'Filter by priority: low, medium, high, critical' }, limit: { type: 'number', description: 'Max tickets to return. Default 50.' } } }
  },
  {
    name: 'read_support_ticket_details',
    description: 'Read the full details of a Support Ticket including all messages, replies, events, and attachments.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' } }, required: ['ticketId'] }
  },
  {
    name: 'update_support_ticket_status',
    description: 'Update the status and/or priority of a Support Ticket.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' }, status: { type: 'string', description: 'New status: open, in_progress, waiting_on_user, resolved, closed, reopened' }, priority: { type: 'string', description: 'New priority: low, medium, high, critical' } }, required: ['ticketId'] }
  },
  {
    name: 'close_support_ticket',
    description: 'Close a Support Ticket by setting its status to closed.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' } }, required: ['ticketId'] }
  },
  {
    name: 'reopen_support_ticket',
    description: 'Reopen a previously closed or resolved Support Ticket.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' } }, required: ['ticketId'] }
  },
  {
    name: 'assign_support_ticket',
    description: 'Assign a Support Ticket to a specific staff member.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' }, assignedTo: { type: 'string', description: 'The MongoDB ObjectId of the user to assign the ticket to.' } }, required: ['ticketId', 'assignedTo'] }
  },
  {
    name: 'reply_support_ticket',
    description: 'Send a reply to a Support Ticket. You can toggle email notification ON or OFF.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' }, message: { type: 'string', description: 'The reply message content (HTML supported).' }, sendEmail: { type: 'boolean', description: 'If true, sends an email notification to the ticket creator. Default false.' } }, required: ['ticketId', 'message'] }
  },
  {
    name: 'attach_file_to_support_ticket',
    description: 'Attach a file URL to a Support Ticket.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' }, fileUrl: { type: 'string', description: 'The URL of the file to attach.' }, fileName: { type: 'string', description: 'Optional display name for the file.' } }, required: ['ticketId', 'fileUrl'] }
  },
  {
    name: 'edit_support_ticket_reply',
    description: 'Edit an existing reply in a Support Ticket conversation thread.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' }, replyId: { type: 'string', description: 'The MongoDB ObjectId of the reply to edit.' }, message: { type: 'string', description: 'The updated message content.' } }, required: ['ticketId', 'replyId', 'message'] }
  },
  {
    name: 'add_internal_note_to_support_ticket',
    description: 'Add a private internal note to a Support Ticket. Only visible to admins, not the customer.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' }, message: { type: 'string', description: 'The internal note content.' } }, required: ['ticketId', 'message'] }
  },
  {
    name: 'read_support_ticket_draft',
    description: 'Read the currently saved draft for a Support Ticket.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' } }, required: ['ticketId'] }
  },
  {
    name: 'save_support_ticket_draft',
    description: 'Save a draft reply for a Support Ticket for later review.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' }, draftContent: { type: 'string', description: 'The draft content (HTML supported).' } }, required: ['ticketId', 'draftContent'] }
  },
  {
    name: 'delete_support_ticket_draft',
    description: 'Delete the saved draft for a Support Ticket.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' } }, required: ['ticketId'] }
  },
  {
    name: 'delete_support_ticket',
    description: 'Permanently delete a Support Ticket.',
    inputSchema: { type: 'object', properties: { ticketId: { type: 'string', description: 'The MongoDB ObjectId of the ticket.' } }, required: ['ticketId'] }
  },

  // ================= CLASSGRID TALK TOOLS (14) =================
  {
    name: 'list_classgrid_talks',
    description: 'List all Classgrid Talk inquiries (public inquiries with no organization). Returns inquiry summaries.',
    inputSchema: { type: 'object', properties: { status: { type: 'string', description: 'Filter by status: open, in_progress, waiting_on_user, resolved, closed, reopened' }, priority: { type: 'string', description: 'Filter by priority: low, medium, high, critical' }, limit: { type: 'number', description: 'Max inquiries to return. Default 50.' } } }
  },
  {
    name: 'read_classgrid_talk_details',
    description: 'Read the full details of a Classgrid Talk inquiry including all messages, replies, events, and attachments.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' } }, required: ['talkId'] }
  },
  {
    name: 'update_classgrid_talk_status',
    description: 'Update the status and/or priority of a Classgrid Talk inquiry.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' }, status: { type: 'string', description: 'New status: open, in_progress, waiting_on_user, resolved, closed, reopened' }, priority: { type: 'string', description: 'New priority: low, medium, high, critical' } }, required: ['talkId'] }
  },
  {
    name: 'close_classgrid_talk',
    description: 'Close a Classgrid Talk inquiry by setting its status to closed.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' } }, required: ['talkId'] }
  },
  {
    name: 'reopen_classgrid_talk',
    description: 'Reopen a previously closed or resolved Classgrid Talk inquiry.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' } }, required: ['talkId'] }
  },
  {
    name: 'assign_classgrid_talk',
    description: 'Assign a Classgrid Talk inquiry to a specific staff member.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' }, assignedTo: { type: 'string', description: 'The MongoDB ObjectId of the user to assign the inquiry to.' } }, required: ['talkId', 'assignedTo'] }
  },
  {
    name: 'reply_classgrid_talk',
    description: 'Send a reply to a Classgrid Talk inquiry. You can toggle email notification ON or OFF.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' }, message: { type: 'string', description: 'The reply message content (HTML supported).' }, sendEmail: { type: 'boolean', description: 'If true, sends an email notification to the inquiry creator. Default false.' } }, required: ['talkId', 'message'] }
  },
  {
    name: 'attach_file_to_classgrid_talk',
    description: 'Attach a file URL to a Classgrid Talk inquiry.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' }, fileUrl: { type: 'string', description: 'The URL of the file to attach.' }, fileName: { type: 'string', description: 'Optional display name for the file.' } }, required: ['talkId', 'fileUrl'] }
  },
  {
    name: 'edit_classgrid_talk_reply',
    description: 'Edit an existing reply in a Classgrid Talk inquiry conversation thread.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' }, replyId: { type: 'string', description: 'The MongoDB ObjectId of the reply to edit.' }, message: { type: 'string', description: 'The updated message content.' } }, required: ['talkId', 'replyId', 'message'] }
  },
  {
    name: 'add_internal_note_to_classgrid_talk',
    description: 'Add a private internal note to a Classgrid Talk inquiry. Only visible to admins.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' }, message: { type: 'string', description: 'The internal note content.' } }, required: ['talkId', 'message'] }
  },
  {
    name: 'read_classgrid_talk_draft',
    description: 'Read the currently saved draft for a Classgrid Talk inquiry.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' } }, required: ['talkId'] }
  },
  {
    name: 'save_classgrid_talk_draft',
    description: 'Save a draft reply for a Classgrid Talk inquiry for later review.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' }, draftContent: { type: 'string', description: 'The draft content (HTML supported).' } }, required: ['talkId', 'draftContent'] }
  },
  {
    name: 'delete_classgrid_talk_draft',
    description: 'Delete the saved draft for a Classgrid Talk inquiry.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' } }, required: ['talkId'] }
  },
  {
    name: 'delete_classgrid_talk',
    description: 'Permanently delete a Classgrid Talk inquiry.',
    inputSchema: { type: 'object', properties: { talkId: { type: 'string', description: 'The MongoDB ObjectId of the inquiry.' } }, required: ['talkId'] }
  },

  // ================= DIRECT CHAT TOOLS (3) =================
  {
    name: 'list_chat_threads',
    description: 'List 1:1 direct message threads for the current user.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'list_grids',
    description: 'List 1:1 direct message threads (Grids) for the current user. Alias for list_chat_threads.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'read_chat_messages',
    description: 'Read a direct conversation (1:1 chat).',
    inputSchema: { type: 'object', properties: { threadId: { type: 'string', description: 'The Supabase UUID of the thread.' }, limit: { type: 'number', description: 'Max messages to return. Default 50.' } }, required: ['threadId'] }
  },
  {
    name: 'send_chat_message',
    description: 'Send a direct message in a 1:1 chat.',
    inputSchema: { type: 'object', properties: { threadId: { type: 'string', description: 'The Supabase UUID of the thread.' }, content: { type: 'string', description: 'The message text content.' }, senderUserId: { type: 'string', description: 'Optional. The MongoDB ObjectId of the sender user.' } }, required: ['threadId', 'content'] }
  },
  {
    name: 'upload_file_to_chat',
    description: 'Upload a file or video to a 1:1 direct chat message.',
    inputSchema: { type: 'object', properties: { threadId: { type: 'string', description: 'The Supabase UUID of the thread.' }, fileUrl: { type: 'string', description: 'The R2 CDN URL of the uploaded file.' }, fileName: { type: 'string', description: 'Original file name.' }, fileType: { type: 'string', description: 'MIME type of file (e.g. video/mp4).' }, fileSize: { type: 'number', description: 'File size in bytes.' }, senderUserId: { type: 'string', description: 'Optional. The MongoDB ObjectId of the sender user.' } }, required: ['threadId', 'fileUrl'] }
  },
  {
    name: 'get_chat_attachment_url',
    description: 'Get the R2 CDN URL of a file/attachment uploaded in a 1:1 direct chat message.',
    inputSchema: { type: 'object', properties: { threadId: { type: 'string', description: 'The Supabase UUID of the thread.' }, messageId: { type: 'string', description: 'The Supabase UUID of the message containing the attachment.' } }, required: ['threadId', 'messageId'] }
  },

  {
    name: 'search_users_for_chat',
    description: 'Search for users by name or email to get their MongoDB ObjectIds. CRITICAL: You MUST use this tool to find your own senderUserId or recipient IDs before sending chat messages. NEVER use unified_db_query to search for User IDs for chats.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Name or email to search for.' }, limit: { type: 'number', description: 'Max users to return. Default 10.' } }, required: ['query'] }
  },
  {
    name: 'list_group_chats',
    description: 'List all group chats. Returns group name, description, member count, and timestamps.',
    inputSchema: { type: 'object', properties: { orgId: { type: 'string', description: 'Optional. Filter by organization ID.' }, limit: { type: 'number', description: 'Max groups to return. Default 50.' } } }
  },
  {
    name: 'read_group_chat_details',
    description: 'Read the full details of a group chat including name, description, permissions, and metadata.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: 'The Supabase UUID of the group.' } }, required: ['groupId'] }
  },
  {
    name: 'read_group_chat_messages',
    description: 'Read messages in a group chat with timestamps and sender info. Messages are in Supabase.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: 'The Supabase UUID of the group.' }, limit: { type: 'number', description: 'Max messages to return. Default 50.' } }, required: ['groupId'] }
  },
  {
    name: 'send_group_chat_message',
    description: 'Send a text message into a group chat.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: 'The Supabase UUID of the group.' }, content: { type: 'string', description: 'The message text content.' }, senderUserId: { type: 'string', description: 'Optional. The MongoDB ObjectId of the sender user.' } }, required: ['groupId', 'content'] }
  },
  {
    name: 'get_group_chat_attachment_url',
    description: 'Get the R2 CDN URL of a file/attachment uploaded in a group chat message.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: 'The Supabase UUID of the group.' }, messageId: { type: 'string', description: 'The Supabase UUID of the message containing the attachment.' } }, required: ['groupId', 'messageId'] }
  },
  {
    name: 'upload_file_to_group_chat',
    description: 'Upload a file to a group chat by providing a URL. The file is stored in R2.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: 'The Supabase UUID of the group.' }, fileUrl: { type: 'string', description: 'The URL of the file to upload.' }, fileName: { type: 'string', description: 'Display name for the file.' }, senderUserId: { type: 'string', description: 'Optional. The MongoDB ObjectId of the sender.' } }, required: ['groupId', 'fileUrl', 'fileName'] }
  },
  {
    name: 'send_group_announcement',
    description: 'Send an important announcement message to a group chat.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: 'The Supabase UUID of the group.' }, content: { type: 'string', description: 'The announcement text.' }, senderUserId: { type: 'string', description: 'Optional. The MongoDB ObjectId of the sender.' } }, required: ['groupId', 'content'] }
  },
  {
    name: 'list_group_polls',
    description: 'List all polls in a group chat with vote counts.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: 'The Supabase UUID of the group.' } }, required: ['groupId'] }
  },
  {
    name: 'read_group_poll_details',
    description: 'Read a specific poll with full vote counts and options.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: 'The Supabase UUID of the group.' }, pollId: { type: 'string', description: 'The Supabase UUID of the poll.' } }, required: ['groupId', 'pollId'] }
  },
  {
    name: 'create_group_poll',
    description: 'Create a new poll in a group chat.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: 'The Supabase UUID of the group.' }, question: { type: 'string', description: 'The poll question.' }, options: { type: 'array', items: { type: 'string' }, description: 'Array of option texts.' }, allowMultiple: { type: 'boolean', description: 'If true, users can select multiple options.' }, closesAt: { type: 'string', description: 'Optional ISO date when the poll closes.' }, creatorUserId: { type: 'string', description: 'The MongoDB ObjectId of the poll creator.' } }, required: ['groupId', 'question', 'options', 'creatorUserId'] }
  },
  {
    name: 'list_group_members',
    description: 'List all members present in a group chat with their names, roles, and join times.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: 'The Supabase UUID of the group.' } }, required: ['groupId'] }
  },
  {
    name: 'count_group_members',
    description: 'Get the total number of members in a group chat.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: 'The Supabase UUID of the group.' } }, required: ['groupId'] }
  },

  // ================= ORGANIZATION TOOLS =================
  {
    name: 'list_organizations',
    description: 'List all organizations with their _id (org ID), plus the total count and count per status. Then call get_organization_info with an _id to get all fields of that organization.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'Max organizations to return. Default 50.' }, status: { type: 'string', description: 'Filter by status (e.g. active, suspended).' } } }
  },
  {
    name: 'read_organization_details',
    description: 'Read the full details of a specific organization (MongoDB).',
    inputSchema: { type: 'object', properties: { orgId: { type: 'string', description: 'The MongoDB ObjectId of the organization.' } }, required: ['orgId'] }
  },
  {
    name: 'list_global_users',
    description: 'STAFF: users across the whole platform (all organizations), newest first. Gives the total count and the latest sign-ups with name, email, role, organization and join date. Filter by role, orgId, search (name/email) or days (joined in the last N days).',
    inputSchema: { type: 'object', properties: {
      limit: { type: 'number', description: 'How many latest users to return. Default 20, max 100.' },
      role: { type: 'string', description: 'Only this role (e.g. user, student, faculty, org_admin).' },
      orgId: { type: 'string', description: 'Only users of this organization _id.' },
      search: { type: 'string', description: 'Match part of the name or email.' },
      days: { type: 'number', description: 'Only users who joined in the last N days.' }
    } }
  },
  {
    name: 'count_organization_users',
    description: 'Get the count of users in an organization grouped by their role (e.g. students, org_admin).',
    inputSchema: { type: 'object', properties: { orgId: { type: 'string', description: 'The MongoDB ObjectId of the organization.' } }, required: ['orgId'] }
  },

  // ================= SUPABASE SUBSCRIBERS TOOLS =================
  {
    name: 'list_blog_subscribers',
    description: 'List blog/changelog/legal subscribers, newest first: the EXACT total matching the filters plus a compact list (name, email, joined date, active, what they receive). Use month/days/since/until for "how many this month" questions; the total is exact even when the list is shorter.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'Max subscribers to list. Default 30, max 60.' }, preference: { type: 'string', description: 'Filter by preference: "blog", "changelog", "legal", or "all". Default "all".' }, month: { type: 'string', description: 'Only subscribers who joined in this month, "YYYY-MM" (e.g. "2026-10").' }, days: { type: 'number', description: 'Only subscribers who joined in the last N days.' }, since: { type: 'string', description: 'Joined on/after this date (YYYY-MM-DD).' }, until: { type: 'string', description: 'Joined on/before this date (YYYY-MM-DD).' }, active_only: { type: 'boolean', description: 'Only currently subscribed (not unsubscribed). Default false.' } } }
  },
  {
    name: 'count_blog_subscribers',
    description: 'Get the exact number of blog/changelog/legal subscribers, optionally only those who joined in a month, the last N days or a date range.',
    inputSchema: { type: 'object', properties: { preference: { type: 'string', description: 'Filter by preference: "blog", "changelog", "legal", or "all". Default "all".' }, month: { type: 'string', description: 'Only subscribers who joined in this month, "YYYY-MM" (e.g. "2026-10").' }, days: { type: 'number', description: 'Only subscribers who joined in the last N days.' }, since: { type: 'string', description: 'Joined on/after this date (YYYY-MM-DD).' }, until: { type: 'string', description: 'Joined on/before this date (YYYY-MM-DD).' }, active_only: { type: 'boolean', description: 'Only currently subscribed (not unsubscribed). Default false.' } } }
  },

  // ================= LEAD CRM TOOLS =================
  {
    name: 'list_leads',
    description: 'List all DemoRequests (Leads). Filters by status or assignment.',
    inputSchema: { type: 'object', properties: { status: { type: 'string', description: 'Filter by status (new, contacted, pending, closed, converted).' }, limit: { type: 'number', description: 'Limit results (default 50).' } } }
  },
  {
    name: 'read_lead_details',
    description: 'Read the full details, discovery information, meeting notes, and allocations for a lead.',
    inputSchema: { type: 'object', properties: { leadId: { type: 'string', description: 'The MongoDB ObjectId of the lead.' } }, required: ['leadId'] }
  },
  {
    name: 'assign_lead',
    description: 'Assign or reassign a lead to a team member.',
    inputSchema: { type: 'object', properties: { leadId: { type: 'string' }, assignedTo: { type: 'string', description: 'User ObjectId to assign to.' } }, required: ['leadId', 'assignedTo'] }
  },
  {
    name: 'update_lead_info',
    description: 'Update lead discovery info, basic details, status, or module allocations.',
    inputSchema: { type: 'object', properties: { leadId: { type: 'string' }, updates: { type: 'object', description: 'Key-value pairs of fields to update (e.g. studentCount, status, allocatedModules).' } }, required: ['leadId', 'updates'] }
  },
  {
    name: 'update_lead_meeting_notes',
    description: 'Update the internal meeting notes for a lead.',
    inputSchema: { type: 'object', properties: { leadId: { type: 'string' }, meetingNotes: { type: 'string' } }, required: ['leadId', 'meetingNotes'] }
  },
  {
    name: 'schedule_lead_meeting',
    description: 'Schedule a demo meeting. Sends Google Meet invite internally.',
    inputSchema: { type: 'object', properties: { leadId: { type: 'string' }, scheduledAt: { type: 'string', description: 'ISO date' }, meetingUrl: { type: 'string' }, provider: { type: 'string', description: 'google or zoom' }, notes: { type: 'string' } }, required: ['leadId', 'scheduledAt', 'meetingUrl'] }
  },
  {
    name: 'request_lead_vetting_approval',
    description: 'Request or toggle organization vetting approval for a lead.',
    inputSchema: { type: 'object', properties: { leadId: { type: 'string' }, isOrganizationVetted: { type: 'boolean' } }, required: ['leadId', 'isOrganizationVetted'] }
  },
  {
    name: 'approve_lead_and_provision',
    description: 'Approve a lead and provision their workspace organization.',
    inputSchema: { type: 'object', properties: { leadId: { type: 'string' }, plan: { type: 'string', description: 'demo or active' } }, required: ['leadId', 'plan'] }
  },
  {
    name: 'delete_lead',
    description: 'Permanently delete a spam or invalid lead.',
    inputSchema: { type: 'object', properties: { leadId: { type: 'string' } }, required: ['leadId'] }
  },
  {
    name: 'get_organization_info',
    description: 'Get ALL fields of one organization (configuration, branding, modules, plan). Classgrid staff: pass orgId from list_organizations. Other users always get their own organization.',
    inputSchema: { type: 'object', properties: { orgId: { type: 'string', description: 'The organization _id from list_organizations (Classgrid staff only).' } } }
  },
  {
    name: 'get_student_count',
    description: 'Return the total number of students enrolled in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_teacher_count',
    description: 'Return the total number of faculty/teachers in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'list_recent_users',
    description: 'Fetch the 10 most recently joined students or teachers in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_fee_collection_stats',
    description: 'Aggregate total fees collected vs pending for the current month in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'list_pending_fee_defaulters',
    description: 'Fetch a list of the top 10 students with the highest pending fee balances in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_today_attendance_stats',
    description: 'Aggregate the percentage of students present vs absent today in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'list_active_classrooms',
    description: 'Fetch a list of active batches/classrooms in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'list_recent_exams',
    description: 'Fetch details of recent or upcoming exams in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'list_pending_support_tickets',
    description: 'Fetch all open/pending support tickets created by users in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'list_pending_leave_requests',
    description: 'Fetch leave requests submitted by faculty that need approval in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_admission_stats',
    description: 'Fetch the total number of applications received, approved, and pending in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'list_recent_leads',
    description: 'Fetch the 5 most recent admission inquiries (leads/demo requests) in the user\'s organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'list_department_admins',
    description: 'Fetch all users with the role of Head of Department (HOD) or department admins in the organization.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_my_profile',
    description: 'Fetch the current user\'s profile including Basic Information (Name, DOB, Bio, Hobbies, WhatsApp Number) and Social Status (Tech Stack, LinkedIn, GitHub, etc).',
    inputSchema: { type: 'object', properties: {} }
  }
];

// The only server env vars the code sandbox (run_code / execute_terminal_command) gets. Everything else
// (JWT secret, database URLs, payment keys, ...) stays on the API server.
// - R2_*: the Classgrid Cloud website deploy.js (WEBSITE DEPLOYMENT INSTRUCTIONS in ai-chat.controller.js)
// - VOYAGE_API_KEY: RAG embeddings script (RAG FAST-PATH prompt in ai-chat.controller.js)
const SANDBOX_ENV_ALLOWLIST = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'VOYAGE_API_KEY'];
// Staff only (database role super_admin / co_super_admin): the RAG FAST-PATH scripts write to MongoDB.
const SANDBOX_STAFF_ENV = ['MONGO_URI'];
const sandboxEnvFlags = (isStaff = false) => [...SANDBOX_ENV_ALLOWLIST, ...(isStaff ? SANDBOX_STAFF_ENV : [])]
  .filter((key) => process.env[key])
  .map((key) => ` -e ${key}="${process.env[key].replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')}"`)
  .join('');

// Runner files live as hidden files in the session's /data folder, so they never clobber a site file
// such as /data/script.js and never show up in the preview or a GitHub push.
const SANDBOX_RUNNER_PREFIX = '.cg_run';

export const handleToolCall = async (name, args, context = {}) => {
  // Project Mode file tools (the open project of this chat)
  if (projectTools[name]) {
    const text = await projectTools[name](context.sessionId || 'default', args || {});
    return { content: [{ type: 'text', text }] };
  }
  // Unknown caller falls back to a reserved .invalid address: it must never end in @classgrid.in (staff checks below).
  const { userEmail = 'unknown@unknown.invalid', userRole = '', subdomain = '', sessionId = 'default' } = context;

  const emitScheduleUpdate = async (userId, scheduleId) => {
    if (!userId) return;
    try {
      const { getIO } = await import('../services/socket.service.js');
      getIO().to(userId.toString()).emit('ai:schedule_updated', { schedule_id: scheduleId });
    } catch (err) {
      console.error("Failed to emit ai:schedule_updated:", err);
    }
  };

  try {
    if (name === 'update_ai_preferences') {
      try {
        const User = (await import('../models/User.js')).default;
        const user = await User.findOne({ email: userEmail });
        if (!user) return { content: [{ type: 'text', text: 'Error: User not found.' }] };

        const updateObj = {};
        for (const key of ['tone', 'verbosity', 'format', 'emoji', 'level', 'nickname', 'occupation', 'aboutMe', 'howToRespond', 'activeDefaults']) {
          if (args[key] !== undefined) {
            updateObj[`ai_preferences.${key}`] = args[key];
          }
        }

        if (Object.keys(updateObj).length > 0) {
          await User.updateOne({ _id: user._id }, { $set: updateObj });
          
          // Try to emit socket update if io exists
          try {
            const { getIO } = await import('../services/socket.service.js');
            getIO().to(user._id.toString()).emit('ai:preferences_updated');
          } catch (err) {
            console.error("Socket emit failed", err);
          }
        }

        return { content: [{ type: 'text', text: `Preferences updated successfully. The new preferences are now active.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error updating preferences: ${err.message}` }] };
      }
    }

    if (name === 'create_skill') {
      try {
        const AiSkill = (await import('../models/AiSkill.js')).default;
        const User = (await import('../models/User.js')).default;
        const user = await User.findOne({ email: userEmail });
        if (!user) return { content: [{ type: 'text', text: 'Error: User not found.' }] };

        const newSkill = await AiSkill.create({
          userId: user._id,
          organization_id: user.organization_id,
          name: args.name,
          instructions: args.instructions,
          is_active: true,
          is_default: false
        });
        return { content: [{ type: 'text', text: `Skill "${args.name}" created successfully. YOU MUST NOW output exactly this to the user:\n\nCreated skill\n\`\`\`skill\n{"name": "${args.name}", "instructions": "${args.instructions}"}\n\`\`\`` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error creating skill: ${err.message}` }] };
      }
    }

    if (name === 'list_skills') {
      try {
        const AiSkill = (await import('../models/AiSkill.js')).default;
        const User = (await import('../models/User.js')).default;
        const user = await User.findOne({ email: userEmail });
        if (!user) return { content: [{ type: 'text', text: 'Error: User not found.' }] };

        const skills = await AiSkill.find({ userId: user._id }).lean();
        if (skills.length === 0) return { content: [{ type: 'text', text: 'No skills found for this user.' }] };

        const summary = skills.map(s => `- ID: ${s._id}, Name: ${s.name}, Active: ${s.is_active}, Default: ${s.is_default}`).join('\n');
        return { content: [{ type: 'text', text: `Skills found:\n${summary}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error listing skills: ${err.message}` }] };
      }
    }

    if (name === 'read_skill') {
      try {
        const AiSkill = (await import('../models/AiSkill.js')).default;
        const User = (await import('../models/User.js')).default;
        const user = await User.findOne({ email: userEmail });
        if (!user) return { content: [{ type: 'text', text: 'Error: User not found.' }] };

        const skill = await AiSkill.findOne({ _id: args.skill_id, userId: user._id }).lean();
        if (!skill) return { content: [{ type: 'text', text: 'Error: Skill not found or access denied.' }] };

        return { content: [{ type: 'text', text: `Skill Name: ${skill.name}\nInstructions: ${skill.instructions}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error reading skill: ${err.message}` }] };
      }
    }

    if (name === 'delete_skill') {
      try {
        const AiSkill = (await import('../models/AiSkill.js')).default;
        const User = (await import('../models/User.js')).default;
        const user = await User.findOne({ email: userEmail });
        if (!user) return { content: [{ type: 'text', text: 'Error: User not found.' }] };

        const deleted = await AiSkill.findOneAndDelete({ _id: args.skill_id, userId: user._id, is_default: false });
        if (!deleted) return { content: [{ type: 'text', text: 'Error: Skill not found, already deleted, or cannot delete a default skill.' }] };

        return { content: [{ type: 'text', text: `Skill deleted successfully.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error deleting skill: ${err.message}` }] };
      }
    }

    if (name === 'update_skill') {
      try {
        const AiSkill = (await import('../models/AiSkill.js')).default;
        const User = (await import('../models/User.js')).default;
        const user = await User.findOne({ email: userEmail });
        if (!user) return { content: [{ type: 'text', text: 'Error: User not found.' }] };

        const updated = await AiSkill.findOneAndUpdate(
          { _id: args.skill_id, userId: user._id, is_default: false },
          { $set: { name: args.name, instructions: args.instructions } },
          { returnDocument: 'after' }
        );
        if (!updated) return { content: [{ type: 'text', text: 'Error: Skill not found or access denied.' }] };

        return { content: [{ type: 'text', text: `Skill "${args.name}" updated successfully.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error updating skill: ${err.message}` }] };
      }
    }

    if (name === 'get_my_profile') {
      try {
        const User = (await import('../models/User.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';
        const currentUser = await User.findOne({ email: finalUserEmail }).select('-password -verificationToken').lean();
        if (!currentUser) return { content: [{ type: 'text', text: 'Error: User profile not found.' }] };
        
        // Explicitly structure the response so the AI never misses nested metadata like WhatsApp
        const profileData = {
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          dob: currentUser.dob,
          bio: currentUser.bio || currentUser.metadata?.bio || '',
          hobbies: currentUser.hobby || currentUser.metadata?.hobby || '',
          phoneNumber: currentUser.phoneNumber || 'Not provided',
          whatsappNumber: currentUser.metadata?.whatsapp_number || 'Not provided',
          socials: {
            tech_stack: currentUser.metadata?.tech_stack || '',
            linkedin: currentUser.metadata?.linkedin_url || '',
            github: currentUser.metadata?.github_url || '',
            twitter: currentUser.metadata?.twitter_url || '',
            coding_profile: currentUser.metadata?.coding_profile || '',
            portfolio: currentUser.metadata?.portfolio_url || '',
            instagram: currentUser.metadata?.instagram_url || '',
            facebook: currentUser.metadata?.facebook_url || ''
          }
        };

        return { content: [{ type: 'text', text: JSON.stringify(profileData, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error fetching profile: ${err.message}` }] };
      }
    }

    // --- ORGANIZATION SECURE TOOLS ---
    const orgTools = ['get_organization_info', 'get_student_count', 'get_teacher_count', 'list_recent_users', 'get_fee_collection_stats', 'list_pending_fee_defaulters', 'get_today_attendance_stats', 'list_active_classrooms', 'list_recent_exams', 'list_pending_support_tickets', 'list_pending_leave_requests', 'get_admission_stats', 'list_recent_leads', 'list_department_admins'];
    
    if (orgTools.includes(name)) {
      try {
        // Classgrid staff: all fields of the org whose ID they pass (IDs come from list_organizations)
        if (name === 'get_organization_info' && String(userEmail || '').toLowerCase().trim().endsWith('@classgrid.in')) {
          const Organization = (await import('../models/Organization.js')).default;
          if (!args.orgId) {
            return { content: [{ type: 'text', text: 'Error: Pass orgId. Call list_organizations first to get every organization with its _id.' }] };
          }
          const org = await Organization.findById(args.orgId).select(ORG_HIDDEN_FIELDS).lean();
          if (!org) return { content: [{ type: 'text', text: 'Error: Organization not found.' }] };
          return { content: [{ type: 'text', text: JSON.stringify(compactOrg(org)) }] };
        }
        const User = (await import('../models/User.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';
        const currentUser = await User.findOne({ email: finalUserEmail }).select('_id organization_id');
        if (!currentUser || !currentUser.organization_id) {
          return { content: [{ type: 'text', text: 'Error: You are not linked to an organization.' }] };
        }
        const orgId = currentUser.organization_id;

        if (name === 'get_organization_info') {
          const Organization = (await import('../models/Organization.js')).default;
          // Org admins: all fields of their own org (any orgId they pass is ignored); secrets always hidden
          const org = await Organization.findById(orgId).select(ORG_HIDDEN_FIELDS).lean();
          if (!org) return { content: [{ type: 'text', text: 'Error: Organization not found.' }] };
          return { content: [{ type: 'text', text: JSON.stringify(compactOrg(org)) }] };
        }
        if (name === 'get_student_count') {
          const count = await User.countDocuments({ organization_id: orgId, role: 'student' });
          return { content: [{ type: 'text', text: `Total Students: ${count}` }] };
        }
        if (name === 'get_teacher_count') {
          const count = await User.countDocuments({ organization_id: orgId, role: { $in: ['faculty', 'teacher'] } });
          return { content: [{ type: 'text', text: `Total Teachers/Faculty: ${count}` }] };
        }
        if (name === 'list_recent_users') {
          const users = await User.find({ organization_id: orgId, role: { $in: ['student', 'faculty', 'teacher'] } }).sort({ createdAt: -1 }).limit(10).select('name email role createdAt').lean();
          return { content: [{ type: 'text', text: JSON.stringify(users, null, 2) }] };
        }
        if (name === 'get_fee_collection_stats') {
          const FeeRecord = (await import('../models/FeeRecord.js')).default;
          const stats = await FeeRecord.aggregate([
            { $match: { organization_id: orgId } },
            { $group: { _id: "$status", totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } }
          ]);
          return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
        }
        if (name === 'list_pending_fee_defaulters') {
          const FeeRecord = (await import('../models/FeeRecord.js')).default;
          const defaulters = await FeeRecord.find({ organization_id: orgId, status: 'pending' }).sort({ amount: -1 }).limit(10).populate('studentId', 'name email').lean();
          return { content: [{ type: 'text', text: JSON.stringify(defaulters, null, 2) }] };
        }
        if (name === 'get_today_attendance_stats') {
          const AttendanceRecord = (await import('../models/AttendanceRecord.js')).default;
          const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
          const stats = await AttendanceRecord.aggregate([
            { $match: { organization_id: orgId, date: { $gte: startOfDay } } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ]);
          return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
        }
        if (name === 'list_active_classrooms') {
          const Classroom = (await import('../models/Classroom.js')).default;
          const classrooms = await Classroom.find({ organization_id: orgId }).limit(20).lean();
          return { content: [{ type: 'text', text: JSON.stringify(classrooms, null, 2) }] };
        }
        if (name === 'list_recent_exams') {
          const Exam = (await import('../models/Exam.js')).default;
          const exams = await Exam.find({ organization_id: orgId }).sort({ createdAt: -1 }).limit(10).lean();
          return { content: [{ type: 'text', text: JSON.stringify(exams, null, 2) }] };
        }
        if (name === 'list_pending_support_tickets') {
          const SupportTicket = (await import('../models/SupportTicket.js')).default;
          const tickets = await SupportTicket.find({ organization_id: orgId, status: { $ne: 'closed' } }).limit(10).lean();
          return { content: [{ type: 'text', text: JSON.stringify(tickets, null, 2) }] };
        }
        if (name === 'list_pending_leave_requests') {
          const LeaveRequest = (await import('../models/LeaveRequest.js')).default;
          const leaves = await LeaveRequest.find({ organization_id: orgId, status: 'pending' }).limit(10).lean();
          return { content: [{ type: 'text', text: JSON.stringify(leaves, null, 2) }] };
        }
        if (name === 'get_admission_stats') {
          const AdmissionApplication = (await import('../models/AdmissionApplication.js')).default;
          const stats = await AdmissionApplication.aggregate([
            { $match: { organization_id: orgId } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ]);
          return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
        }
        if (name === 'list_recent_leads') {
          const Lead = (await import('../models/Lead.js')).default;
          const leads = await Lead.find({ organization_id: orgId }).sort({ createdAt: -1 }).limit(5).lean();
          return { content: [{ type: 'text', text: JSON.stringify(leads, null, 2) }] };
        }
        if (name === 'list_department_admins') {
          const hods = await User.find({ organization_id: orgId, role: 'hod' }).select('name email department phoneNumber role additional_roles').lean();
          return { content: [{ type: 'text', text: JSON.stringify(hods, null, 2) }] };
        }
      } catch (err) {
        return { content: [{ type: 'text', text: `Error executing organization tool: ${err.message}` }] };
      }
    }

    if (name === 'youtube_connector') {
      try {
        const User = (await import('../models/User.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';
        const currentUser = await User.findOne({ email: finalUserEmail }).select('metadata').lean();
        
        let youtubeToken = currentUser?.metadata?.youtube_tokens?.access_token;
        const refreshToken = currentUser?.metadata?.youtube_tokens?.refresh_token;
        const expiryDate = currentUser?.metadata?.youtube_tokens?.expiry_date;

        if (!youtubeToken) {
          return { content: [{ type: 'text', text: 'Error: YouTube is not connected or token is missing.' }] };
        }

        // Auto-refresh token if expired (Google tokens expire every 1 hour)
        if (refreshToken && expiryDate && Date.now() > expiryDate - 60000) {
            try {
                const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: process.env.GOOGLE_CLIENT_ID,
                        client_secret: process.env.GOOGLE_CLIENT_SECRET,
                        refresh_token: refreshToken,
                        grant_type: 'refresh_token'
                    })
                });
                const tokenData = await tokenRes.json();
                if (tokenData.access_token) {
                    youtubeToken = tokenData.access_token;
                    currentUser.metadata.youtube_tokens.access_token = youtubeToken;
                    currentUser.metadata.youtube_tokens.expiry_date = Date.now() + (tokenData.expires_in * 1000);
                    await User.updateOne({ email: finalUserEmail }, { $set: { "metadata.youtube_tokens": currentUser.metadata.youtube_tokens } });
                }
            } catch (e) {
                console.error("YouTube Token Refresh Error:", e);
            }
        }

        const { operation, query, channelId, videoId, maxResults = 10 } = args;

        let url = '';
        if (operation === 'search_videos') {
            if (!query) return { content: [{ type: 'text', text: 'Error: query is required for search_videos.' }] };
            url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video`;
        } else if (operation === 'get_channel_stats') {
            if (!channelId) return { content: [{ type: 'text', text: 'Error: channelId is required for get_channel_stats.' }] };
            url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}`;
        } else if (operation === 'read_comments') {
            if (!videoId) return { content: [{ type: 'text', text: 'Error: videoId is required for read_comments.' }] };
            url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}`;
        } else {
            return { content: [{ type: 'text', text: 'Error: Invalid YouTube operation.' }] };
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${youtubeToken}` }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return { content: [{ type: 'text', text: `YouTube API Error: ${data.error?.message || JSON.stringify(data)}` }] };
        }
        
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };

      } catch (err) {
        return { content: [{ type: 'text', text: `Error executing youtube_connector: ${err.message}` }] };
      }
    }

    if (name === 'supabase_connector') {
      try {
        const User = (await import('../models/User.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';
        const currentUser = await User.findOne({ email: finalUserEmail }).select('supabase_access_token supabase_refresh_token');
        if (!currentUser || !currentUser.supabase_access_token) {
           return { content: [{ type: 'text', text: 'Error: Supabase is not connected. Please connect it in the AI Hub.' }] };
        }
        
        const token = currentUser.supabase_access_token;
        const { operation, ref, query } = args;

        if (operation === 'list_projects') {
          const res = await fetch('https://api.supabase.com/v1/projects', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        
        if (operation === 'query_database') {
          if (!ref || !query) return { content: [{ type: 'text', text: 'Error: ref and query are required for query_database.' }] };
          const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
             method: 'POST',
             headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
             body: JSON.stringify({ query })
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }

        if (operation === 'list_storage_buckets') {
          if (!ref) return { content: [{ type: 'text', text: 'Error: ref is required.' }] };
          // Fetch storage buckets via SQL since the management API doesn't expose it directly
          const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
             method: 'POST',
             headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
             body: JSON.stringify({ query: 'SELECT * FROM storage.buckets;' })
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
      } catch (err) {
        return { content: [{ type: 'text', text: `Supabase Error: ${err.message}` }] };
      }
    }

    if (name === 'sanity_connector') {
      try {
        const User = (await import('../models/User.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';
        const currentUser = await User.findOne({ email: finalUserEmail }).select('sanity_project_id sanity_access_token');
        if (!currentUser || !currentUser.sanity_project_id || !currentUser.sanity_access_token) {
           return { content: [{ type: 'text', text: 'Error: Sanity is not connected. Please connect it in the AI Hub.' }] };
        }
        
        const projectId = currentUser.sanity_project_id;
        const token = currentUser.sanity_access_token;
        const baseUrl = `https://${projectId}.api.sanity.io/v2022-03-07/data`;
        
        const { operation, query, documentId, mutations } = args;

        if (operation === 'query_documents') {
           if (!query) return { content: [{ type: 'text', text: 'Error: query is required.' }] };
           const res = await fetch(`${baseUrl}/query/production?query=${encodeURIComponent(query)}`, {
              headers: { 'Authorization': `Bearer ${token}` }
           });
           const data = await res.json();
           return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        
        if (operation === 'create_document' || operation === 'update_document') {
           if (!mutations) return { content: [{ type: 'text', text: 'Error: mutations is required.' }] };
           const res = await fetch(`${baseUrl}/mutate/production`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ mutations: JSON.parse(mutations) })
           });
           const data = await res.json();
           return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
      } catch (err) {
        return { content: [{ type: 'text', text: `Sanity Error: ${err.message}` }] };
      }
    }

    if (name === 'facebook_connector') {
      try {
        const User = (await import('../models/User.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';
        const currentUser = await User.findOne({ email: finalUserEmail }).select('facebook_access_token facebook_page_id role');
        
        let token = currentUser?.facebook_access_token;
        let pageId = currentUser?.facebook_page_id;

        const isSuperAdmin = ['super_admin', 'co_super_admin'].includes(currentUser?.role);
        if (isSuperAdmin && process.env.META_SYSTEM_ACCESS_TOKEN) {
            token = await getMetaLongLivedToken() || process.env.META_SYSTEM_ACCESS_TOKEN;
            pageId = process.env.META_SYSTEM_PAGE_ID || pageId;
            
            if (pageId && token) {
                const pageRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${token}`);
                const pageData = await pageRes.json();
                if (pageData.access_token) token = pageData.access_token;
            } else if (!pageId && token) {
                const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`);
                const pagesData = await pagesRes.json();
                if (pagesData.data && pagesData.data.length > 0) {
                    pageId = pagesData.data[0].id;
                    token = pagesData.data[0].access_token;
                }
            }
        }
        
        if (!token || !pageId) {
           return { content: [{ type: 'text', text: 'Error: Facebook Page is not fully connected.' }] };
        }
        
        const { operation, message, imageUrl, recipientId, targetId } = args;

        if (operation === 'get_profile') {
            const fbUrl = `https://graph.facebook.com/v19.0/${pageId}?fields=id,name,followers_count,fan_count,about,link&access_token=${token}`;
            const res = await fetch(fbUrl);
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }

        if (operation === 'list_messages') {
            const fbUrl = `https://graph.facebook.com/v19.0/${pageId}/conversations?fields=id,updated_time,participants,messages{message,created_time,from}&access_token=${token}`;
            const res = await fetch(fbUrl);
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }

        if (operation === 'send_message') {
            const finalRecipientId = targetId || recipientId;
            if (!finalRecipientId || !message) return { content: [{ type: 'text', text: 'Error: targetId (recipient) and message are required for send_message' }] };
            const fbUrl = `https://graph.facebook.com/v19.0/${pageId}/messages`;
            const fbBody = { 
                recipient: { id: finalRecipientId }, 
                message: { text: message },
                messaging_type: "RESPONSE",
                access_token: token
            };
            const res = await fetch(fbUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fbBody)
            });
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }

        if (operation === 'list_posts') {
            const fbUrl = `https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,permalink_url&access_token=${token}`;
            const res = await fetch(fbUrl);
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }

        if (operation === 'list_comments') {
            if (!targetId) return { content: [{ type: 'text', text: 'Error: targetId (Post ID) required.' }] };
            const res = await fetch(`https://graph.facebook.com/v19.0/${targetId}/comments?access_token=${token}`);
            return { content: [{ type: 'text', text: JSON.stringify(await res.json(), null, 2) }] };
        }

        if (operation === 'reply_comment') {
            if (!targetId || !message) return { content: [{ type: 'text', text: 'Error: targetId (Comment ID) and message required.' }] };
            const res = await fetch(`https://graph.facebook.com/v19.0/${targetId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, access_token: token })
            });
            return { content: [{ type: 'text', text: JSON.stringify(await res.json(), null, 2) }] };
        }

        if (operation === 'get_insights') {
            const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/insights?metric=page_impressions,page_engaged_users&access_token=${token}`);
            return { content: [{ type: 'text', text: JSON.stringify(await res.json(), null, 2) }] };
        }

        if (operation === 'publish_post') {
            if (!message) return { content: [{ type: 'text', text: 'Error: message is required for publish_post' }] };
            const fbUrl = `https://graph.facebook.com/v19.0/${pageId}/${imageUrl ? 'photos' : 'feed'}`;
            const fbBody = { access_token: token, message };
            if (imageUrl) fbBody.url = imageUrl;
            
            const res = await fetch(fbUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fbBody)
            });
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
      } catch (err) {
        return { content: [{ type: 'text', text: `Facebook Error: ${err.message}` }] };
      }
    }

    if (name === 'instagram_connector') {
      try {
        const User = (await import('../models/User.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';
        const currentUser = await User.findOne({ email: finalUserEmail }).select('instagram_access_token instagram_account_id role');
        
        let token = currentUser?.instagram_access_token;
        let accountId = currentUser?.instagram_account_id;
        let pageId = null;

        const isSuperAdmin = ['super_admin', 'co_super_admin'].includes(currentUser?.role);
        if (isSuperAdmin && process.env.META_SYSTEM_ACCESS_TOKEN) {
            token = await getMetaLongLivedToken() || process.env.META_SYSTEM_ACCESS_TOKEN;
            accountId = process.env.META_SYSTEM_IG_ACCOUNT_ID || accountId;
            
            pageId = process.env.META_SYSTEM_PAGE_ID;
            
            if (pageId && token) {
                const pageRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${token}`);
                const pageData = await pageRes.json();
                if (pageData.access_token) token = pageData.access_token;
            } else if (!pageId && token) {
                const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`);
                const pagesData = await pagesRes.json();
                if (pagesData.data && pagesData.data.length > 0) {
                    pageId = pagesData.data[0].id;
                    token = pagesData.data[0].access_token;
                }
            }
            
            if (pageId && !accountId) {
                const igRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${token}`);
                const igData = await igRes.json();
                if (igData.instagram_business_account) {
                    accountId = igData.instagram_business_account.id;
                }
            }
        }
        
        if (!token || !accountId) {
           return { content: [{ type: 'text', text: 'Error: Instagram Account is not fully connected.' }] };
        }
        
        const { operation, message, imageUrl, recipientId, targetId } = args;

        if (operation === 'get_profile') {
            const igUrl = `https://graph.facebook.com/v19.0/${accountId}?fields=id,username,followers_count,follows_count,media_count,name,biography,profile_picture_url&access_token=${token}`;
            const res = await fetch(igUrl);
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }

        if (operation === 'list_messages') {
            if (!pageId) return { content: [{ type: 'text', text: 'Error: Could not dynamically fetch Page ID for Instagram DMs.' }] };
            const igUrl = `https://graph.facebook.com/v19.0/${pageId}/conversations?platform=instagram&fields=id,updated_time,participants,messages{message,created_time,from}&access_token=${token}`;
            const res = await fetch(igUrl);
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }

        if (operation === 'send_message') {
            const finalRecipientId = targetId || recipientId;
            if (!finalRecipientId || !message) return { content: [{ type: 'text', text: 'Error: targetId (recipient) and message are required for send_message' }] };
            if (!pageId) return { content: [{ type: 'text', text: 'Error: Could not dynamically fetch Page ID for Instagram DMs.' }] };
            const igUrl = `https://graph.facebook.com/v19.0/${pageId}/messages`;
            const igBody = { 
                recipient: { id: finalRecipientId }, 
                message: { text: message },
                access_token: token
            };
            const res = await fetch(igUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(igBody)
            });
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }

        if (operation === 'list_posts') {
            const igUrl = `https://graph.facebook.com/v19.0/${accountId}/media?fields=id,caption,media_type,media_url,timestamp,permalink&access_token=${token}`;
            const res = await fetch(igUrl);
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }

        if (operation === 'list_comments') {
            if (!targetId) return { content: [{ type: 'text', text: 'Error: targetId (Media ID) required.' }] };
            const res = await fetch(`https://graph.facebook.com/v19.0/${targetId}/comments?access_token=${token}`);
            return { content: [{ type: 'text', text: JSON.stringify(await res.json(), null, 2) }] };
        }

        if (operation === 'reply_comment') {
            if (!targetId || !message) return { content: [{ type: 'text', text: 'Error: targetId (Comment ID) and message required.' }] };
            const res = await fetch(`https://graph.facebook.com/v19.0/${targetId}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, access_token: token })
            });
            return { content: [{ type: 'text', text: JSON.stringify(await res.json(), null, 2) }] };
        }

        if (operation === 'get_insights') {
            const res = await fetch(`https://graph.facebook.com/v19.0/${accountId}/insights?metric=reach,follower_count&period=day&access_token=${token}`);
            return { content: [{ type: 'text', text: JSON.stringify(await res.json(), null, 2) }] };
        }

        if (operation === 'publish_post') {
            if (!message) return { content: [{ type: 'text', text: 'Error: message is required for publish_post' }] };
            if (!imageUrl) {
                 return { content: [{ type: 'text', text: 'Error: Instagram requires an imageUrl to publish a post.' }] };
            }
            
            // Step 1: Create media container
            const createUrl = `https://graph.facebook.com/v19.0/${accountId}/media`;
            const createBody = { access_token: token, image_url: imageUrl, caption: message };
            
            const createRes = await fetch(createUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createBody)
            });
            const createData = await createRes.json();
            
            if (createData.id) {
                // Step 2: Publish media container
                const publishUrl = `https://graph.facebook.com/v19.0/${accountId}/media_publish`;
                const publishBody = { access_token: token, creation_id: createData.id };
                
                const publishRes = await fetch(publishUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(publishBody)
                });
                const publishData = await publishRes.json();
                return { content: [{ type: 'text', text: JSON.stringify(publishData, null, 2) }] };
            } else {
                return { content: [{ type: 'text', text: JSON.stringify({ error: 'Failed to create media container', response: createData }, null, 2) }] };
            }
        }
      } catch (err) {
        return { content: [{ type: 'text', text: `Instagram Error: ${err.message}` }] };
      }
    }

    if (name === 'create_schedule') {
      try {
        const AiSchedule = (await import('../models/AiSchedule.js')).default;
        const User = (await import('../models/User.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';
        // The signed-in user (context.userId) when the caller has one, so the WhatsApp limit can't be counted on someone else.
        const user = context.userId
          ? await User.findById(context.userId).select('_id organization_id role')
          : await User.findOne({ email: finalUserEmail }).select('_id organization_id role');

        // A relative delay ("in 1 minute") is counted from now on the server, so the AI can't round it off
        const firstRun = Number(args.durationSeconds) > 0
          ? new Date(Date.now() + Number(args.durationSeconds) * 1000)
          : new Date(args.scheduled_at);
        if (Number.isNaN(firstRun.getTime())) {
          return { content: [{ type: 'text', text: `Failed: scheduled_at "${args.scheduled_at}" is not a valid date. Nothing was scheduled.` }] };
        }
        const { normalizeRepeat, runsWithin, describeRepeat } = await import('../utils/schedule-repeat.js');
        const rep = normalizeRepeat(args, firstRun);
        if (rep.error) {
          return { content: [{ type: 'text', text: `Failed: ${rep.error}. Nothing was scheduled.` }] };
        }

        // WhatsApp is optional. When it can't be sent (not signed in, or over the weekly limit) the schedule is
        // still created, as email only, and the AI is told why so it can tell the user.
        let whatsappNote = '';
        const dropWhatsapp = (why) => {
          whatsappNote = ` WhatsApp was NOT added: ${why} The reminder will still arrive by email. Tell the user this in one short line.`;
          delete args.whatsapp_phone_number;
          delete args.whatsapp_message;
        };
        if (args.whatsapp_phone_number && args.whatsapp_message) {
          if (!user) {
            dropWhatsapp('the user is not signed in.');
          } else {
            const { checkWhatsappLimit, normalizeWhatsappNumber } = await import('../services/ai-feature-limits.js');
            const { allowed, limit, used, periodMs, periodText = '7 days', resetText } = await checkWhatsappLimit(user, { includeUpcomingRepeats: rep.repeat !== 'once' });
            const weekRuns = rep.repeat !== 'once' ? runsWithin(rep, rep.first, periodMs || 7 * 24 * 60 * 60 * 1000) : 1;
            if (!allowed) {
              dropWhatsapp(`the user has used ${used} of ${limit} WhatsApp messages allowed in the last ${periodText} (limit set by Classgrid admins).${resetText ? ` Reset time: ${resetText}${user.role === 'super_admin' ? '' : ' (share only if the user asks)'}.` : ''}`);
            } else if (rep.repeat !== 'once' && used + weekRuns > limit) {
              // A repeat must fit its first week of WhatsApp messages into what is left of the weekly limit
              dropWhatsapp(`this repeat would send ${weekRuns} WhatsApp messages in its first ${periodText} but only ${Math.max(0, limit - used)} of ${limit} WhatsApp messages per ${periodText} are left (limit set by Classgrid admins).`);
            } else {
              args.whatsapp_phone_number = normalizeWhatsappNumber(args.whatsapp_phone_number);
            }
          }
        } else {
          // Half of WhatsApp (number without message or the other way round) can't be sent
          delete args.whatsapp_phone_number;
          delete args.whatsapp_message;
        }

        const schedule = await AiSchedule.create({
          user_email: finalUserEmail,
          user_id: user?._id,
          organization_id: user?.organization_id,
          title: args.title,
          description: args.description || '',
          summary: args.summary || '',
          action_info: args.action_info || '',
          scheduled_at: rep.first || firstRun,
          repeat: rep.repeat,
          repeat_days: rep.repeat_days || [],
          repeat_until: rep.repeat_until,
          repeat_tz: rep.repeat_tz,
          email_subject: args.email_subject,
          email_body: args.email_body,
          whatsapp_phone_number: args.whatsapp_phone_number,
          whatsapp_message: args.whatsapp_message,
          status: 'pending'
        });

        await emitScheduleUpdate(user?._id, schedule._id);

        const when = schedule.repeat === 'once'
          ? `for ${schedule.scheduled_at.toISOString()}`
          : `to repeat ${describeRepeat(schedule)}, first run ${schedule.scheduled_at.toISOString()}`;
        return { content: [{ type: 'text', text: `Successfully scheduled task "${args.title}" ${when}. The user will receive it at that time. IMPORTANT: The schedule_id is ${schedule._id}. Save this ID if you need to update or delete it later (deleting it stops the whole repeat).${whatsappNote}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error creating schedule: ${e.message}` }] };
      }
    }

    if (name === 'edit_schedule_time') {
      try {
        const AiSchedule = (await import('../models/AiSchedule.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';

        const schedule = await AiSchedule.findOne({ _id: args.schedule_id, user_email: finalUserEmail });
        if (!schedule) {
          return { content: [{ type: 'text', text: `Error: Schedule with ID ${args.schedule_id} not found or you don't have permission.` }] };
        }

        if (args.scheduled_at) {
          schedule.scheduled_at = new Date(args.scheduled_at);
          if (schedule.status !== 'pending') schedule.status = 'pending';
        }
        await schedule.save();
        await emitScheduleUpdate(schedule.user_id, schedule._id);
        return { content: [{ type: 'text', text: `Successfully updated schedule execution time.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error updating schedule time: ${e.message}` }] };
      }
    }

    if (name === 'edit_schedule_title') {
      try {
        const AiSchedule = (await import('../models/AiSchedule.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';

        const schedule = await AiSchedule.findOne({ _id: args.schedule_id, user_email: finalUserEmail });
        if (!schedule) {
          return { content: [{ type: 'text', text: `Error: Schedule with ID ${args.schedule_id} not found or you don't have permission.` }] };
        }

        if (args.title) schedule.title = args.title;
        await schedule.save();
        await emitScheduleUpdate(schedule.user_id, schedule._id);
        return { content: [{ type: 'text', text: `Successfully updated schedule title.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error updating schedule title: ${e.message}` }] };
      }
    }

    if (name === 'edit_schedule_email_subject') {
      try {
        const AiSchedule = (await import('../models/AiSchedule.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';

        const schedule = await AiSchedule.findOne({ _id: args.schedule_id, user_email: finalUserEmail });
        if (!schedule) {
          return { content: [{ type: 'text', text: `Error: Schedule with ID ${args.schedule_id} not found or you don't have permission.` }] };
        }

        if (args.email_subject) schedule.email_subject = args.email_subject;
        await schedule.save();
        await emitScheduleUpdate(schedule.user_id, schedule._id);
        return { content: [{ type: 'text', text: `Successfully updated schedule email subject.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error updating schedule email subject: ${e.message}` }] };
      }
    }

    if (name === 'edit_schedule_email_body') {
      try {
        const AiSchedule = (await import('../models/AiSchedule.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';

        const schedule = await AiSchedule.findOne({ _id: args.schedule_id, user_email: finalUserEmail });
        if (!schedule) {
          return { content: [{ type: 'text', text: `Error: Schedule with ID ${args.schedule_id} not found or you don't have permission.` }] };
        }

        if (args.email_body) schedule.email_body = args.email_body;
        await schedule.save();
        await emitScheduleUpdate(schedule.user_id, schedule._id);
        return { content: [{ type: 'text', text: `Successfully updated schedule email body.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error updating schedule email body: ${e.message}` }] };
      }
    }

    if (name === 'edit_schedule_summary') {
      try {
        const AiSchedule = (await import('../models/AiSchedule.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';

        const schedule = await AiSchedule.findOne({ _id: args.schedule_id, user_email: finalUserEmail });
        if (!schedule) {
          return { content: [{ type: 'text', text: `Error: Schedule with ID ${args.schedule_id} not found or you don't have permission.` }] };
        }

        if (args.summary) schedule.summary = args.summary;
        await schedule.save();
        await emitScheduleUpdate(schedule.user_id, schedule._id);
        return { content: [{ type: 'text', text: `Successfully updated schedule summary.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error updating schedule summary: ${e.message}` }] };
      }
    }

    if (name === 'edit_schedule_description') {
      try {
        const AiSchedule = (await import('../models/AiSchedule.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';

        const schedule = await AiSchedule.findOne({ _id: args.schedule_id, user_email: finalUserEmail });
        if (!schedule) {
          return { content: [{ type: 'text', text: `Error: Schedule with ID ${args.schedule_id} not found or you don't have permission.` }] };
        }

        if (args.description) schedule.description = args.description;
        await schedule.save();
        await emitScheduleUpdate(schedule.user_id, schedule._id);
        return { content: [{ type: 'text', text: `Successfully updated schedule description.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error updating schedule description: ${e.message}` }] };
      }
    }

    if (name === 'edit_schedule_action_info') {
      try {
        const AiSchedule = (await import('../models/AiSchedule.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';

        const schedule = await AiSchedule.findOne({ _id: args.schedule_id, user_email: finalUserEmail });
        if (!schedule) {
          return { content: [{ type: 'text', text: `Error: Schedule with ID ${args.schedule_id} not found or you don't have permission.` }] };
        }

        if (args.action_info) schedule.action_info = args.action_info;
        await schedule.save();
        await emitScheduleUpdate(schedule.user_id, schedule._id);
        return { content: [{ type: 'text', text: `Successfully updated schedule action info.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error updating schedule action info: ${e.message}` }] };
      }
    }

    if (name === 'delete_schedule_attachment') {
      try {
        const AiSchedule = (await import('../models/AiSchedule.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';

        const schedule = await AiSchedule.findOne({ _id: args.schedule_id, user_email: finalUserEmail });
        if (!schedule) {
          return { content: [{ type: 'text', text: `Error: Schedule with ID ${args.schedule_id} not found or you don't have permission.` }] };
        }

        // We remove attachments by stripping hrefs from the body or wiping the attachment_url if it existed.
        // For our schema, we'll strip out <a> tags that link to files from the body.
        if (schedule.email_body) {
          schedule.email_body = schedule.email_body.replace(/<a[^>]*>(.*?)<\/a>/ig, "");
        }
        await schedule.save();
        await emitScheduleUpdate(schedule.user_id, schedule._id);
        return { content: [{ type: 'text', text: `Successfully deleted attachment from schedule.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error deleting schedule attachment: ${e.message}` }] };
      }
    }

    if (name === 'list_schedules') {
      try {
        const AiSchedule = (await import('../models/AiSchedule.js')).default;
        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';
        let query = { user_email: finalUserEmail };
        if (args.status) query.status = args.status;
        const schedules = await AiSchedule.find(query).sort({ scheduled_at: -1 });
        return { content: [{ type: 'text', text: JSON.stringify(schedules, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error listing schedules: ${e.message}` }] };
      }
    }

    if (name === 'delete_schedule') {
      try {
        const AiSchedule = (await import('../models/AiSchedule.js')).default;
        if (!args.schedule_id) throw new Error("schedule_id is required");

        const finalUserEmail = userEmail && userEmail.trim() !== '' ? userEmail : 'unknown@unknown.invalid';
        const schedule = await AiSchedule.findOne({ _id: args.schedule_id, user_email: finalUserEmail });

        if (!schedule) {
          return { content: [{ type: 'text', text: `Error: Schedule with ID ${args.schedule_id} not found or you don't have permission to delete it.` }] };
        }

        // Delete the exact document the ownership check found, never by the raw argument
        await AiSchedule.deleteOne({ _id: schedule._id, user_email: finalUserEmail });
        await emitScheduleUpdate(schedule.user_id, schedule._id);
        return { content: [{ type: 'text', text: `Successfully deleted schedule ${args.schedule_id}.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error deleting schedule: ${e.message}` }] };
      }
    }

    // ================= SUPPORT TICKET & CLASSGRID TALK HANDLERS (28 tools) =================
    const SUPPORT_TALK_TOOL_NAMES = [
      'list_support_tickets', 'read_support_ticket_details', 'update_support_ticket_status',
      'close_support_ticket', 'reopen_support_ticket', 'assign_support_ticket',
      'reply_support_ticket', 'attach_file_to_support_ticket', 'edit_support_ticket_reply',
      'add_internal_note_to_support_ticket', 'read_support_ticket_draft', 'save_support_ticket_draft',
      'delete_support_ticket_draft', 'delete_support_ticket',
      'list_classgrid_talks', 'read_classgrid_talk_details', 'update_classgrid_talk_status',
      'close_classgrid_talk', 'reopen_classgrid_talk', 'assign_classgrid_talk',
      'reply_classgrid_talk', 'attach_file_to_classgrid_talk', 'edit_classgrid_talk_reply',
      'add_internal_note_to_classgrid_talk', 'read_classgrid_talk_draft', 'save_classgrid_talk_draft',
      'delete_classgrid_talk_draft', 'delete_classgrid_talk'
    ];

    if (SUPPORT_TALK_TOOL_NAMES.includes(name)) {
      try {
        const SupportTicket = (await import('../models/SupportTicket.js')).default;
        const MessageDraft = (await import('../models/MessageDraft.js')).default;

        const isTalk = name.includes('classgrid_talk');
        const targetId = isTalk ? args.talkId : args.ticketId;
        const baseQuery = isTalk ? { organization_id: null } : { organization_id: { $ne: null } };

        // 1. LIST
        if (name === 'list_support_tickets' || name === 'list_classgrid_talks') {
          const query = { ...baseQuery };
          if (args.status) query.status = args.status;
          if (args.priority) query.priority = args.priority;
          const tickets = await SupportTicket.find(query)
            .sort({ createdAt: -1 })
            .limit(args.limit || 50)
            .select('subject status priority category submitterName submitterEmail organization_id assignedTo createdAt updatedAt')
            .populate('assignedTo', 'name email')
            .lean();
          return { content: [{ type: 'text', text: JSON.stringify(tickets, null, 2) }] };
        }

        // 2. READ DETAILS
        if (name === 'read_support_ticket_details' || name === 'read_classgrid_talk_details') {
          const ticket = await SupportTicket.findOne({ _id: targetId, ...baseQuery })
            .populate('assignedTo', 'name email')
            .populate('submittedBy', 'name email')
            .lean();
          if (!ticket) return { content: [{ type: 'text', text: 'Error: Ticket not found.' }], isError: true };
          return { content: [{ type: 'text', text: JSON.stringify(ticket, null, 2) }] };
        }

        // 3. UPDATE STATUS
        if (name === 'update_support_ticket_status' || name === 'update_classgrid_talk_status') {
          const update = {};
          if (args.status) update.status = args.status;
          if (args.priority) update.priority = args.priority;
          const ticket = await SupportTicket.findOne({ _id: targetId, ...baseQuery });
          if (!ticket) return { content: [{ type: 'text', text: 'Error: Ticket not found.' }], isError: true };
          if (args.status) {
            if (args.status === 'reopened' && ticket.status === 'closed') {
              return { content: [{ type: 'text', text: 'Safety Policy Violation: Closed tickets cannot be reopened. Only resolved tickets can be reopened.' }], isError: true };
            }
            ticket.events.push({ type: 'statusChanged', label: `Status changed to ${args.status}`, from: ticket.status, to: args.status, actorName: 'AI Admin', actorRole: 'super_admin', createdAt: new Date() });
            ticket.status = args.status;
          }
          if (args.priority) {
            ticket.events.push({ type: 'priorityChanged', label: `Priority changed to ${args.priority}`, from: ticket.priority, to: args.priority, actorName: 'AI Admin', actorRole: 'super_admin', createdAt: new Date() });
            ticket.priority = args.priority;
          }
          await ticket.save();
          return { content: [{ type: 'text', text: `Ticket updated. Status: ${ticket.status}, Priority: ${ticket.priority}` }] };
        }

        // 4. CLOSE
        if (name === 'close_support_ticket' || name === 'close_classgrid_talk') {
          const ticket = await SupportTicket.findOne({ _id: targetId, ...baseQuery });
          if (!ticket) return { content: [{ type: 'text', text: 'Error: Ticket not found.' }], isError: true };
          ticket.events.push({ type: 'statusChanged', label: 'Ticket closed', from: ticket.status, to: 'closed', actorName: 'AI Admin', actorRole: 'super_admin', createdAt: new Date() });
          ticket.status = 'closed';
          ticket.resolvedAt = new Date();
          await ticket.save();
          return { content: [{ type: 'text', text: 'Ticket closed successfully.' }] };
        }

        // 5. REOPEN
        if (name === 'reopen_support_ticket' || name === 'reopen_classgrid_talk') {
          const ticket = await SupportTicket.findOne({ _id: targetId, ...baseQuery });
          if (!ticket) return { content: [{ type: 'text', text: 'Error: Ticket not found.' }], isError: true };
          if (ticket.status === 'closed') {
            return { content: [{ type: 'text', text: 'Safety Policy Violation: Closed tickets cannot be reopened. Only resolved tickets can be reopened.' }], isError: true };
          }
          ticket.events.push({ type: 'reopened', label: 'Ticket reopened', from: ticket.status, to: 'reopened', actorName: 'AI Admin', actorRole: 'super_admin', createdAt: new Date() });
          ticket.status = 'reopened';
          ticket.resolvedAt = null;
          await ticket.save();
          return { content: [{ type: 'text', text: 'Ticket reopened successfully.' }] };
        }

        // 6. ASSIGN
        if (name === 'assign_support_ticket' || name === 'assign_classgrid_talk') {
          const ticket = await SupportTicket.findOne({ _id: targetId, ...baseQuery });
          if (!ticket) return { content: [{ type: 'text', text: 'Error: Ticket not found.' }], isError: true };
          ticket.events.push({ type: 'assigned', label: `Assigned to ${args.assignedTo}`, actorName: 'AI Admin', actorRole: 'super_admin', createdAt: new Date() });
          ticket.assignedTo = args.assignedTo;
          await ticket.save();
          return { content: [{ type: 'text', text: `Ticket assigned to ${args.assignedTo} successfully.` }] };
        }

        // 7. REPLY (with email ON/OFF)
        if (name === 'reply_support_ticket' || name === 'reply_classgrid_talk') {
          const ticket = await SupportTicket.findOne({ _id: targetId, ...baseQuery });
          if (!ticket) return { content: [{ type: 'text', text: 'Error: Ticket not found.' }], isError: true };
          const now = new Date();
          ticket.replies = ticket.replies || [];
          ticket.messages = ticket.messages || [];
          ticket.replies.push({ authorName: 'AI Support Admin', authorRole: 'super_admin', message: args.message, createdAt: now });
          ticket.messages.push({ author: 'AI Support Admin', role: 'admin', body: args.message, date: now, authorRole: 'super_admin', avatar: '', attachments: [] });
          ticket.events.push({ type: 'adminReply', label: 'AI Admin replied', actorName: 'AI Support Admin', actorRole: 'super_admin', createdAt: now });
          ticket.lastAdminReplyAt = now;
          ticket.lastComment = now;
          if (ticket.status === 'open') ticket.status = 'in_progress';
          await ticket.save();

          if (args.sendEmail) {
            try {
              const { notifyTicketCreatorOfAdminReply } = await import('../services/support-ticket-email.service.js');
              await notifyTicketCreatorOfAdminReply({ ticket });
            } catch (emailErr) {
              return { content: [{ type: 'text', text: `Reply added but email failed: ${emailErr.message}` }] };
            }
          }
          return { content: [{ type: 'text', text: `Reply added successfully. Email sent: ${!!args.sendEmail}` }] };
        }

        // 8. ATTACH FILE
        if (name === 'attach_file_to_support_ticket' || name === 'attach_file_to_classgrid_talk') {
          const ticket = await SupportTicket.findOne({ _id: targetId, ...baseQuery });
          if (!ticket) return { content: [{ type: 'text', text: 'Error: Ticket not found.' }], isError: true };
          ticket.attachments = ticket.attachments || [];
          ticket.attachments.push({ url: args.fileUrl, name: args.fileName || 'attachment' });
          ticket.events.push({ type: 'attachmentAdded', label: 'File attached', actorName: 'AI Admin', actorRole: 'super_admin', createdAt: new Date() });
          await ticket.save();
          return { content: [{ type: 'text', text: 'File attached successfully.' }] };
        }

        // 9. EDIT REPLY
        if (name === 'edit_support_ticket_reply' || name === 'edit_classgrid_talk_reply') {
          const ticket = await SupportTicket.findOne({ _id: targetId, ...baseQuery });
          if (!ticket) return { content: [{ type: 'text', text: 'Error: Ticket not found.' }], isError: true };
          let edited = false;
          const rIdx = ticket.replies.findIndex(r => r._id.toString() === args.replyId);
          if (rIdx !== -1) { ticket.replies[rIdx].message = args.message; edited = true; }
          const mIdx = ticket.messages.findIndex(m => m._id.toString() === args.replyId);
          if (mIdx !== -1) { ticket.messages[mIdx].body = args.message; edited = true; }
          if (!edited) return { content: [{ type: 'text', text: 'Error: Reply not found.' }], isError: true };
          await ticket.save();
          return { content: [{ type: 'text', text: 'Reply edited successfully.' }] };
        }

        // 10. ADD INTERNAL NOTE
        if (name === 'add_internal_note_to_support_ticket' || name === 'add_internal_note_to_classgrid_talk') {
          const ticket = await SupportTicket.findOne({ _id: targetId, ...baseQuery });
          if (!ticket) return { content: [{ type: 'text', text: 'Error: Ticket not found.' }], isError: true };
          const now = new Date();
          ticket.messages.push({ author: 'AI Admin', role: 'admin', body: args.message, date: now, footer: 'internal_note', avatar: '', attachments: [] });
          ticket.events.push({ type: 'internalNote', label: 'Internal note added', actorName: 'AI Admin', actorRole: 'super_admin', createdAt: now });
          await ticket.save();
          return { content: [{ type: 'text', text: 'Internal note added successfully.' }] };
        }

        // 11. READ DRAFT
        if (name === 'read_support_ticket_draft' || name === 'read_classgrid_talk_draft') {
          const draft = await MessageDraft.findOne({ ticketId: targetId }).lean();
          return { content: [{ type: 'text', text: draft ? JSON.stringify(draft, null, 2) : 'No draft found for this ticket.' }] };
        }

        // 12. SAVE DRAFT
        if (name === 'save_support_ticket_draft' || name === 'save_classgrid_talk_draft') {
          const draft = await MessageDraft.findOneAndUpdate(
            { ticketId: targetId },
            { draftContent: args.draftContent, source: 'ai_generated' },
            { upsert: true, returnDocument: 'after' }
          ).lean();
          return { content: [{ type: 'text', text: 'Draft saved successfully.' }] };
        }

        // 13. DELETE DRAFT
        if (name === 'delete_support_ticket_draft' || name === 'delete_classgrid_talk_draft') {
          await MessageDraft.findOneAndDelete({ ticketId: targetId });
          return { content: [{ type: 'text', text: 'Draft deleted successfully.' }] };
        }

        // 14. DELETE TICKET
        if (name === 'delete_support_ticket' || name === 'delete_classgrid_talk') {
          const result = await SupportTicket.findOneAndDelete({ _id: targetId, ...baseQuery });
          if (!result) return { content: [{ type: 'text', text: 'Error: Ticket not found.' }], isError: true };
          return { content: [{ type: 'text', text: 'Ticket deleted permanently.' }] };
        }

      } catch (e) {
        return { content: [{ type: 'text', text: `Error in support/talk tool: ${e.message}` }], isError: true };
      }
    }

    // ================= DIRECT CHAT HANDLERS (4 tools - Supabase) =================
    const DIRECT_CHAT_TOOL_NAMES = ['list_chat_threads', 'list_grids', 'read_chat_messages', 'send_chat_message', 'upload_file_to_chat', 'get_chat_attachment_url'];
    
    if (DIRECT_CHAT_TOOL_NAMES.includes(name)) {
      try {
        const sb = getChatSb();
        const User = (await import('../models/User.js')).default;
        const userId = context.userId;
        if (!userId) return { content: [{ type: 'text', text: 'Error: User context is required.' }], isError: true };

        // 1. LIST 1:1 CHATS
        if (name === 'list_chat_threads' || name === 'list_grids') {
          const { data: memberships, error: memErr } = await sb.from('chat_thread_members').select('thread_id').eq('user_id', userId);
          if (memErr) throw memErr;
          const threadIds = (memberships || []).map(m => m.thread_id);
          if (threadIds.length === 0) return { content: [{ type: 'text', text: '[]' }] };

          const { data: threads, error: thErr } = await sb.from('chat_threads')
            .select('id, type, updated_at, last_message, last_message_at, group_id')
            .in('id', threadIds)
            .eq('type', 'dm');
          if (thErr) throw thErr;
          
          // Get the other user for each thread to set the "name" of the thread
          const threadList = await Promise.all((threads || []).map(async (t) => {
            const { data: otherMembers } = await sb.from('chat_thread_members')
              .select('user_id')
              .eq('thread_id', t.id)
              .neq('user_id', userId)
              .limit(1);
            let otherUserName = 'Unknown User';
            let otherUserAvatar = null;
            if (otherMembers && otherMembers.length > 0) {
              const otherUser = await User.findById(otherMembers[0].user_id).select('name profilePicture').lean();
              if (otherUser) {
                otherUserName = otherUser.name;
                otherUserAvatar = otherUser.profilePicture;
              }
            }
            return {
              ...t,
              name: otherUserName,
              avatar_url: otherUserAvatar,
              last_message: t.last_message ? t.last_message.replace(/<[^>]*>?/gm, ' ').trim() : null
            };
          }));
          return { content: [{ type: 'text', text: JSON.stringify(threadList, null, 2) }] };
        }

        // 2. READ 1:1 MESSAGES
        if (name === 'read_chat_messages') {
          const { data: messages, error } = await sb.from('chat_messages')
            .select('*')
            .eq('thread_id', args.threadId)
            .order('created_at', { ascending: false })
            .limit(args.limit || 50);
          if (error) throw error;

          const senderIds = [...new Set((messages || []).map(m => m.sender_id).filter(Boolean))];
          let userMap = {};
          if (senderIds.length > 0) {
            const users = await User.find({ _id: { $in: senderIds } }).select('name email').lean();
            users.forEach(u => { userMap[u._id.toString()] = u; });
          }
          // Fetch attachments for all messages
          const msgIds = (messages || []).map(m => m.id);
          let attachMap = {};
          if (msgIds.length > 0) {
            const { data: attachments } = await sb.from('chat_attachments').select('*').in('message_id', msgIds);
            (attachments || []).forEach(a => {
              if (!attachMap[a.message_id]) attachMap[a.message_id] = [];
              attachMap[a.message_id].push({ file_url: a.file_url, file_name: a.file_name, file_type: a.file_type, file_size: a.file_size });
            });
          }
          const enriched = (messages || []).map(m => {
            const hasAttachments = attachMap[m.id] && attachMap[m.id].length > 0;
            return {
              ...m,
              message: m.message ? m.message.replace(/<[^>]*>?/gm, ' ').trim() : m.message,
              senderName: userMap[m.sender_id]?.name || 'Unknown',
              senderEmail: userMap[m.sender_id]?.email || '',
              is_sent_by_current_user: m.sender_id === userId,
              attachments: attachMap[m.id] || [],
              ai_hint: hasAttachments ? `This message has ${attachMap[m.id].length} attachment(s). URLs: ${attachMap[m.id].map(a => a.file_url).join(', ')}` : null
            };
          });
          return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] };
        }

        // 2.5 SEARCH USERS
        if (name === 'search_users_for_chat') {
          const User = (await import('../models/User.js')).default;
          const users = await User.find({
            $or: [
              { name: { $regex: args.query, $options: 'i' } },
              { email: { $regex: args.query, $options: 'i' } }
            ]
          }).select('name email role').limit(args.limit || 10).lean();
          return { content: [{ type: 'text', text: JSON.stringify(users, null, 2) }] };
        }

        // 3. SEND 1:1 MESSAGE
        if (name === 'send_chat_message') {
          const User = (await import('../models/User.js')).default;
          let resolvedUser = null;
          if (args.senderUserId && args.senderUserId.length === 24) {
            resolvedUser = await User.findById(args.senderUserId).select('name profilePicture').lean();
          }
          if (!resolvedUser) {
            resolvedUser = await User.findOne({ email: 'support@classgrid.in' }).select('_id name profilePicture').lean();
          }
          
          const finalSenderId = resolvedUser?._id?.toString() || args.senderUserId;
          const finalSenderName = resolvedUser?.name || 'Classgrid AI';
          const finalUserAvatar = resolvedUser?.profilePicture || null;

          const { data: memCheck } = await sb.from('chat_thread_members').select('id').eq('thread_id', args.threadId).eq('user_id', finalSenderId).single();
          if (!memCheck) {
            await sb.from('chat_thread_members').insert({ thread_id: args.threadId, user_id: finalSenderId, role: 'member' });
          }

          const { data: msg, error } = await sb.from('chat_messages').insert([{
            thread_id: args.threadId,
            sender_id: finalSenderId,
            sender_name: finalSenderName,
            user_avatar: finalUserAvatar,
            message: args.content
          }]).select().single();
          if (error) throw error;
          
          await sb.from('chat_threads').update({ 
            last_message: args.content, 
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('id', args.threadId);

          broadcastToChannel(`thread:${args.threadId}`, 'new_message', {
            id: msg.id,
            thread_id: args.threadId,
            sender_id: finalSenderId,
            sender_name: finalSenderName,
            user_avatar: finalUserAvatar,
            message: args.content,
            created_at: new Date().toISOString(),
            attachments: []
          });

          // Increment unread count for all OTHER members so the badge (1, 2, 3...) shows up
          try {
            const { data: members } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', args.threadId);
            if (members) {
              for (const m of members) {
                if (m.user_id !== finalSenderId) {
                  try {
                    if (redis && redis.status === 'ready') {
                      await redis.hincrby(`unread:${m.user_id}`, args.threadId, 1);
                    }
                  } catch {}
                  broadcastToChannel(`user:${m.user_id}`, 'thread_updated', {
                    threadId: args.threadId,
                    messageId: msg.id,
                    message: { sender_name: finalSenderName, message: args.content, created_at: new Date().toISOString() }
                  });
                }
              }
            }
          } catch {}
          
          return { content: [{ type: 'text', text: `Message sent successfully. ID: ${msg.id}` }] };
        }

        // 3.5 UPLOAD 1:1 FILE
        if (name === 'upload_file_to_chat') {
          const User = (await import('../models/User.js')).default;
          let resolvedUser = null;
          if (args.senderUserId && args.senderUserId.length === 24) {
            resolvedUser = await User.findById(args.senderUserId).select('name profilePicture').lean();
          }
          if (!resolvedUser) {
            resolvedUser = await User.findOne({ email: 'support@classgrid.in' }).select('_id name profilePicture').lean();
          }
          
          const finalSenderId = resolvedUser?._id?.toString() || args.senderUserId;
          const finalSenderName = resolvedUser?.name || 'Classgrid AI';
          const finalUserAvatar = resolvedUser?.profilePicture || null;

          const { data: memCheck } = await sb.from('chat_thread_members').select('id').eq('thread_id', args.threadId).eq('user_id', finalSenderId).single();
          if (!memCheck) {
            await sb.from('chat_thread_members').insert({ thread_id: args.threadId, user_id: finalSenderId, role: 'member' });
          }

          const { data: msg, error } = await sb.from('chat_messages').insert([{
            thread_id: args.threadId,
            sender_id: finalSenderId,
            sender_name: finalSenderName,
            user_avatar: finalUserAvatar,
            message: args.fileName || 'File'
          }]).select().single();
          if (error) throw error;
          
          const { error: attError } = await sb.from('chat_attachments').insert([{
            message_id: msg.id,
            file_url: args.fileUrl,
            file_name: args.fileName || 'File',
            file_type: args.fileType || 'unknown',
            file_size: args.fileSize || 0
          }]);
          if (attError) throw attError;

          await sb.from('chat_threads').update({ 
            last_message: '📎 File', 
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('id', args.threadId);

          broadcastToChannel(`thread:${args.threadId}`, 'new_message', {
            id: msg.id,
            thread_id: args.threadId,
            sender_id: finalSenderId,
            sender_name: finalSenderName,
            user_avatar: finalUserAvatar,
            message: args.fileName || 'File',
            created_at: new Date().toISOString(),
            attachments: [{ file_url: args.fileUrl, file_name: args.fileName || 'File', file_type: args.fileType || 'unknown', file_size: args.fileSize || 0 }]
          });

          // Increment unread count for all OTHER members so the badge shows up
          try {
            const { data: members } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', args.threadId);
            if (members) {
              for (const m of members) {
                if (m.user_id !== finalSenderId) {
                  try {
                    if (redis && redis.status === 'ready') {
                      await redis.hincrby(`unread:${m.user_id}`, args.threadId, 1);
                    }
                  } catch {}
                  broadcastToChannel(`user:${m.user_id}`, 'thread_updated', {
                    threadId: args.threadId,
                    messageId: msg.id,
                    message: { sender_name: finalSenderName, message: '📎 File', created_at: new Date().toISOString() }
                  });
                }
              }
            }
          } catch {}

          return { content: [{ type: 'text', text: `File uploaded successfully. Message ID: ${msg.id}` }] };
        }

        // 4. GET 1:1 ATTACHMENT
        if (name === 'get_chat_attachment_url') {
          const { data: attachments, error } = await sb.from('chat_attachments').select('*').eq('message_id', args.messageId);
          if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
          if (!attachments || attachments.length === 0) return { content: [{ type: 'text', text: 'No attachment found on this message.' }] };
          const result = attachments.map(a => ({ file_url: a.file_url, file_name: a.file_name, file_type: a.file_type, file_size: a.file_size }));
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

      } catch (e) {
        return { content: [{ type: 'text', text: `Error in direct chat tool: ${e.message}` }], isError: true };
      }
    }

    // ================= GROUP CHAT HANDLERS (12 tools — Supabase) =================
    const GROUP_CHAT_TOOL_NAMES = [
      'list_group_chats', 'read_group_chat_details', 'read_group_chat_messages',
      'send_group_chat_message', 'get_group_chat_attachment_url', 'upload_file_to_group_chat',
      'send_group_announcement', 'list_group_polls', 'read_group_poll_details',
      'create_group_poll', 'list_group_members', 'count_group_members'
    ];

    if (GROUP_CHAT_TOOL_NAMES.includes(name)) {
      try {
        const sb = getChatSb();
        const User = (await import('../models/User.js')).default;

        // Helper: get thread for a group
        const getThread = async (groupId) => {
          const { data } = await sb.from('chat_threads').select('*').eq('group_id', groupId).single();
          return data;
        };

        // 1. LIST GROUP CHATS (only groups user is a MEMBER of — org-scoped, membership-based)
        if (name === 'list_group_chats') {
          const userId = context.userId;
          if (!userId) return { content: [{ type: 'text', text: 'Error: User context is required to list group chats.' }], isError: true };

          // Step 1: Find all threads the user is a member of
          const { data: memberships, error: memErr } = await sb.from('chat_thread_members')
            .select('thread_id')
            .eq('user_id', userId);
          if (memErr) throw memErr;
          if (!memberships || memberships.length === 0) {
            return { content: [{ type: 'text', text: JSON.stringify({ groups: [], message: 'User is not a member of any group chats.' }) }] };
          }

          const threadIds = memberships.map(m => m.thread_id);

          // Step 2: Get group threads only (type = 'group') and extract group_ids
          const { data: threads, error: thErr } = await sb.from('chat_threads')
            .select('id, group_id, org_id, updated_at, last_message, last_message_at')
            .in('id', threadIds)
            .eq('type', 'group')
            .not('group_id', 'is', null);
          if (thErr) throw thErr;
          if (!threads || threads.length === 0) {
            return { content: [{ type: 'text', text: JSON.stringify({ groups: [], message: 'User has no group chats.' }) }] };
          }

          const groupIds = threads.map(t => t.group_id).filter(Boolean);

          // Step 3: Get the actual groups
          let groupQuery = sb.from('chat_groups').select('*').in('id', groupIds).order('created_at', { ascending: false }).limit(args.limit || 50);
          const { data: groups, error } = await groupQuery;
          if (error) throw error;

          // Enrich with thread metadata (last_message, last_message_at)
          const threadMap = {};
          threads.forEach(t => { threadMap[t.group_id] = t; });
          const enriched = (groups || []).map(g => ({
            ...g,
            threadId: threadMap[g.id]?.id || null,
            last_message: threadMap[g.id]?.last_message ? threadMap[g.id].last_message.replace(/<[^>]*>?/gm, ' ').trim() : null,
            last_message_at: threadMap[g.id]?.last_message_at || null,
          }));

          return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] };
        }


        // 2. READ GROUP DETAILS
        if (name === 'read_group_chat_details') {
          const { data: group, error } = await sb.from('chat_groups').select('*').eq('id', args.groupId).single();
          if (error || !group) return { content: [{ type: 'text', text: 'Error: Group not found.' }], isError: true };
          return { content: [{ type: 'text', text: JSON.stringify(group, null, 2) }] };
        }

        // 3. READ MESSAGES
        if (name === 'read_group_chat_messages') {
          const thread = await getThread(args.groupId);
          if (!thread) return { content: [{ type: 'text', text: 'Error: Group thread not found.' }], isError: true };
          const { data: messages, error } = await sb.from('chat_messages')
            .select('*')
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false })
            .limit(args.limit || 50);
          if (error) throw error;

          // Enrich with user names
          const senderIds = [...new Set((messages || []).map(m => m.sender_id).filter(Boolean))];
          let userMap = {};
          if (senderIds.length > 0) {
            const users = await User.find({ _id: { $in: senderIds } }).select('name email').lean();
            users.forEach(u => { userMap[u._id.toString()] = u; });
          }
          // Fetch attachments for all messages
          const msgIds = (messages || []).map(m => m.id);
          let attachMap = {};
          if (msgIds.length > 0) {
            const { data: attachments } = await sb.from('chat_attachments').select('*').in('message_id', msgIds);
            (attachments || []).forEach(a => {
              if (!attachMap[a.message_id]) attachMap[a.message_id] = [];
              attachMap[a.message_id].push({ file_url: a.file_url, file_name: a.file_name, file_type: a.file_type, file_size: a.file_size });
            });
          }
          const enriched = (messages || []).map(m => {
            const hasAttachments = attachMap[m.id] && attachMap[m.id].length > 0;
            return { 
              ...m, 
              message: m.message ? m.message.replace(/<[^>]*>?/gm, ' ').trim() : m.message,
              senderName: userMap[m.sender_id]?.name || 'Unknown',
              senderEmail: userMap[m.sender_id]?.email || '',
              is_sent_by_current_user: m.sender_id === context.userId,
              attachments: attachMap[m.id] || [],
              ai_hint: hasAttachments ? `This message has ${attachMap[m.id].length} attachment(s). URLs: ${attachMap[m.id].map(a => a.file_url).join(', ')}` : null
            };
          });
          return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] };
        }

        // 4. SEND MESSAGE
        if (name === 'send_group_chat_message') {
          const thread = await getThread(args.groupId);
          if (!thread) return { content: [{ type: 'text', text: 'Error: Group thread not found.' }], isError: true };
          
          const User = (await import('../models/User.js')).default;
          let resolvedUser = null;
          if (args.senderUserId && args.senderUserId.length === 24) {
            resolvedUser = await User.findById(args.senderUserId).select('name profilePicture').lean();
          }
          if (!resolvedUser) {
            resolvedUser = await User.findOne({ email: 'support@classgrid.in' }).select('_id name profilePicture').lean();
          }
          
          const finalSenderId = resolvedUser?._id?.toString() || args.senderUserId;
          const finalSenderName = resolvedUser?.name || 'Classgrid AI';
          const finalUserAvatar = resolvedUser?.profilePicture || null;

          const { data: memCheck } = await sb.from('chat_thread_members').select('id').eq('thread_id', thread.id).eq('user_id', finalSenderId).single();
          if (!memCheck) {
            await sb.from('chat_thread_members').insert({ thread_id: thread.id, user_id: finalSenderId, role: 'member' });
          }

          const { data: msg, error } = await sb.from('chat_messages').insert([{
            thread_id: thread.id,
            sender_id: finalSenderId,
            sender_name: finalSenderName,
            user_avatar: finalUserAvatar,
            message: args.content
          }]).select().single();
          if (error) throw error;
          
          await sb.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', thread.id);
          
          broadcastToChannel(`thread:${thread.id}`, 'new_message', {
            id: msg.id,
            thread_id: thread.id,
            sender_id: finalSenderId,
            sender_name: finalSenderName,
            user_avatar: finalUserAvatar,
            message: args.content,
            created_at: new Date().toISOString(),
            attachments: []
          });

          // Increment unread count for all OTHER group members
          try {
            const { data: members } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', thread.id);
            if (members) {
              for (const m of members) {
                if (m.user_id !== finalSenderId) {
                  try {
                    if (redis && redis.status === 'ready') {
                      await redis.hincrby(`unread:${m.user_id}`, thread.id, 1);
                    }
                  } catch {}
                  broadcastToChannel(`user:${m.user_id}`, 'thread_updated', {
                    threadId: thread.id,
                    messageId: msg.id,
                    message: { sender_name: finalSenderName, message: args.content, created_at: new Date().toISOString() }
                  });
                }
              }
            }
          } catch {}

          return { content: [{ type: 'text', text: `Message sent successfully. ID: ${msg.id}` }] };
        }

        // 5. GET ATTACHMENT URL
        if (name === 'get_group_chat_attachment_url') {
          const { data: attachments, error } = await sb.from('chat_attachments').select('*').eq('message_id', args.messageId);
          if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
          if (!attachments || attachments.length === 0) return { content: [{ type: 'text', text: 'No attachment found on this message.' }] };
          const result = attachments.map(a => ({ file_url: a.file_url, file_name: a.file_name, file_type: a.file_type, file_size: a.file_size }));
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        // 6. UPLOAD FILE
        if (name === 'upload_file_to_group_chat') {
          const thread = await getThread(args.groupId);
          if (!thread) return { content: [{ type: 'text', text: 'Error: Group thread not found.' }], isError: true };
          
          const User = (await import('../models/User.js')).default;
          let resolvedUser = null;
          if (args.senderUserId && args.senderUserId.length === 24) {
            resolvedUser = await User.findById(args.senderUserId).select('name profilePicture').lean();
          }
          if (!resolvedUser) {
            resolvedUser = await User.findOne({ email: 'support@classgrid.in' }).select('_id name profilePicture').lean();
          }
          
          const finalSenderId = resolvedUser?._id?.toString() || args.senderUserId;
          const finalSenderName = resolvedUser?.name || 'Classgrid AI';
          const finalUserAvatar = resolvedUser?.profilePicture || null;

          const { data: memCheck } = await sb.from('chat_thread_members').select('id').eq('thread_id', thread.id).eq('user_id', finalSenderId).single();
          if (!memCheck) {
            await sb.from('chat_thread_members').insert({ thread_id: thread.id, user_id: finalSenderId, role: 'member' });
          }

          const { data: msg, error } = await sb.from('chat_messages').insert([{
            thread_id: thread.id,
            sender_id: finalSenderId,
            sender_name: finalSenderName,
            user_avatar: finalUserAvatar,
            message: args.fileName || 'File'
          }]).select().single();
          if (error) throw error;
          
          const { error: attError } = await sb.from('chat_attachments').insert([{
            message_id: msg.id,
            file_url: args.fileUrl,
            file_name: args.fileName || 'File',
            file_type: args.fileType || 'unknown',
            file_size: args.fileSize || 0
          }]);
          if (attError) throw attError;
          
          await sb.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', thread.id);

          // Increment unread count for all OTHER group members
          try {
            const { data: members } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', thread.id);
            if (members) {
              for (const m of members) {
                if (m.user_id !== finalSenderId) {
                  try {
                    if (redis && redis.status === 'ready') {
                      await redis.hincrby(`unread:${m.user_id}`, thread.id, 1);
                    }
                  } catch {}
                  broadcastToChannel(`user:${m.user_id}`, 'thread_updated', {
                    threadId: thread.id,
                    messageId: msg.id,
                    message: { sender_name: finalSenderName, message: '📎 File', created_at: new Date().toISOString() }
                  });
                }
              }
            }
          } catch {}

          return { content: [{ type: 'text', text: `File uploaded successfully. Message ID: ${msg.id}` }] };
        }

        // 7. SEND ANNOUNCEMENT
        if (name === 'send_group_announcement') {
          const thread = await getThread(args.groupId);
          if (!thread) return { content: [{ type: 'text', text: 'Error: Group thread not found.' }], isError: true };
          
          const User = (await import('../models/User.js')).default;
          let resolvedUser = null;
          if (args.senderUserId && args.senderUserId.length === 24) {
            resolvedUser = await User.findById(args.senderUserId).select('name profilePicture').lean();
          }
          if (!resolvedUser) {
            resolvedUser = await User.findOne({ email: 'support@classgrid.in' }).select('_id name profilePicture').lean();
          }
          
          const finalSenderId = resolvedUser?._id?.toString() || args.senderUserId;
          const finalSenderName = resolvedUser?.name || 'Classgrid AI';
          const finalUserAvatar = resolvedUser?.profilePicture || null;

          const { data: memCheck } = await sb.from('chat_thread_members').select('id').eq('thread_id', thread.id).eq('user_id', finalSenderId).single();
          if (!memCheck) {
            await sb.from('chat_thread_members').insert({ thread_id: thread.id, user_id: finalSenderId, role: 'member' });
          }

          const { data: msg, error } = await sb.from('chat_messages').insert([{
            thread_id: thread.id,
            sender_id: finalSenderId,
            sender_name: finalSenderName,
            user_avatar: finalUserAvatar,
            message: args.content
          }]).select().single();
          if (error) throw error;
          await sb.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', thread.id);
          
          broadcastToChannel(`thread:${thread.id}`, 'new_message', {
            id: msg.id,
            thread_id: thread.id,
            sender_id: finalSenderId,
            sender_name: finalSenderName,
            user_avatar: finalUserAvatar,
            message: args.content,
            created_at: new Date().toISOString(),
            attachments: []
          });

          // Increment unread count for all OTHER group members
          try {
            const { data: members } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', thread.id);
            if (members) {
              for (const m of members) {
                if (m.user_id !== finalSenderId) {
                  try {
                    if (redis && redis.status === 'ready') {
                      await redis.hincrby(`unread:${m.user_id}`, thread.id, 1);
                    }
                  } catch {}
                  broadcastToChannel(`user:${m.user_id}`, 'thread_updated', {
                    threadId: thread.id,
                    messageId: msg.id,
                    message: { sender_name: finalSenderName, message: args.content, created_at: new Date().toISOString() }
                  });
                }
              }
            }
          } catch {}

          return { content: [{ type: 'text', text: `Announcement sent successfully. ID: ${msg.id}` }] };
        }

        // 8. LIST POLLS
        if (name === 'list_group_polls') {
          const thread = await getThread(args.groupId);
          if (!thread) return { content: [{ type: 'text', text: 'Error: Group thread not found.' }], isError: true };
          const { data: polls, error } = await sb.from('chat_polls').select('*').eq('thread_id', thread.id).order('created_at', { ascending: false });
          if (error) throw error;

          const result = await Promise.all((polls || []).map(async (poll) => {
            const { data: votes } = await sb.from('chat_poll_votes').select('option_id, user_id').eq('poll_id', poll.id);
            const voteCounts = {};
            (votes || []).forEach(v => { voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1; });
            return { ...poll, vote_counts: voteCounts, total_votes: (votes || []).length };
          }));
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        // 9. READ POLL DETAILS
        if (name === 'read_group_poll_details') {
          const { data: poll, error } = await sb.from('chat_polls').select('*').eq('id', args.pollId).single();
          if (error || !poll) return { content: [{ type: 'text', text: 'Error: Poll not found.' }], isError: true };
          const { data: votes } = await sb.from('chat_poll_votes').select('option_id, user_id').eq('poll_id', args.pollId);
          const voteCounts = {};
          (votes || []).forEach(v => { voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1; });
          return { content: [{ type: 'text', text: JSON.stringify({ ...poll, vote_counts: voteCounts, total_votes: (votes || []).length }, null, 2) }] };
        }

        // 10. CREATE POLL
        if (name === 'create_group_poll') {
          const thread = await getThread(args.groupId);
          if (!thread) return { content: [{ type: 'text', text: 'Error: Group thread not found.' }], isError: true };
          // Same steps as the app's Poll button (POST /groups/:id/polls): the poll is linked to its
          // "📊 Poll" message (message_id), which is how the group shows a voting card instead of plain text
          const question = String(args.question || '').trim();
          const rawOptions = Array.isArray(args.options) ? args.options : [];
          if (!question) return { content: [{ type: 'text', text: 'Error: Poll question is required.' }], isError: true };
          if (rawOptions.length < 2 || rawOptions.length > 10) return { content: [{ type: 'text', text: 'Error: Poll must have 2-10 options.' }], isError: true };
          const options = rawOptions.map((text, i) => ({
            id: String.fromCharCode(97 + i), // a, b, c, ... like the app
            text: typeof text === 'string' ? text.trim() : String(text?.text || '').trim(),
          }));
          const creator = /^[0-9a-fA-F]{24}$/.test(String(args.creatorUserId || ''))
            ? await User.findById(args.creatorUserId).select('name profilePicture').lean()
            : null;
          const now = new Date().toISOString();
          const pollText = `📊 Poll: ${question}`;
          const { data: insertedMsg, error: msgError } = await sb.from('chat_messages').insert({
            thread_id: thread.id,
            sender_id: args.creatorUserId,
            sender_name: creator?.name || 'User',
            user_avatar: creator?.profilePicture || null,
            message: pollText,
            created_at: now
          }).select('id').single();
          if (msgError) throw msgError;
          sb.from('chat_threads').update({ last_message: pollText, last_message_at: now }).eq('id', thread.id).then(() => {}, () => {});
          const { data: poll, error } = await sb.from('chat_polls').insert([{
            thread_id: thread.id,
            message_id: insertedMsg.id,
            question,
            options,
            allow_multiple: args.allowMultiple || false,
            is_anonymous: args.isAnonymous || false,
            created_by: args.creatorUserId,
            closes_at: args.closesAt || null
          }]).select().single();
          if (error) throw error;
          broadcastToChannel(`thread:${thread.id}`, 'new_poll', {
            poll: { ...poll, voteCounts: {}, totalVoters: 0, myVotes: [] },
            messageId: insertedMsg.id,
          }).catch(() => {});
          return { content: [{ type: 'text', text: `Poll created successfully. ID: ${poll.id}` }] };
        }

        // 11. LIST GROUP MEMBERS
        if (name === 'list_group_members') {
          const thread = await getThread(args.groupId);
          if (!thread) return { content: [{ type: 'text', text: 'Error: Group thread not found.' }], isError: true };
          const { data: members, error } = await sb.from('chat_thread_members').select('user_id, role, joined_at').eq('thread_id', thread.id);
          if (error) throw error;
          const memberIds = (members || []).map(m => m.user_id).filter(id => /^[0-9a-fA-F]{24}$/.test(id));
          const users = await User.find({ _id: { $in: memberIds } }).select('name email role profilePicture').lean();
          const userMap = {};
          users.forEach(u => { userMap[u._id.toString()] = u; });
          const enriched = (members || []).map(m => ({
            userId: m.user_id,
            name: userMap[m.user_id]?.name || 'Unknown',
            email: userMap[m.user_id]?.email || '',
            userRole: userMap[m.user_id]?.role || '',
            groupRole: m.role,
            joinedAt: m.joined_at
          }));
          return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] };
        }

        // 12. COUNT GROUP MEMBERS
        if (name === 'count_group_members') {
          const thread = await getThread(args.groupId);
          if (!thread) return { content: [{ type: 'text', text: 'Error: Group thread not found.' }], isError: true };
          const { data: members, error } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', thread.id);
          if (error) throw error;
          return { content: [{ type: 'text', text: `Total members: ${(members || []).length}` }] };
        }

      } catch (e) {
        return { content: [{ type: 'text', text: `Error in group chat tool: ${e.message}` }], isError: true };
      }
    }

    // ================= ORGANIZATION HANDLERS =================
    // ================= GLOBAL USERS (staff) =================
    if (name === 'list_global_users') {
      try {
        if (!String(userEmail || '').toLowerCase().trim().endsWith('@classgrid.in')) {
          return { content: [{ type: 'text', text: 'Error: Only Classgrid staff can list users across the platform.' }], isError: true };
        }
        const User = (await import('../models/User.js')).default;
        await import('../models/Organization.js'); // registers the model used by populate below
        const mongoose = (await import('mongoose')).default;
        const query = {};
        if (args.role) query.role = String(args.role);
        if (args.orgId && mongoose.Types.ObjectId.isValid(args.orgId)) query.organization_id = new mongoose.Types.ObjectId(args.orgId);
        if (args.search) {
          const safe = String(args.search).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          query.$or = [{ name: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }];
        }
        if (Number(args.days) > 0) query.createdAt = { $gte: new Date(Date.now() - Number(args.days) * 86400000) };
        const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
        const [users, total, platformTotal] = await Promise.all([
          User.find(query).select('name email role organization_id createdAt').populate('organization_id', 'name subdomain').sort({ createdAt: -1 }).limit(limit).lean(),
          User.countDocuments(query),
          User.estimatedDocumentCount(),
        ]);
        const result = {
          platformTotalUsers: platformTotal,
          matching: total,
          returned: users.length,
          users: users.map((u) => ({
            _id: u._id, name: u.name, email: u.email, role: u.role,
            organization: u.organization_id ? { _id: u.organization_id._id, name: u.organization_id.name, subdomain: u.organization_id.subdomain } : null,
            joinedAt: u.createdAt,
          })),
        };
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error in list_global_users: ${e.message}` }], isError: true };
      }
    }

    if (['list_organizations', 'read_organization_details', 'count_organization_users'].includes(name)) {
      try {
        const Organization = (await import('../models/Organization.js')).default;

        if (name === 'list_organizations') {
          const query = {};
          if (args.status) query.status = args.status;
          const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 200);
          // A short summary per org: full documents (feature_flags, admission_config, ...) overflowed the reply after one record
          const [orgs, total, byStatus] = await Promise.all([
            Organization.find(query).select(ORG_SUMMARY_FIELDS).sort({ createdAt: -1 }).limit(limit).lean(),
            Organization.countDocuments(query),
            Organization.aggregate([{ $match: query }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
          ]);
          const result = {
            total,
            byStatus: Object.fromEntries(byStatus.map((s) => [s._id || 'unknown', s.count])),
            returned: orgs.length,
            organizations: orgs,
          };
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        if (name === 'read_organization_details') {
          const org = await Organization.findById(args.orgId).select(ORG_HIDDEN_FIELDS).lean();
          if (!org) return { content: [{ type: 'text', text: 'Error: Organization not found.' }], isError: true };
          return { content: [{ type: 'text', text: JSON.stringify(compactOrg(org)) }] };
        }

        if (name === 'count_organization_users') {
          const User = (await import('../models/User.js')).default;
          const mongoose = (await import('mongoose')).default;

          const org = await Organization.findById(args.orgId).select('name').lean();
          const orgName = org ? org.name : 'Unknown Organization';

          const roleCounts = await User.aggregate([
            { $match: { organization_id: new mongoose.Types.ObjectId(args.orgId) } },
            {
              $group: {
                _id: "$role",
                count: { $sum: 1 },
                users: { $push: { name: "$name", email: "$email" } }
              }
            },
            { $sort: { count: -1 } }
          ]);

          const result = {
            organizationId: args.orgId,
            organizationName: orgName,
            roles: roleCounts
          };

          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
      } catch (e) {
        return { content: [{ type: 'text', text: `Error in organization tool: ${e.message}` }], isError: true };
      }
    }

    // ================= SUPABASE SUBSCRIBERS HANDLERS =================
    if (['list_blog_subscribers', 'count_blog_subscribers'].includes(name)) {
      try {
        const { getBlogSubscribersSb } = await import('../config/blogSubscribersSupabaseClient.js');
        const sb = getBlogSubscribersSb();

        // Same filters for the list and the count (preference, joined month / last N days / date range, active)
        const applySubscriberFilters = (query) => {
          if (args.preference === 'blog') query = query.eq('receives_blog', true);
          else if (args.preference === 'changelog') query = query.eq('receives_changelog', true);
          else if (args.preference === 'legal') query = query.eq('receives_legal', true);
          if (args.active_only) query = query.eq('is_active', true);
          let from = null, to = null;
          if (/^\d{4}-\d{2}$/.test(String(args.month || ''))) {
            const [y, m] = args.month.split('-').map(Number);
            from = new Date(Date.UTC(y, m - 1, 1)); to = new Date(Date.UTC(y, m, 1));
          }
          if (Number(args.days) > 0) from = new Date(Date.now() - Number(args.days) * 86400000);
          if (args.since && !isNaN(Date.parse(args.since))) from = new Date(args.since);
          if (args.until && !isNaN(Date.parse(args.until))) { to = new Date(args.until); to.setUTCDate(to.getUTCDate() + 1); }
          if (from) query = query.gte('created_at', from.toISOString());
          if (to) query = query.lt('created_at', to.toISOString());
          return query;
        };

        if (name === 'list_blog_subscribers') {
          // Only what the answer needs: full rows (unsubscribe_token, short_code...) overflowed the reply and must not reach the AI
          const limit = Math.min(Math.max(Number(args.limit) || 30, 1), 60);
          const [{ data, error }, { count, error: countError }] = await Promise.all([
            applySubscriberFilters(sb.from('blog_subscribers').select('name, email, created_at, is_active, receives_blog, receives_changelog, receives_legal')).order('created_at', { ascending: false }).limit(limit),
            applySubscriberFilters(sb.from('blog_subscribers').select('id', { count: 'exact', head: true })),
          ]);
          if (error) throw error;
          if (countError) throw countError;
          const subscribers = (data || []).map((r) => ({
            name: r.name || '',
            email: r.email,
            joined: String(r.created_at || '').slice(0, 10),
            active: r.is_active !== false,
            receives: ['blog', 'changelog', 'legal'].filter((k) => r[`receives_${k}`]).join(','),
          }));
          const result = { totalMatching: count ?? subscribers.length, listed: subscribers.length, subscribers };
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        }

        if (name === 'count_blog_subscribers') {
          const { count, error } = await applySubscriberFilters(sb.from('blog_subscribers').select('id', { count: 'exact', head: true }));
          if (error) throw error;
          const scope = [args.preference && args.preference !== 'all' ? args.preference : 'all preferences', args.month ? `joined ${args.month}` : '', args.days ? `last ${args.days} days` : '', args.since ? `since ${args.since}` : '', args.until ? `until ${args.until}` : '', args.active_only ? 'active only' : ''].filter(Boolean).join(', ');
          return { content: [{ type: 'text', text: `Subscribers (${scope}): ${count}` }] };
        }
      } catch (e) {
        return { content: [{ type: 'text', text: `Error in subscriber tool: ${e.message}` }], isError: true };
      }
    }

    // ================= LEAD CRM HANDLERS =================
    if (['list_leads', 'read_lead_details', 'assign_lead', 'update_lead_info', 'update_lead_meeting_notes', 'schedule_lead_meeting', 'request_lead_vetting_approval', 'approve_lead_and_provision', 'delete_lead'].includes(name)) {
      try {
        const DemoRequest = (await import('../models/DemoRequest.js')).default;

        if (name === 'list_leads') {
          const filter = {};
          if (args.status) filter.status = args.status;
          const leads = await DemoRequest.find(filter).sort({ createdAt: -1 }).limit(args.limit || 50).lean();
          return { content: [{ type: 'text', text: JSON.stringify(leads, null, 2) }] };
        }

        if (name === 'read_lead_details') {
          const lead = await DemoRequest.findById(args.leadId).populate('assignedTo', 'name email').lean();
          if (!lead) return { content: [{ type: 'text', text: 'Lead not found.' }], isError: true };
          return { content: [{ type: 'text', text: JSON.stringify(lead, null, 2) }] };
        }

        if (name === 'assign_lead') {
          const lead = await DemoRequest.findByIdAndUpdate(args.leadId, { assignedTo: args.assignedTo, assignedAt: new Date() }, { returnDocument: 'after' });
          return { content: [{ type: 'text', text: `Lead assigned successfully.` }] };
        }

        if (name === 'update_lead_info') {
          const lead = await DemoRequest.findByIdAndUpdate(args.leadId, { $set: args.updates }, { returnDocument: 'after' });
          return { content: [{ type: 'text', text: `Lead info updated successfully.` }] };
        }

        if (name === 'update_lead_meeting_notes') {
          const lead = await DemoRequest.findByIdAndUpdate(args.leadId, { meetingNotes: args.meetingNotes }, { returnDocument: 'after' });
          return { content: [{ type: 'text', text: `Meeting notes updated.` }] };
        }

        if (name === 'request_lead_vetting_approval') {
          const lead = await DemoRequest.findByIdAndUpdate(args.leadId, { isOrganizationVetted: args.isOrganizationVetted }, { returnDocument: 'after' });
          return { content: [{ type: 'text', text: `Lead vetting status updated to ${args.isOrganizationVetted}.` }] };
        }

        if (name === 'delete_lead') {
          await DemoRequest.findByIdAndDelete(args.leadId);
          return { content: [{ type: 'text', text: `Lead deleted permanently.` }] };
        }

        if (name === 'schedule_lead_meeting') {
          // Minimal mock implementation that just updates the lead to match the controller logic (without full email tracking)
          const lead = await DemoRequest.findById(args.leadId);
          if (!lead) return { content: [{ type: 'text', text: 'Lead not found.' }], isError: true };

          lead.meetingStatus = "rescheduled";
          lead.meetingProvider = args.provider || "google";
          lead.meetingScheduledAt = new Date(args.scheduledAt);
          lead.meetingUrl = args.meetingUrl;
          if (args.notes) lead.meetingNotes = args.notes;
          if (lead.status === "new") lead.status = "contacted";
          lead.lifecycleStage = "meeting_scheduled";
          await lead.save();
          return { content: [{ type: 'text', text: `Meeting scheduled and lead updated successfully.` }] };
        }

        if (name === 'approve_lead_and_provision') {
          // Wrap the actual service
          const { approveLeadAndProvision: approveService } = await import("../services/lead-conversion.service.js");
          const result = await approveService(args.leadId, { plan: args.plan || "demo" }, null);
          return { content: [{ type: 'text', text: `Lead approved and provisioned successfully! New Org ID: ${result.organization?._id}` }] };
        }

      } catch (e) {
        return { content: [{ type: 'text', text: `Error in Lead tool: ${e.message}` }], isError: true };
      }
    }

    if (name === 'read_local_file') {
      try {
        const content = fs.readFileSync(args.filePath, 'utf8');
        return { content: [{ type: 'text', text: content }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error reading file: ${e.message}` }] };
      }
    }

    if (name === 'transcribe_audio') {
      try {
        const { fileUrl } = args;
        const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const cfToken = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;

        if (!cfAccountId || !cfToken) {
          return { content: [{ type: 'text', text: 'Error: Cloudflare credentials are not configured on the server.' }] };
        }

        // Fetch the audio file
        const audioResponse = await fetch(fileUrl);
        if (!audioResponse.ok) {
          return { content: [{ type: 'text', text: `Error: Failed to fetch audio file from URL. Status: ${audioResponse.status}` }] };
        }
        const mimeType = audioResponse.headers.get('content-type') || 'audio/webm';
        const cleanMime = mimeType.split(';')[0];
        const audioBuffer = await audioResponse.arrayBuffer();

        // Send to Cloudflare Workers AI Whisper
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/openai/whisper-large-v3-turbo`;
        const aiResponse = await fetch(cfUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cfToken}`,
            'Content-Type': cleanMime
          },
          body: audioBuffer
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          return { content: [{ type: 'text', text: `Error from Cloudflare API: ${aiResponse.status} - ${errText}` }] };
        }

        const aiResult = await aiResponse.json();

        if (aiResult.success && aiResult.result && aiResult.result.text) {
          return { content: [{ type: 'text', text: aiResult.result.text }] };
        } else {
          return { content: [{ type: 'text', text: `Transcription failed or returned unexpected format: ${JSON.stringify(aiResult)}` }] };
        }
      } catch (e) {
        return { content: [{ type: 'text', text: `Error in transcribe_audio: ${e.message}` }] };
      }
    }

    if (name === 'unified_db_query') {
      let { source, collectionOrTable, operation, query = {}, data = {} } = args;
      const { userEmail = '', userRole = '', subdomain = '' } = context;
      const isSuperAdmin = userEmail.endsWith('@classgrid.in') || ['super_admin', 'co_super_admin'].includes(userRole);

      if (source === 'mongodb') {
        if (!mongoose.connection.db) {
          throw new Error("MongoDB connection not established");
        }

        // Map cheat sheet model names to actual pluralized collection names
        const collectionMap = {
          'SupportTicket': 'supporttickets',
          'SupportConversation': 'supportconversations',
          'Message': 'messages',
          'DemoRequest': 'demorequests',
          'User': 'users',
          'UserProfile': 'userprofiles',
          'Organization': 'organizations',
          'SystemLog': 'systemlogs',
          'ActivityLog': 'activitylogs',
          'Assignment': 'assignments',
          'AssignmentSubmission': 'assignmentsubmissions',
          'Note': 'notes',
          'Classroom': 'classrooms',
          'Attendance': 'attendances',
          'AttendanceRecord': 'attendancerecords',
          'Exam': 'exams',
          'FeeRecord': 'feerecords',
          'Invoice': 'invoices',
          'Lead': 'leads',
          'NotificationLog': 'notificationlogs'
        };
        // Fallback for models not explicitly mapped: lowercase and add 's' (Mongoose default)
        let actualCollectionName = collectionMap[collectionOrTable];
        if (!actualCollectionName) {
          if (collectionOrTable.endsWith('y')) {
            actualCollectionName = collectionOrTable.slice(0, -1).toLowerCase() + 'ies';
          } else {
            actualCollectionName = collectionOrTable.toLowerCase() + 's';
          }
        }

        // --- LAYER 2 RBAC SECURITY ENFORCEMENT ---
        const superAdminOnlyCollections = [
          'systemlogs', 'activitylogs', 'organizations', 'users',
          'supporttickets', 'demorequests', 'billingexportjobs',
          'invoices', 'platformtransactions', 'adminauditlogs',
          'notificationlogs'
        ];

        if (superAdminOnlyCollections.includes(actualCollectionName) && !isSuperAdmin) {
          return {
            content: [{ type: 'text', text: `SECURITY ERROR: Access Denied. Database firewall blocked role '${userRole}' from accessing restricted collection '${actualCollectionName}'.` }]
          };
        }

        const collection = mongoose.connection.db.collection(actualCollectionName);

        if (actualCollectionName === 'users' && query) {
          // No auto-correction for org_admin needed; the schema strictly uses org_admin.
        }

        let result;

        // --- LAYER 3 TENANT ISOLATION ---
        // If not a super admin, force filter by their organization_id to prevent multi-tenant data leaks.
        if (!isSuperAdmin) {
          const usersCollection = mongoose.connection.db.collection('users');
          const userDoc = await usersCollection.findOne({ email: userEmail });
          if (userDoc && userDoc.organization_id) {
            // Safely inject into query
            if (query && !Array.isArray(query)) {
              query.organization_id = userDoc.organization_id;
            }
          } else {
            return {
              content: [{ type: 'text', text: `SECURITY ERROR: Could not determine your organization_id. Cannot execute query.` }]
            };
          }
        }

        let projection = {};
        if (args.fields && Array.isArray(args.fields) && args.fields.length > 0) {
          args.fields.forEach(f => projection[f] = 1);
        }

        // ISSUE #1 FIX: Reject find/findOne queries without fields to prevent returning full documents
        if ((operation === 'find' || operation === 'findOne') && Object.keys(projection).length === 0) {
          return {
            content: [{ type: 'text', text: `ERROR: You MUST specify the 'fields' parameter with the exact fields you need (e.g. fields: ["name", "email"]). Returning full documents is blocked. Available fields for reference: _id, name, email, role, organization_id, phone, status, createdAt` }]
          };
        }

        // Use user-specified limit, default 20, max 500
        const queryLimit = Math.min(Math.max(1, args.limit || 20), 500);

        if (operation === 'find') {
          if (actualCollectionName === 'users') {
            const pipeline = [
              { $match: query || {} },
              { $limit: queryLimit },
              {
                $addFields: {
                  orgObjId: { $convert: { input: "$organization_id", to: "objectId", onError: null, onNull: null } }
                }
              },
              {
                $lookup: {
                  from: 'organizations',
                  localField: 'orgObjId',
                  foreignField: '_id',
                  as: 'organization_details'
                }
              }
            ];

            if (Object.keys(projection).length > 0) {
              pipeline.push({ $project: projection });
            }

            result = await collection.aggregate(pipeline).toArray();
          } else {
            if (Object.keys(projection).length > 0) {
              result = await collection.find(query).project(projection).limit(queryLimit).toArray();
            } else {
              result = await collection.find(query).limit(queryLimit).toArray();
            }
          }
        } else if (operation === 'findOne') {
          if (Object.keys(projection).length > 0) {
            result = await collection.findOne(query, { projection });
          } else {
            result = await collection.findOne(query);
          }
        } else if (operation === 'countDocuments') {
          result = { count: await collection.countDocuments(query) };
        } else if (operation === 'distinct') {
          const field = data?.field || query?.field || 'role';
          const filter = query?.filter || (query?.field ? {} : query);
          result = await collection.distinct(field, filter);
        } else if (operation === 'aggregate') {
          const pipeline = Array.isArray(query) ? query : (Array.isArray(data) ? data : data?.pipeline || query?.pipeline || []);

          if (!isSuperAdmin) {
            const usersCollection = mongoose.connection.db.collection('users');
            const userDoc = await usersCollection.findOne({ email: userEmail });
            if (userDoc && userDoc.organization_id) {
              pipeline.unshift({ $match: { organization_id: userDoc.organization_id } });
            }
          }

          const hasLimit = pipeline.some(stage => Object.keys(stage)[0] === '$limit');
          if (!hasLimit) pipeline.push({ $limit: queryLimit });

          result = await collection.aggregate(pipeline).toArray();
        } else if (operation === 'update') {
          result = await collection.updateMany(query, { $set: data });
        } else if (operation === 'insert') {
          result = await collection.insertMany(Array.isArray(data) ? data : [data]);
        } else if (operation === 'delete') {
          result = await collection.deleteMany(query);
        } else {
          throw new Error(`Unsupported MongoDB operation: ${operation}`);
        }

        // Enforce projection for multiple items to solve Issue #1 (Data Leak & Token Limits)
        if (Array.isArray(result) && result.length > 1) {
          const hasFields = args.fields && Array.isArray(args.fields) && args.fields.length > 0;
          const hasProject = operation === 'aggregate' && pipeline && pipeline.some(stage => Object.keys(stage)[0] === '$project');

          if (!hasFields && !hasProject) {
            return {
              content: [{ type: 'text', text: `ERROR: Query returned ${result.length} documents. You MUST use the 'fields' array parameter (or a $project stage) to specify exactly which fields you need (e.g. fields: ["name", "email"]). Returning full documents is forbidden for security and token limit reasons. First document keys for reference: ${Object.keys(result[0] || {}).join(', ')}` }]
            };
          }
        }

        // ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ AI TOKEN OVERFLOW PROTECTION ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨
        const aiSafetyReplacer = (key, value) => {
          const forbiddenKeys = [
            'password', 'profilePicture', 'profileBanner', 'logo', 'favicon', 'signature',
            'activationToken', 'resetPasswordToken', 'payroll_config', 'preferences', 'settings',
            'fee_structures', 'modules', 'theme', 'audit_logs', 'history', 'metadata', 'permissions',
            'hash', 'salt', 'biometric', 'token', 'secret'
          ];
          if (forbiddenKeys.some(fk => key.toLowerCase().includes(fk))) return undefined;

          if (typeof value === 'string' && value.length > 500) return "[TRUNCATED HUGE STRING]";

          // Aggressive list protection: If we are returning a list of documents, strip out any nested arrays to prevent context overflow!
          if (key !== "" && Array.isArray(value) && value.length > 3 && Array.isArray(result) && result.length > 2) {
            return `[Array of ${value.length} items TRUNCATED to save context]`;
          }

          return value;
        };

        let outputText = JSON.stringify(result, aiSafetyReplacer, 2);

        if (outputText.length > 10000) {
          return {
            content: [{ type: 'text', text: `ERROR: The result is too large (${outputText.length} bytes). Even with fields requested, it exceeds the context window. Add a stricter filter to your query.` }]
          };
        }



        return {
          content: [{ type: 'text', text: outputText }],
        };
      }
      else if (source === 'supabase') {
        const sb = getChatSb();
        let result;

        // --- LAYER 2 RBAC SECURITY ENFORCEMENT ---
        const superAdminOnlyTables = ['email_notification_queue', 'holidays'];
        if (superAdminOnlyTables.includes(collectionOrTable.toLowerCase()) && !isSuperAdmin) {
          return {
            content: [{ type: 'text', text: `SECURITY ERROR: Access Denied. Database firewall blocked role '${userRole}' from accessing restricted table '${collectionOrTable}'.` }]
          };
        }

        if (operation === 'count' || operation === 'countDocuments') {
          // Aggregate count operation — returns total count without fetching raw records
          const { count, error } = await sb.from(collectionOrTable).select('*', { count: 'exact', head: true }).match(query);
          if (error) throw error;
          result = { total_count: count };
        } else if (operation === 'find' || operation === 'findOne') {
          // Use requested fields instead of select('*') to minimize payload size
          const selectFields = (args.fields && Array.isArray(args.fields) && args.fields.length > 0)
            ? args.fields.join(',')
            : '*';
          let sbQuery = sb.from(collectionOrTable).select(selectFields).match(query).limit(operation === 'findOne' ? 1 : (args.limit ? Math.min(args.limit, 500) : 500));
          const { data: sbData, error } = await sbQuery;
          if (error) throw error;
          result = operation === 'findOne' ? (sbData[0] || null) : sbData;
        } else if (operation === 'insert') {
          const { data: sbData, error } = await sb.from(collectionOrTable).insert(data).select();
          if (error) throw error;
          result = sbData;
        } else if (operation === 'update') {
          const { data: sbData, error } = await sb.from(collectionOrTable).update(data).match(query).select();
          if (error) throw error;
          result = sbData;
        } else if (operation === 'delete') {
          const { data: sbData, error } = await sb.from(collectionOrTable).delete().match(query).select();
          if (error) throw error;
          result = sbData;
        } else {
          throw new Error(`Unsupported Supabase operation: ${operation}`);
        }

        const aiSafetyReplacer = (key, value) => {
          const forbiddenKeys = ['password', 'profilePicture', 'profileBanner', 'logo', 'favicon', 'signature',
            'activationToken', 'resetPasswordToken', 'payroll_config', 'preferences', 'settings',
            'fee_structures', 'modules', 'theme', 'audit_logs', 'history', 'metadata', 'permissions',
            'hash', 'salt', 'biometric', 'token', 'secret'];
          if (forbiddenKeys.some(fk => key.toLowerCase().includes(fk))) return undefined;
          if (typeof value === 'string' && value.length > 500) return "[TRUNCATED HUGE STRING]";
          if (key !== "" && Array.isArray(value) && value.length > 3 && Array.isArray(result) && result.length > 2) {
            return `[Array of ${value.length} items TRUNCATED to save context]`;
          }
          return value;
        };

        let outputText = JSON.stringify(result, aiSafetyReplacer, 2);

        if (outputText === "[]" || outputText === "{}" || outputText === "null" || outputText === "undefined") {
          return {
            content: [{ type: 'text', text: `QUERY RESULT: []\n(Note to AI: The database returned no records matching your query. DO NOT loop or continuously retry the same query. Stop tool execution and tell the user directly that no data was found for their request.)` }]
          };
        }

        if (outputText.length > 10000) {
          return {
            content: [{ type: 'text', text: `ERROR: The result is too large (${outputText.length} bytes). The Supabase query returned too much data. Use 'count' operation for totals, request fewer fields, add filters, or reduce the limit.` }]
          };
        }

        return {
          content: [{ type: 'text', text: outputText }],
        };
      }
      else if (source === 'redis') {
        if (!redis || redis.status !== 'ready') {
          throw new Error("Redis connection not established");
        }
        let result;
        const key = collectionOrTable; // collectionOrTable is used as the Redis key or pattern

        if (operation === 'find') {
          // Return all keys matching pattern (e.g. "user:profile:*")
          result = await redis.keys(key);
        } else if (operation === 'findOne') {
          const type = await redis.type(key);
          if (type === 'hash') {
            result = await redis.hgetall(key);
          } else if (type === 'string') {
            result = await redis.get(key);
            try { result = JSON.parse(result); } catch (e) { /* ignore */ }
          } else if (type === 'list') {
            result = await redis.lrange(key, 0, -1);
          } else if (type === 'set') {
            result = await redis.smembers(key);
          } else {
            result = `Unsupported redis type: ${type} or key does not exist`;
          }
        } else if (operation === 'delete') {
          result = { deleted: await redis.del(key) };
        } else if (operation === 'insert' || operation === 'update') {
          if (typeof data === 'object' && data !== null) {
            result = await redis.hset(key, data);
          } else {
            result = await redis.set(key, String(data));
          }
        } else {
          throw new Error(`Unsupported Redis operation: ${operation}. Supported: find (keys), findOne (get), insert/update (set/hset), delete (del)`);
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } else {
        throw new Error(`Unsupported data source: ${source}`);
      }
    }

    if (name === 'internal_thought_process') {
      const { title, details } = args;
      console.log(`\nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  [THOUGHT] ${title}: ${details}`);
      return {
        content: [{ type: 'text', text: `Thought recorded successfully. Proceed with your next action.` }]
      };
    }

    if (name === 'deploy_to_classgrid_cloud') {
      // Reads the files from the chat's sandbox on the server and uploads them to R2 (no npm install in a fresh
      // sandbox box, which took minutes). Only file names pass through the model.
      const { userEmail = '', sessionId = 'default' } = context;
      // Classgrid Cloud is for simple HTML sites made in Agent mode, not for Project Mode projects
      if (await projectForChat(sessionId).catch(() => null)) {
        return { content: [{ type: 'text', text: 'Classgrid Cloud publishing is not available in Project Mode. Projects are published through GitHub and Vercel.' }], isError: true };
      }
      const site = String(args.site || '').trim().toLowerCase();
      if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(site)) {
        return { content: [{ type: 'text', text: 'Error: the site name must be 3-40 lowercase letters, numbers or dashes (not starting or ending with a dash).' }], isError: true };
      }
      const wanted = Array.isArray(args.paths) ? args.paths.map((p) => String(p).replace(/^\/?data\//, '').replace(/^\.?\//, '')).filter(Boolean) : [];
      if (!wanted.length) return { content: [{ type: 'text', text: 'Error: list the website files in paths, relative to /data/ (e.g. ["index.html", "style.css"]).' }], isError: true };
      if (!userEmail || userEmail.endsWith('.invalid')) return { content: [{ type: 'text', text: 'Error: sign in to publish a site.' }], isError: true };
      try {
        // A site name belongs to whoever published it first; nobody else can overwrite it
        const ownerKey = `classgrid-site:owner:${site}`;
        const claimed = await redis.set(ownerKey, userEmail.toLowerCase(), 'NX');
        const owner = claimed ? userEmail.toLowerCase() : await redis.get(ownerKey);
        if (owner && owner !== userEmail.toLowerCase()) {
          return { content: [{ type: 'text', text: `Error: the site name "${site}" is already used by someone else. Pick another name.` }], isError: true };
        }
        const files = await readSandboxFilesForPush(sessionId, wanted);
        const missing = wanted.filter((p) => !(p in files));
        if (missing.length) {
          return { content: [{ type: 'text', text: `Error: these files are not in the sandbox or can't be published (hidden files, keys and .env files never are): ${missing.join(', ')}` }], isError: true };
        }
        const TYPES = { html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'application/javascript; charset=utf-8', mjs: 'application/javascript; charset=utf-8', json: 'application/json; charset=utf-8', md: 'text/markdown; charset=utf-8', txt: 'text/plain; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', xml: 'application/xml', pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg' };
        const uploaded = [];
        await Promise.all(Object.entries(files).map(async ([path, b64]) => {
          const ext = (path.split('.').pop() || '').toLowerCase();
          await uploadBufferToR2(Buffer.from(b64, 'base64'), path, TYPES[ext] || 'application/octet-stream', `websites/${site}/${path}`);
          uploaded.push(path);
        }));
        const hasIndex = uploaded.includes('index.html');
        return { content: [{ type: 'text', text: `Published ${uploaded.length} file${uploaded.length === 1 ? '' : 's'} to Classgrid Cloud: ${uploaded.sort().join(', ')}.\nLive at: https://${site}.sites.classgrid.in${hasIndex ? '' : '\nNote: there is no index.html, so the site has no home page.'}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Publishing failed: ${e.message}` }], isError: true };
      }
    }

    if (name === 'execute_terminal_command') {
      let command = args?.command || '';
      const { sessionId = 'default', userEmail = 'unknown' } = context;

      console.log(`\n=================================================`);
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ [SANDBOX TERMINAL ACTION STARTED]`);
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ User: ${userEmail} | ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Session: ${sessionId}`);
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â» Command:\n${command}`);
      console.log(`=================================================\n`);
      fs.appendFileSync('ai_commands.log', `[${new Date().toISOString()}] COMMAND: ${command}\n`);

      accessLogger.info("Sandbox Terminal Action Started", {
        action: "sandbox_terminal_start",
        sessionId,
        userEmail,
        command
      });

      if (command.match(/python3?\s+-c/i)) {
        // Allow inline python for OCR scripts to be executed directly in the terminal
      }

      try {
        const ssh = new NodeSSH();
        const isProd = process.env.NODE_ENV === 'production';
        await ssh.connect({
          host: isProd ? '172.31.6.98' : '13.63.34.197', // Private IP for prod, Public IP for local testing
          username: 'ubuntu',
          ...(process.env.AGENT_SSH_KEY
            ? { privateKey: process.env.AGENT_SSH_KEY.replace(/\\n/g, '\n') }
            : { privateKeyPath: 'C:\\Users\\nikhi\\Downloads\\Nikhil.pem' })
        });

        console.log(`[Sandbox] Connected! Executing command safely...`);

        const { sessionId = 'default' } = context;

        // This is the Notion AI magic: 
        // 1. Spins up isolated container
        // 2. Runs the exact command inside
        // 3. Destroys the container instantly (--rm)
        // We use -v to mount a shared /data folder specific to this chat session!
        const scriptPath = `/home/ubuntu/sandbox_data/${sessionId}/${SANDBOX_RUNNER_PREFIX}_terminal.sh`;

        const writeCommand = `mkdir -p /home/ubuntu/sandbox_data/${sessionId}/scratch /home/ubuntu/sandbox_data/${sessionId}/project && cat << 'EOF_SCRIPT' > ${scriptPath}\n${command}\nEOF_SCRIPT`;
        await ssh.execCommand(writeCommand);

        // Only the allowlisted keys go into the sandbox (SANDBOX_ENV_ALLOWLIST), never the whole server env
        const envVars = sandboxEnvFlags(context.isStaff === true);

        console.log(`[Sandbox] Securely injecting credentials and running Docker container for terminal command...`);
        const projectMount = await projectMountFor(sessionId);
        // In a Project Mode chat, note which project files this run changes (shown under the step)
        const chatProject = projectMount.isProject ? await projectForChat(sessionId) : null;
        const snapBefore = chatProject ? await projectSnapshot(ssh, chatProject) : null;
        const dockerCommand = `${projectMount.prep}docker run --rm ${envVars} ${projectMount.mount} classgrid-ai-sandbox bash ${projectMount.runnerDir}/${SANDBOX_RUNNER_PREFIX}_terminal.sh`;
        const result = await ssh.execCommand(dockerCommand);
        const projectChanges = chatProject ? await projectChangesBetween(ssh, chatProject, snapBefore, await projectSnapshot(ssh, chatProject)) : [];

        console.log(`\n=================================================`);
        console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ [SANDBOX TERMINAL ACTION FINISHED]`);
        console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ STDOUT:\n${result.stdout}`);
        if (result.stderr) console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ STDERR:\n${result.stderr}`);
        console.log(`=================================================\n`);

        accessLogger.info("Sandbox Terminal Action Finished", {
          action: "sandbox_terminal_end",
          sessionId,
          userEmail,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.code
        });

        ssh.dispose();

        return {
          content: [{ type: 'text', text: `Command executed in isolated Sandbox.\nEXIT CODE: ${result.code}${!result.stdout && !result.stderr ? ' (no output)' : ''}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}${formatProjectChanges(projectChanges)}` }]
        };
      } catch (e) {
        return {
          content: [{ type: 'text', text: `Sandbox Error: ${e.message}` }]
        };
      }
    }

    if (name === 'run_code') {
      const { language, code } = args;
      const { sessionId = 'default', userEmail = 'unknown' } = context;

      console.log(`\n=================================================`);
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ [SANDBOX CODE EXECUTION STARTED]`);
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ User: ${userEmail} | ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Session: ${sessionId}`);
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â» Language: ${language}`);
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Code Payload:\n${code}`);
      console.log(`=================================================\n`);

      accessLogger.info("Sandbox Code Execution Started", {
        action: "sandbox_code_start",
        sessionId,
        userEmail,
        language,
        codeSnippetPreview: code.substring(0, 500)
      });

      try {
        // Native send_email reserves an idempotency key before SES. Generated SMTP
        // scripts would bypass that guard and can create duplicate messages.
        if (/\b(smtplib|nodemailer|sendMail|send_message|AWS_SES_SMTP_)\b/i.test(code)) {
          return { content: [{ type: 'text', text: 'EMAIL_ACTION_BLOCKED: Use send_email for external email delivery; it is the only idempotent email path.' }] };
        }
        const ssh = new NodeSSH();
        const isProd = process.env.NODE_ENV === 'production';
        await ssh.connect({
          host: isProd ? '172.31.6.98' : '13.63.34.197', // Private IP for prod, Public IP for local testing
          username: 'ubuntu',
          ...(process.env.AGENT_SSH_KEY
            ? { privateKey: process.env.AGENT_SSH_KEY.replace(/\\n/g, '\n') }
            : { privateKeyPath: 'C:\\Users\\nikhi\\Downloads\\Nikhil.pem' })
        });

        const { sessionId = 'default' } = context;

        // Instead of inline execution (which causes newline escape issues),
        // we will write the code to a file in the shared /data folder and execute it.
        let ext = '';
        let execCmd = '';
        let finalCode = code;

        if (language === 'python') {
          ext = 'py';
          execCmd = 'python3';
          // Auto-inject common standard libraries to prevent AI hallucination/forgetting errors
          finalCode = "import os, sys, json, base64, math, datetime, re\n" + finalCode;
        }
        else if (language === 'javascript' || language === 'js' || language === 'node') { ext = 'js'; execCmd = 'node'; }
        else if (language === 'bash' || language === 'sh' || language === 'shell') { ext = 'sh'; execCmd = 'bash'; }
        else throw new Error("Unsupported language. Use python, javascript, or bash.");

        // Create the directory on the host, write the file from the code string (using a heredoc to preserve exact contents),
        // and then run the docker container which maps that directory to /data and executes the file.
        const scriptPath = `/home/ubuntu/sandbox_data/${sessionId}/${SANDBOX_RUNNER_PREFIX}.${ext}`;

        // We use EOF heredoc to safely write the script without quote escaping issues
        const writeCommand = `mkdir -p /home/ubuntu/sandbox_data/${sessionId}/scratch /home/ubuntu/sandbox_data/${sessionId}/project && cat << 'EOF_SCRIPT' > ${scriptPath}\n${finalCode}\nEOF_SCRIPT`;
        await ssh.execCommand(writeCommand);

        // Only the allowlisted keys go into the sandbox (SANDBOX_ENV_ALLOWLIST), never the whole server env
        const envVars = sandboxEnvFlags(context.isStaff === true);

        console.log(`[Sandbox] Securely injecting credentials and running Docker container for ${language} script...`);
        const projectMount = await projectMountFor(sessionId);
        // In a Project Mode chat, note which project files this run changes (shown under the step)
        const chatProject = projectMount.isProject ? await projectForChat(sessionId) : null;
        const snapBefore = chatProject ? await projectSnapshot(ssh, chatProject) : null;
        const dockerCommand = `${projectMount.prep}docker run --rm ${envVars} ${projectMount.mount} classgrid-ai-sandbox ${execCmd} ${projectMount.runnerDir}/${SANDBOX_RUNNER_PREFIX}.${ext}`;
        const result = await ssh.execCommand(dockerCommand);
        const projectChanges = chatProject ? await projectChangesBetween(ssh, chatProject, snapBefore, await projectSnapshot(ssh, chatProject)) : [];

        console.log(`\n=================================================`);
        console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ [SANDBOX CODE EXECUTION FINISHED]`);
        console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ STDOUT:\n${result.stdout}`);
        if (result.stderr) console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´ STDERR:\n${result.stderr}`);
        console.log(`=================================================\n`);

        accessLogger.info("Sandbox Code Execution Finished", {
          action: "sandbox_code_end",
          sessionId,
          userEmail,
          language,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.code
        });

        ssh.dispose();

        return {
          content: [{ type: 'text', text: `[Sandbox Execution Results]\n\nEXIT CODE: ${result.code}${!result.stdout && !result.stderr ? ' (no output)' : ''}\n\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}${formatProjectChanges(projectChanges)}` }],
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to connect to Sandbox: ${e.message}` }] };
      }
    }

    if (name === 'read_sandbox_file') {
      const { filePath } = args;
      const { sessionId = 'default' } = context;

      console.log(`\n[SANDBOX] Reading file: /data/${filePath} for session: ${sessionId}`);

      try {
        const ssh = new NodeSSH();
        const isProd = process.env.NODE_ENV === 'production';
        await ssh.connect({
          host: isProd ? '172.31.6.98' : '13.63.34.197',
          username: 'ubuntu',
          ...(process.env.AGENT_SSH_KEY
            ? { privateKey: process.env.AGENT_SSH_KEY.replace(/\\n/g, '\n') }
            : { privateKeyPath: 'C:\\Users\\nikhi\\Downloads\\Nikhil.pem' })
        });

        const fullPath = `${await sandboxDataDir(sessionId)}/${String(filePath).replace(/^\/data\//, '')}`;
        const { stdout, stderr } = await ssh.execCommand(`cat ${fullPath}`);
        ssh.dispose();

        if (stderr && stderr.includes('No such file')) {
          return { content: [{ type: 'text', text: `File not found: /data/${filePath}. Available files can be listed with read_sandbox_file using filePath: "." to list directory.` }] };
        }

        console.log(`[SANDBOX] Successfully read file: ${filePath} (${stdout.length} bytes)`);
        return { content: [{ type: 'text', text: stdout }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to read sandbox file: ${e.message}` }] };
      }
    }


    if (name === 'generate_pdf') {
      let { content = '', title, rawData } = args;

      console.log(`\n📄 [AWS NATIVE] AI is generating a REAL PDF document securely using Puppeteer!`);

      try {
        if (rawData && Array.isArray(rawData) && rawData.length > 0) {
          const keys = Object.keys(rawData[0]).filter(k => typeof rawData[0][k] !== 'object' && k !== '_id' && k !== 'password');
          let tableHtml = `<table><tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr>`;
          for (const row of rawData) {
            tableHtml += `<tr>${keys.map(k => `<td>${row[k] || ''}</td>`).join('')}</tr>`;
          }
          tableHtml += `</table>`;
          content += tableHtml;
        }

        // Launch native headless browser to render true PDF
        const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Inject content. Wrap in basic HTML if it doesn't have it.
        const finalHtml = content.includes('<!DOCTYPE html>') ? content : `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${title || 'Document'}</title>
                    <style>
                        body { font-family: Arial, 'Noto Sans Devanagari', 'Noto Color Emoji', sans-serif; margin: 20px; color: #333; }
                        h1 { color: #3eaf28; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
                </html>
            `;

        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

        // Generate the PDF buffer
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
        await browser.close();

        const fileName = `${title ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'generated_' + Date.now()}.pdf`;

        // Upload directly to AWS S3 so the CDN link works
        const s3Key = `reports/${fileName}`;
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: pdfBuffer,
          ContentType: 'application/pdf'
        }));

        const cdnUrl = `${CDN_BASE_URL}/${s3Key}`;
        return {
          content: [{ type: 'text', text: `SUCCESS! PDF generated and uploaded to AWS CDN.\nCDN Download URL: ${cdnUrl}` }],
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to generate PDF via Puppeteer: ${e.message}` }] };
      }
    }

    if (name === 'generate_pdf_from_db') {
      const { source, collectionOrTable, query, title, htmlTemplate } = args;
      try {
        console.log(`\nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ [AWS NATIVE] AI is directly fetching data and using Handlebars to bypass token limits!`);
        let result;
        if (source === 'mongodb') {
          const collectionName = collectionOrTable.toLowerCase() === 'user' ? 'users' : collectionOrTable;
          const collection = mongoose.connection.collection(collectionName);
          if (collectionName === 'users') {
            result = await collection.aggregate([
              { $match: query },
              { $limit: 1000 },
              { $addFields: { orgObjId: { $convert: { input: "$organization_id", to: "objectId", onError: null, onNull: null } } } },
              { $lookup: { from: "organizations", localField: "orgObjId", foreignField: "_id", as: "organization_details" } },
              { $project: { orgObjId: 0 } }
            ]).toArray();
          } else {
            result = await collection.find(query).limit(1000).toArray();
          }
        } else {
          return { content: [{ type: 'text', text: 'generate_pdf_from_db only supports mongodb right now.' }] };
        }

        if (!result || result.length === 0) {
          return { content: [{ type: 'text', text: 'No data found for the given query.' }] };
        }

        let finalHtml;
        if (htmlTemplate) {
          const template = Handlebars.compile(htmlTemplate);
          finalHtml = template({ rows: result, title });
        } else {
          const keys = Object.keys(result[0]).filter(k => typeof result[0][k] !== 'object' && k !== '_id' && k !== 'password');
          let tableHtml = `<table><tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr>`;
          for (const row of result) {
            tableHtml += `<tr>${keys.map(k => `<td>${row[k] || ''}</td>`).join('')}</tr>`;
          }
          tableHtml += `</table>`;

          const defaultCss = `
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #1a1a1a; background-color: #f9fafb; }
                    h1 { color: #111827; text-align: center; font-size: 24px; margin-bottom: 20px; font-weight: 600; }
                    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 20px; font-size: 13px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                    th { background-color: #f3f4f6; color: #374151; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
                    tr:last-child td { border-bottom: none; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                `;

          finalHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${title || 'Report'}</title>
                        <style>${defaultCss}</style>
                    </head>
                    <body>
                        <h1>${title} (Total: ${result.length})</h1>
                        ${tableHtml}
                    </body>
                    </html>
                `;
        }

        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
        await browser.close();

        const fileName = `${title ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'db_report_' + Date.now()}.pdf`;
        const s3Key = `reports/${fileName}`;
        await s3Client.send(new PutObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key, Body: pdfBuffer, ContentType: 'application/pdf' }));

        const cdnUrl = `${CDN_BASE_URL}/${s3Key}`;
        return {
          content: [{ type: 'text', text: `SUCCESS! Fetched ${result.length} items directly from DB and generated PDF.\nCDN Download URL: ${cdnUrl}` }],
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed: ${e.message}` }] };
      }
    }


    if (name === 'search_syllabus_vectors') {
      try {
        const { query, org_id, match_threshold = 0.7, match_count = 5 } = args;

        if (!process.env.VOYAGE_API_KEY) {
          return { content: [{ type: 'text', text: 'Error: VOYAGE_API_KEY is not set in environment variables.' }] };
        }

        // Using MongoDB's unified Atlas AI API to bypass the legacy Voyage 3 RPM rate limit 
        // and utilize the Startup Credits directly!
        const voyageRes = await fetch("https://ai.mongodb.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.VOYAGE_API_KEY.trim()}`
          },
          body: JSON.stringify({
            input: query,
            model: "voyage-3-large"
          })
        });

        if (!voyageRes.ok) {
          const errText = await voyageRes.text();
          throw new Error(`Voyage AI (Atlas) error: ${errText}`);
        }

        const embeddingResponse = await voyageRes.json();
        const query_embedding = embeddingResponse.data[0].embedding;

        const sb = getChatSb();
        const { data, error } = await sb.rpc('match_syllabus_chunks', {
          query_embedding,
          match_threshold,
          match_count,
          p_org_id: org_id
        });

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          return { content: [{ type: 'text', text: 'No relevant syllabus matches found for this query.' }] };
        }

        const formattedResults = data.map((chunk, index) =>
          `[Match ${index + 1}] (Similarity: ${chunk.similarity.toFixed(2)})\n${chunk.content}`
        ).join('\n\n---\n\n');

        return {
          content: [{ type: 'text', text: `Found ${data.length} matches:\n\n${formattedResults}` }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to search syllabus vectors: ${e.message}` }] };
      }
    }

    if (name === 'search_knowledge_base') {
      try {
        const { query, limit = 5, collectionName = 'platform_rag_chunks' } = args;

        if (!process.env.VOYAGE_API_KEY) {
          return { content: [{ type: 'text', text: 'Error: VOYAGE_API_KEY is not set in environment variables.' }] };
        }

        const voyageRes = await fetch("https://ai.mongodb.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.VOYAGE_API_KEY.trim()}`
          },
          body: JSON.stringify({
            input: query,
            model: "voyage-3-large"
          })
        });

        if (!voyageRes.ok) {
          const errText = await voyageRes.text();
          throw new Error(`Voyage AI (Atlas) error: ${errText}`);
        }

        const embeddingResponse = await voyageRes.json();
        const query_embedding = embeddingResponse.data[0].embedding;

        if (!mongoose.connection.db) {
          throw new Error("MongoDB connection not established");
        }
        const coll = mongoose.connection.db.collection(collectionName);

        const docs = await coll.aggregate([
          {
            $vectorSearch: {
              index: 'vector_index',
              path: 'embedding',
              queryVector: query_embedding,
              numCandidates: limit * 10,
              limit: limit
            }
          },
          {
            $project: {
              _id: 1,
              chunkText: 1,
              text: 1,
              documentType: 1,
              sourceUrl: 1,
              metadata: 1,
              score: { $meta: 'vectorSearchScore' }
            }
          }
        ]).toArray();

        if (!docs || docs.length === 0) {
          return { content: [{ type: 'text', text: 'No relevant internal documents found in the Knowledge Base.' }] };
        }

        const formatted = docs.map((doc, idx) => {
          const content = doc.chunkText || doc.text || 'No content';
          const docType = doc.documentType || (doc.metadata && doc.metadata.type) || 'unknown';
          const source = doc.sourceUrl || (doc.metadata && doc.metadata.source) || 'unknown';
          return `[Match ${idx + 1}] (Score: ${doc.score.toFixed(3)})\nSource: ${source}\nType: ${docType}\nContent:\n${content}`;
        }).join('\n\n---\n\n');

        return { content: [{ type: 'text', text: `Found ${docs.length} matches:\n\n${formatted}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to search knowledge base: ${e.message}` }] };
      }
    }

    if (name === 'manage_rag_document') {
      const { action, id, documentType, chunkText, sourceUrl = 'ai-generated', collectionName = 'platform_rag_chunks' } = args;

      try {
        if (!mongoose.connection.db) {
          throw new Error("MongoDB connection not established");
        }
        const coll = mongoose.connection.db.collection(collectionName);
        const { ObjectId } = mongoose.Types;

        if (action === 'list') {
          const docs = await coll.find({}, { projection: { chunkText: 1, documentType: 1, sourceUrl: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(50).toArray();
          return { content: [{ type: 'text', text: `Found ${docs.length} RAG documents:\n` + JSON.stringify(docs, null, 2) }] };
        }

        if (action === 'read') {
          if (!id) throw new Error("ID required for read action");
          const doc = await coll.findOne({ _id: new ObjectId(id) }, { projection: { embedding: 0 } }); // Hide giant embedding vector
          if (!doc) return { content: [{ type: 'text', text: `Document ${id} not found.` }] };
          return { content: [{ type: 'text', text: JSON.stringify(doc, null, 2) }] };
        }

        if (action === 'delete') {
          if (!id) throw new Error("ID required for delete action");
          const result = await coll.deleteOne({ _id: new ObjectId(id) });
          return { content: [{ type: 'text', text: result.deletedCount > 0 ? `Successfully deleted document ${id}` : `Document ${id} not found.` }] };
        }

        if (action === 'create' || action === 'update') {
          if (!documentType || !chunkText) throw new Error("documentType and chunkText are required for create/update");
          if (action === 'update' && !id) throw new Error("ID required for update action");

          console.log(`[RAG] Generating embedding for documentType: ${documentType}`);
          const voyageRes = await fetch("https://ai.mongodb.com/v1/embeddings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.VOYAGE_API_KEY.trim()}`
            },
            body: JSON.stringify({
              input: chunkText,
              model: "voyage-3-large"
            })
          });

          if (!voyageRes.ok) {
            const errText = await voyageRes.text();
            throw new Error(`Voyage AI (Atlas) error: ${errText}`);
          }

          const embeddingResponse = await voyageRes.json();
          const embedding = embeddingResponse.data[0].embedding;

          if (action === 'create') {
            const result = await coll.insertOne({
              chunkText,
              embedding,
              documentType,
              sourceUrl,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            return { content: [{ type: 'text', text: `Successfully created RAG Document! ID: ${result.insertedId}` }] };
          } else {
            const result = await coll.updateOne(
              { _id: new ObjectId(id) },
              { $set: { chunkText, embedding, documentType, sourceUrl, updatedAt: new Date() } }
            );
            return { content: [{ type: 'text', text: result.matchedCount > 0 ? `Successfully updated RAG Document ${id}` : `Document ${id} not found.` }] };
          }
        }

        throw new Error("Invalid action. Must be create, read, update, delete, or list.");
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to manage RAG document: ${e.message}` }] };
      }
    }

    if (name === 'get_server_status') {
      const check = async (url) => {
        const started = Date.now();
        try {
          const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
          return { ok: r.ok, text: `HTTP ${r.status} in ${Date.now() - started} ms` };
        } catch (e) {
          return { ok: false, text: `NOT REACHABLE (${e.message})` };
        }
      };
      const [main, rescue] = await Promise.all([check('http://localhost:3000/'), check('http://localhost:4000/api/rescue/status')]);
      let procs = [];
      try {
        const { stdout } = await execPromise('pm2 jlist', { maxBuffer: 1024 * 1024 * 10 });
        procs = JSON.parse(stdout || '[]');
      } catch (e) { }
      const os = await import('os');
      const gb = (b) => (b / 1024 / 1024 / 1024).toFixed(2);
      const out = [
        `Main server (port 3000): ${main.ok ? 'UP' : 'DOWN'} - ${main.text}`,
        `Rescue server (port 4000): ${rescue.ok ? 'UP' : 'DOWN'} - ${rescue.text}`,
        `Serving users right now: ${main.ok ? 'main server' : rescue.ok ? 'RESCUE server (main is down)' : 'NOTHING - both are down'}`,
        '',
        'PM2 processes:',
        ...(procs.length ? procs.map((p) => {
          const env = p.pm2_env || {};
          const upMin = env.status === 'online' && env.pm_uptime ? Math.round((Date.now() - env.pm_uptime) / 60000) : 0;
          return `- ${p.name}: ${env.status || 'unknown'}, restarts=${env.restart_time ?? 0}${env.status === 'online' ? `, up ${upMin} min` : ''}, memory=${Math.round((p.monit?.memory || 0) / 1024 / 1024)} MB, cpu=${p.monit?.cpu ?? 0}%`;
        }) : ['- could not read PM2 process list']),
        '',
        `Machine: memory free ${gb(os.freemem())} GB of ${gb(os.totalmem())} GB, load ${os.loadavg().map((n) => n.toFixed(2)).join(' / ')}, up ${Math.round(os.uptime() / 3600)} h`,
      ];
      return { content: [{ type: 'text', text: out.join('\n') }] };
    }

    if (name === 'read_server_logs') {
      const { log_type, lines } = args;
      // With a search word the server scans far more lines (only matching lines come back, so the 8000-char
      // cap below holds useful lines instead of whatever background noise was logged last).
      const search = typeof args.search === 'string' ? args.search.trim().toLowerCase() : '';
      const statusFilter = typeof args.status_code === 'string' || typeof args.status_code === 'number'
        ? String(args.status_code).split(',').map((c) => c.trim().toLowerCase()).filter((c) => /^[1-5](\d\d|xx)$/.test(c))
        : [];
      const sinceMinutes = Number(args.since_minutes) > 0 ? Number(args.since_minutes) : 0;
      // grep -B / -A style context around each search match
      const ctxBefore = Math.max(0, Math.min(Math.floor(Number(args.context_before) || 0), 100));
      const ctxAfter = Math.max(0, Math.min(Math.floor(Number(args.context_after) || 0), 100));
      const withContext = !!search && (ctxBefore > 0 || ctxAfter > 0);
      let hitCount = 0;
      const numLines = (search || statusFilter.length || sinceMinutes)
        ? Math.max(1, Math.min(Math.floor(Number(lines) || 10000), 10000))
        : Math.max(1, Math.min(Math.floor(Number(lines) || 5000), 10000));
      const pm2Process = typeof args.process === 'string' && /^[\w.-]+$/.test(args.process.trim()) ? ` ${args.process.trim()}` : '';
      try {
        let command = '';
        if (log_type === 'pm2_error') {
          command = `pm2 logs${pm2Process} --err --nostream --lines ${numLines}`;
        } else if (log_type === 'pm2_out') {
          command = `pm2 logs${pm2Process} --out --nostream --lines ${numLines}`;
        } else if (log_type === 'pm2_all') {
          command = `pm2 logs${pm2Process} --nostream --lines ${numLines}`;
        } else if (log_type === 'winston_error') {
          command = `tail -n ${numLines} logs/error.log || echo 'File not found'`;
        } else if (log_type === 'winston_combined') {
          command = `tail -n ${numLines} logs/combined.log || echo 'File not found'`;
        }

        if (!command) throw new Error(`unknown log_type: ${log_type}`);
        let resultText = '';
        let searchedWhere = `the last ${numLines} lines`;
        if (search) {
          const files = new Set();
          if (log_type.startsWith('pm2')) {
            try {
              const { stdout: jlist } = await execPromise('pm2 jlist', { maxBuffer: 1024 * 1024 * 10 });
              for (const p of JSON.parse(jlist || '[]')) {
                if (pm2Process && p.name !== pm2Process.trim()) continue;
                const env = p.pm2_env || {};
                if (log_type !== 'pm2_error' && env.pm_out_log_path) files.add(env.pm_out_log_path);
                if (log_type !== 'pm2_out' && env.pm_err_log_path) files.add(env.pm_err_log_path);
              }
            } catch (e) { }
          } else {
            files.add(path.join(process.cwd(), 'logs', log_type === 'winston_error' ? 'error.log' : 'combined.log'));
          }
          for (const file of [...files]) {
            try {
              const dir = path.dirname(file);
              const base = path.basename(file).replace(/\.log$/, '');
              for (const name of fs.readdirSync(dir)) {
                if (name.startsWith(base) && name !== path.basename(file) && !name.endsWith('.gz')) files.add(path.join(dir, name));
              }
            } catch (e) { }
          }
          const readline = await import('readline');
          const matches = [];
          let scanned = 0;
          for (const file of files) {
            if (!fs.existsSync(file)) continue;
            const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
            const label = path.basename(file);
            const prev = [];
            let afterLeft = 0;
            let lineNo = 0;
            let lastEmitted = -1;
            for await (const line of rl) {
              scanned++;
              lineNo++;
              if (line.toLowerCase().includes(search)) {
                hitCount++;
                if (withContext && matches.length && lineNo - prev.length > lastEmitted + 1) matches.push('--');
                for (const p of prev) matches.push(`[${label}] ${p}`);
                prev.length = 0;
                matches.push(`[${label}] ${line}`);
                lastEmitted = lineNo;
                afterLeft = ctxAfter;
              } else if (afterLeft > 0) {
                matches.push(`[${label}] ${line}`);
                lastEmitted = lineNo;
                afterLeft--;
              } else if (ctxBefore > 0) {
                prev.push(line);
                if (prev.length > ctxBefore) prev.shift();
              }
              if (matches.length > 20000) matches.shift();
            }
          }
          resultText = matches.join('\n');
          searchedWhere = `all ${files.size} log file(s) (${scanned} lines scanned)`;
        } else {
          const { stdout, stderr } = await execPromise(command, { maxBuffer: 1024 * 1024 * 50 });
          resultText = stdout || stderr;
        }
        const filtersUsed = [];
        if (sinceMinutes && resultText) {
          const cutoff = Date.now() - sinceMinutes * 60000;
          let keep = false;
          resultText = resultText.split('\n').filter((l) => {
            const m = l.match(/(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/);
            if (m) keep = new Date(m[1].replace(' ', 'T')).getTime() >= cutoff;
            return keep;
          }).join('\n');
          filtersUsed.push(`last ${sinceMinutes} min`);
        }
        if (statusFilter.length && resultText) {
          const patterns = statusFilter.map((c) => c.replace(/x/g, '\\d'));
          const statusRe = new RegExp(`("status"\\s*:\\s*|status[=: ]\\s*|\\s)(${patterns.join('|')})\\b`, 'i');
          resultText = resultText.split('\n').filter((l) => statusRe.test(l)).join('\n');
          filtersUsed.push(`status ${statusFilter.join(',')}`);
        }
        if (filtersUsed.length && !search) {
          const count = resultText ? resultText.split('\n').filter(Boolean).length : 0;
          resultText = count
            ? `${count} line(s) matching ${filtersUsed.join(' + ')} in ${searchedWhere}:\n${resultText}`
            : `No lines matching ${filtersUsed.join(' + ')} in ${searchedWhere}.`;
        }
        if (withContext) {
          resultText = hitCount > 0 && resultText
            ? `${hitCount} match(es) for "${args.search.trim()}" with ${ctxBefore} line(s) before and ${ctxAfter} after${filtersUsed.length ? ` (${filtersUsed.join(' + ')})` : ''} in ${searchedWhere}:\n${resultText}`
            : `No lines containing "${args.search.trim()}"${filtersUsed.length ? ` (${filtersUsed.join(' + ')})` : ''} in ${searchedWhere}.`;
        } else if (search) {
          const matches = resultText ? resultText.split('\n').filter((l) => l.toLowerCase().includes(search)) : [];
          resultText = matches.length > 0
            ? `${matches.length} line(s) containing "${args.search.trim()}"${filtersUsed.length ? ` (${filtersUsed.join(' + ')})` : ''} in ${searchedWhere}:\n${matches.join('\n')}`
            : `No lines containing "${args.search.trim()}"${filtersUsed.length ? ` (${filtersUsed.join(' + ')})` : ''} in ${searchedWhere}.`;
        }
        if (!resultText) resultText = "No logs found or empty output.";
        let processStatus = '';
        try {
          const { stdout: jlist } = await execPromise('pm2 jlist', { maxBuffer: 1024 * 1024 * 10 });
          const procs = JSON.parse(jlist || '[]');
          processStatus = 'PM2 PROCESS STATUS (check this first: anything not "online" is down or crashing):\n' + procs.map((p) => {
            const env = p.pm2_env || {};
            const upMin = env.status === 'online' && env.pm_uptime ? Math.round((Date.now() - env.pm_uptime) / 60000) : 0;
            return `- ${p.name}: ${env.status || 'unknown'}, restarts=${env.restart_time ?? 0}${env.status === 'online' ? `, up ${upMin} min` : ''}`;
          }).join('\n') + '\n\n';
        } catch (statusErr) {
          processStatus = `PM2 PROCESS STATUS: could not read (${statusErr.message})\n\n`;
        }
        // TRUNCATE TO LAST 8000 CHARS TO PREVENT CONTEXT WINDOW OVERFLOW CRASHES
        return { content: [{ type: 'text', text: processStatus + resultText.substring(resultText.length - 60000) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to read server logs: ${err.message}\nStderr: ${err.stderr || ''}` }] };
      }
    }

    if (name === 'aws_ses_connector') {
      const { operation } = args;
      try {
        // Classgrid uses EU-NORTH-1 for SES based on .env
        const sesClient = new SESClient({
          region: 'eu-north-1',
          credentials: {
            accessKeyId: process.env.AWS_S3_ERP_ACCESS_KEY,
            secretAccessKey: process.env.AWS_S3_ERP_SECRET_KEY
          }
        });

        if (operation === 'get_statistics') {
          const command = new GetSendStatisticsCommand({});
          const response = await sesClient.send(command);
          return { content: [{ type: 'text', text: `AWS SES Statistics:\n` + JSON.stringify(response.SendDataPoints, null, 2) }] };
        }

        if (operation === 'list_identities') {
          const command = new ListIdentitiesCommand({ IdentityType: "EmailAddress" });
          const response = await sesClient.send(command);
          return { content: [{ type: 'text', text: `Verified AWS SES Identities:\n` + JSON.stringify(response.Identities, null, 2) }] };
        }

        throw new Error("Invalid operation for aws_ses_connector");
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed AWS SES operation: ${e.message}\nNote: Make sure the IAM keys (AWS_S3_ERP_ACCESS_KEY) have SES permissions.` }] };
      }
    }
    // DISABLED: cloudflare_r2_connector handler — causes AI to hang with massive JSON payloads.
    // Website deployment now uses Node.js scripts in the sandbox instead.
    // if (name === 'cloudflare_r2_connector') {
    //   const { operation, siteId, files, fileKey, fileContent, contentType } = args;
    //   try {
    //     if (operation === 'upload_website') {
    //        if (!siteId || !files || !Array.isArray(files)) throw new Error("siteId and files array are required");
    //        const uploadedUrls = [];
    //        for (const file of files) {
    //           const buffer = Buffer.from(file.content, 'utf-8');
    //           const s3Key = `websites/${siteId}/${file.path.replace(/^\/+/, '')}`;
    //           const url = await uploadBufferToR2(buffer, file.path, file.contentType, s3Key);
    //           uploadedUrls.push({ path: file.path, url });
    //        }
    //        return {
    //          content: [{ type: 'text', text: `Successfully uploaded ${files.length} files to Classgrid Cloud R2 under websites/${siteId}/.\nThe website is now instantly live at: https://${siteId}.sites.classgrid.in` }]
    //        };
    //     } else if (operation === 'upload_file') {
    //        if (!fileKey || !fileContent || !contentType) throw new Error("fileKey, fileContent, and contentType are required");
    //        const buffer = Buffer.from(fileContent, 'utf-8');
    //        const url = await uploadBufferToR2(buffer, fileKey, contentType, fileKey);
    //        return {
    //          content: [{ type: 'text', text: `Successfully uploaded file to ${url}` }]
    //        };
    //     } else {
    //        throw new Error(`Unsupported R2 operation: ${operation}`);
    //     }
    //   } catch (e) {
    //     return { content: [{ type: 'text', text: `Failed to upload to Classgrid Cloud R2: ${e.message}` }] };
    //   }
    // }

    if (name === 'vercel_connector') {
      const { operation, projectId, limit = 10, deploymentId, projectName, githubRepo, envKey, envValue, envTarget, isClassgridManaged } = args;
      const { userEmail = '', userRole = '' } = context;

      let vercelToken = '';
      if (isClassgridManaged) {
        vercelToken = process.env.VERCEL_API_TOKEN;
        if (!vercelToken) throw new Error("VERCEL_API_TOKEN environment variable is not configured on the server.");
      } else {
        const user = await mongoose.models.User.findOne({ email: userEmail });
        if (!user || !user.vercel_access_token) {
          return {
            content: [{ type: 'text', text: `Error: No Vercel OAuth token found. Please ask the user to connect their Vercel account from the settings page first.` }]
          };
        }
        vercelToken = user.vercel_access_token;
      }

      try {
        let endpoint = '';
        let method = 'GET';
        let body = null;

        if (operation === 'list_projects') {
          endpoint = `/v9/projects?limit=${limit}`;
        } else if (operation === 'list_deployments') {
          if (!projectId) throw new Error("projectId is required for list_deployments");
          endpoint = `/v6/deployments?projectId=${projectId}&limit=${limit}`;
        } else if (operation === 'get_deployment') {
          if (!deploymentId) throw new Error("deploymentId is required for get_deployment");
          endpoint = `/v13/deployments/${deploymentId}`;
        } else if (operation === 'create_project') {
          if (!projectName || !githubRepo) throw new Error("projectName and githubRepo are required to create a project");
          endpoint = `/v9/projects`;
          method = 'POST';
          body = JSON.stringify({
            name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'), // Sanitize name
            framework: null, // null is for vanilla HTML/JS
            gitRepository: {
              type: 'github',
              repo: githubRepo
            }
          });
        } else if (operation === 'add_env_variable') {
          if (!projectId || !envKey || !envValue || !envTarget) throw new Error("projectId, envKey, envValue, and envTarget are required to add an env variable");
          endpoint = `/v10/projects/${projectId}/env`;
          method = 'POST';
          body = JSON.stringify({
            key: envKey,
            value: envValue,
            target: envTarget,
            type: 'encrypted'
          });
        } else {
          throw new Error(`Unsupported Vercel operation: ${operation}`);
        }

        const fetchOptions = {
          method,
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json'
          }
        };
        if (body) fetchOptions.body = body;

        const response = await fetch(`https://api.vercel.com${endpoint}`, fetchOptions);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Vercel API error (${response.status}): ${errText}`);
        }

        const data = await response.json();

        // A new project linked to GitHub is not built until the next push, and its web address is only known from
        // Vercel (<name>.vercel.app is already taken for many names). So start the first production build from the
        // repo now and return the real address, so no link has to be guessed.
        if (operation === 'create_project' && data?.id) {
          const vercelApi = (path, opts = {}) => fetch(`https://api.vercel.com${path}`, { ...opts, headers: fetchOptions.headers });
          let deployNote = '';
          try {
            const branch = data.link?.productionBranch || 'main';
            const dep = await vercelApi(`/v13/deployments`, {
              method: 'POST',
              body: JSON.stringify({ name: data.name, project: data.id, target: 'production', gitSource: { type: 'github', repoId: data.link?.repoId, ref: branch } }),
            });
            const depData = await dep.json().catch(() => ({}));
            deployNote = dep.ok
              ? `First production build started (deployment ${depData.id}, status ${depData.readyState || depData.status || 'QUEUED'}). It is usually live in about a minute.`
              : `Could not start the first build: ${depData.error?.message || dep.status}. It starts on the next push to the repo.`;
          } catch (e) {
            deployNote = `Could not start the first build: ${e.message}. It starts on the next push to the repo.`;
          }
          let domains = [];
          try {
            const d = await (await vercelApi(`/v9/projects/${data.id}/domains`)).json();
            domains = (d.domains || []).map((x) => x.name);
          } catch {}
          const live = domains.find((n) => n.endsWith('.vercel.app')) || domains[0];
          const others = domains.filter((n) => n !== live).map((n) => `https://${n}`);
          return {
            content: [{ type: 'text', text: `Created Vercel project ${data.name} (id ${data.id}) linked to ${githubRepo}.\n${deployNote}\nLive URL (the project's real address): ${live ? `https://${live}` : 'not assigned yet'}${others.length ? `\nOther domains: ${others.join(', ')}` : ''}` }]
          };
        }

        // ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ AI TOKEN OVERFLOW PROTECTION ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨
        const aiSafetyReplacer = (key, value) => {
          const forbiddenKeys = ['source', 'env', 'builds', 'routes', 'meta'];
          if (forbiddenKeys.includes(key)) return undefined;
          if (typeof value === 'string' && value.length > 500) return "[TRUNCATED HUGE STRING]";
          return value;
        };

        const outputText = JSON.stringify(data, aiSafetyReplacer, 2);

        return {
          content: [{ type: 'text', text: outputText }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to execute Vercel API call: ${e.message}` }] };
      }
    }

    if (name === 'google_workspace_connector') {
      const { operation, limit = 10, query = '', formId, formTitle, folderName, eventTitle, eventStartTime, eventEndTime, questions } = args;
      const { userEmail = '' } = context;

      const user = await mongoose.models.User.findOne({ email: userEmail });
      if (!user || (!user.google_access_token && !user.google_refresh_token)) {
        return { content: [{ type: 'text', text: `Error: No Google Workspace connection found. Please connect your Google account first.` }] };
      }

      try {
        const decodeGoogleId = (id) => {
          if (!id) return id;
          if (/^\d+$/.test(id)) return id;
          try { const dec = Buffer.from(id, 'base64').toString('utf-8'); return /^\d+$/.test(dec) ? dec : id; } catch (e) { return id; }
        };
        args.courseId = decodeGoogleId(args.courseId);
        args.courseworkId = decodeGoogleId(args.courseworkId);
        args.announcementId = decodeGoogleId(args.announcementId);
        args.submissionId = decodeGoogleId(args.submissionId);

        const { google } = await import('googleapis');
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          `${process.env.BACKEND_URL}/api/google-workspace/callback`
        );
        oauth2Client.setCredentials({
          access_token: user.google_access_token,
          refresh_token: user.google_refresh_token,
          expiry_date: user.google_token_expiry ? user.google_token_expiry.getTime() : null
        });

        let data = {};
        if (operation === 'list_events') {
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
          const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: limit,
            singleEvents: true,
            orderBy: 'startTime',
          });
          data = res.data.items;
        } else if (operation === 'list_drive_files') {
          const drive = google.drive({ version: 'v3', auth: oauth2Client });
          const listParams = {
            pageSize: limit,
            orderBy: 'modifiedTime desc',
            fields: 'nextPageToken, files(id, name, mimeType, webViewLink)',
          };
          if (query) listParams.q = query;
          const res = await drive.files.list(listParams);
          data = res.data.files;
        } else if (operation === 'create_folder') {
          const drive = google.drive({ version: 'v3', auth: oauth2Client });
          const fileMetadata = {
            name: folderName || 'New Folder',
            mimeType: 'application/vnd.google-apps.folder',
          };
          const res = await drive.files.create({
            resource: fileMetadata,
            fields: 'id, name, webViewLink',
          });
          data = res.data;
        } else if (operation === 'read_drive_file') {
          if (!args.fileId) throw new Error("fileId is required for read_drive_file");
          const drive = google.drive({ version: 'v3', auth: oauth2Client });
          const fileMeta = await drive.files.get({ fileId: args.fileId, fields: 'name, mimeType' });
          const isGoogleWorkspaceType = fileMeta.data.mimeType.startsWith('application/vnd.google-apps.');

          let buffer;
          let mime = fileMeta.data.mimeType;
          if (isGoogleWorkspaceType) {
            const exportMime = args.mimeType || 'application/pdf';
            if (fileMeta.data.mimeType === 'application/vnd.google-apps.folder') throw new Error("Cannot read a folder as a file.");
            const file = await drive.files.export({ fileId: args.fileId, mimeType: exportMime }, { responseType: 'arraybuffer' });
            buffer = Buffer.from(file.data);
            mime = exportMime;
            if (exportMime === 'application/pdf' && !fileMeta.data.name.endsWith('.pdf')) fileMeta.data.name += '.pdf';
          } else {
            const file = await drive.files.get({ fileId: args.fileId, alt: 'media' }, { responseType: 'arraybuffer' });
            buffer = Buffer.from(file.data);
          }

          if (buffer.length > 10 * 1024 * 1024) throw new Error("File exceeds 10MB limit. OCR/Parsing rejected.");
          const objectKey = await uploadPrivateBufferToR2(buffer, `ai-temp-cache/${Date.now()}-${fileMeta.data.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`, mime);
          const url = await getPrivateDownloadUrl(objectKey);
          data = { message: "File downloaded and securely staged in R2 temp cache.", url, name: fileMeta.data.name, mimeType: mime, sizeBytes: buffer.length };
        } else if (operation === 'upload_drive_file') {
          if (!args.fileUrl) throw new Error("fileUrl is required for upload_drive_file");

          // Download file from URL
          const fetchRes = await fetch(args.fileUrl);
          if (!fetchRes.ok) throw new Error(`Failed to download file from URL: ${fetchRes.statusText}`);
          const arrBuffer = await fetchRes.arrayBuffer();
          const buffer = Buffer.from(arrBuffer);
          const mime = fetchRes.headers.get('content-type') || 'application/octet-stream';
          const fileName = args.fileUrl.split('/').pop()?.split('?')[0] || `uploaded_${Date.now()}`;

          // Upload to Drive
          const drive = google.drive({ version: 'v3', auth: oauth2Client });
          const resource = { name: fileName };
          if (args.folderId) {
            resource.parents = [args.folderId];
          }
          const res = await drive.files.create({
            resource: resource,
            media: { mimeType: mime, body: Readable.from(buffer) },
            fields: 'id, name, webViewLink'
          });
          data = { message: "File successfully uploaded to Google Drive.", ...res.data };
        } else if (operation === 'list_emails') {
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

          const listParams = {
            userId: 'me',
            maxResults: 50 // Changed to 50 to prevent the server from crashing or taking too long
          };
          if (query) {
            listParams.q = query;
          } else {
            listParams.q = 'newer_than:3d';
          }

          const res = await gmail.users.messages.list(listParams);
          const messages = res.data.messages || [];
          data = [];
          for (let m of messages) {
            const msg = await gmail.users.messages.get({ userId: 'me', id: m.id });
            const headers = msg.data.payload.headers;
            const subject = headers.find(h => h.name === 'Subject')?.value;
            const from = headers.find(h => h.name === 'From')?.value;
            let rawDateStr = headers.find(h => h.name === 'Date')?.value;
            let dateObj = new Date(parseInt(msg.data.internalDate));
            const date = dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', timeZoneName: 'short' });

            let attachments = [];
            if (msg.data.payload.parts) {
              for (let part of msg.data.payload.parts) {
                if (part.filename && part.filename.length > 0 && part.body && part.body.attachmentId) {
                  attachments.push({ filename: part.filename, attachmentId: part.body.attachmentId });
                }
              }
            }

            data.push({ id: msg.data.id, snippet: msg.data.snippet, subject, from, date, rawInternalDate: msg.data.internalDate, attachments });
          }
        } else if (operation === 'read_email') {
          if (!args.messageId) throw new Error("messageId is required for read_email");
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          const msg = await gmail.users.messages.get({ userId: 'me', id: args.messageId, format: 'full' });
          const headers = msg.data.payload.headers;
          const subject = headers.find(h => h.name === 'Subject')?.value;
          const from = headers.find(h => h.name === 'From')?.value;
          let rawDateStr = headers.find(h => h.name === 'Date')?.value;
          let dateObj = new Date(parseInt(msg.data.internalDate));
          const date = dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', timeZoneName: 'short' });

          let body = '';
          let attachments = [];

          const decodePart = (part) => {
            if (part.body && part.body.data) {
              let base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
              return Buffer.from(base64, 'base64').toString('utf-8');
            }
            return '';
          };

          if (msg.data.payload.parts) {
            let plainTextPart = msg.data.payload.parts.find(p => p.mimeType === 'text/plain');
            let htmlPart = msg.data.payload.parts.find(p => p.mimeType === 'text/html');

            for (let part of msg.data.payload.parts) {
              if (part.filename && part.filename.length > 0 && part.body && part.body.attachmentId) {
                attachments.push({ filename: part.filename, attachmentId: part.body.attachmentId, mimeType: part.mimeType });
              }
              if (part.parts) {
                for (let subpart of part.parts) {
                  if (subpart.filename && subpart.filename.length > 0 && subpart.body && subpart.body.attachmentId) {
                    attachments.push({ filename: subpart.filename, attachmentId: subpart.body.attachmentId, mimeType: subpart.mimeType });
                  }
                  if (subpart.mimeType === 'text/plain') plainTextPart = subpart;
                  if (subpart.mimeType === 'text/html') htmlPart = subpart;
                }
              }
            }

            if (plainTextPart) {
              body = decodePart(plainTextPart);
            } else if (htmlPart) {
              body = decodePart(htmlPart).replace(/<style[^>]*>.*<\/style>/gms, '').replace(/<script[^>]*>.*<\/script>/gms, '').replace(/<[^>]*>?/gm, '\n').replace(/\n\s*\n/g, '\n');
            }
          } else {
            body = decodePart(msg.data.payload);
            if (msg.data.payload.mimeType === 'text/html') {
              body = body.replace(/<style[^>]*>.*<\/style>/gms, '').replace(/<script[^>]*>.*<\/script>/gms, '').replace(/<[^>]*>?/gm, '\n').replace(/\n\s*\n/g, '\n');
            }
          }

          if (body.length > 10000) body = body.substring(0, 10000) + '... [TRUNCATED]';

          data = { id: msg.data.id, subject, from, date, snippet: msg.data.snippet, attachments, body };
        } else if (operation === 'read_email_attachment') {
          if (!args.messageId || !args.attachmentId) throw new Error("messageId and attachmentId are required for read_email_attachment");
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          const attachment = await gmail.users.messages.attachments.get({ userId: 'me', messageId: args.messageId, id: args.attachmentId });

          let base64 = attachment.data.data.replace(/-/g, '+').replace(/_/g, '/');
          let buffer = Buffer.from(base64, 'base64');
          if (buffer.length > 10 * 1024 * 1024) throw new Error("Attachment exceeds 10MB limit.");

          const objectKey = await uploadPrivateBufferToR2(buffer, `ai-temp-cache/attachment-${Date.now()}-${args.attachmentId}`, 'application/octet-stream');
          const url = await getPrivateDownloadUrl(objectKey);
          data = { message: "Attachment downloaded and staged in R2 temp cache.", url, sizeBytes: buffer.length };
        } else if (operation === 'mark_email_read') {
          if (!args.messageId) throw new Error("messageId is required for mark_email_read");
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          await gmail.users.messages.modify({
            userId: 'me',
            id: args.messageId,
            requestBody: { removeLabelIds: ['UNREAD'] }
          });
          data = { message: "Email marked as read successfully." };
        } else if (operation === 'send_email') {
          if (!args.to || !args.subject || !args.body) throw new Error("to, subject, and body are required for send_email");
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          const utf8Subject = `=?utf-8?B?${Buffer.from(args.subject).toString('base64')}?=`;
          const messageParts = [
            `To: ${args.to}`,
            `Subject: ${utf8Subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=utf-8`,
            '',
            args.body,
          ];
          const message = messageParts.join('\n');
          const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMessage }
          });
          data = { message: "Email sent successfully!" };
        } else if (operation === 'get_form') {
          if (!args.formId) throw new Error("formId is required for get_form");
          const forms = google.forms({ version: 'v1', auth: oauth2Client });
          const res = await forms.forms.get({ formId: args.formId });
          data = res.data;
        } else if (operation === 'list_form_responses') {
          if (!args.formId) throw new Error("formId is required for list_form_responses");
          const forms = google.forms({ version: 'v1', auth: oauth2Client });
          const res = await forms.forms.responses.list({ formId: args.formId });
          data = res.data.responses || [];
        } else if (operation === 'create_form') {
          if (!args.formTitle) throw new Error("formTitle is required for create_form");
          const forms = google.forms({ version: 'v1', auth: oauth2Client });
          const res = await forms.forms.create({
            requestBody: {
              info: { title: args.formTitle }
            }
          });

          let formId = res.data.formId;

          if (args.questions && args.questions.length > 0) {
            let requests = [];
            let index = 0;
            for (let q of args.questions) {
              let item = {
                title: q.title,
                questionItem: {
                  question: { required: true }
                }
              };
              if (q.type === 'text') {
                item.questionItem.question.textQuestion = { paragraph: false };
              } else if (q.type === 'multiple_choice') {
                item.questionItem.question.choiceQuestion = {
                  type: 'RADIO',
                  options: (q.options || []).map(o => ({ value: o }))
                };
              } else {
                item.questionItem.question.textQuestion = { paragraph: false };
              }
              requests.push({
                createItem: {
                  item: item,
                  location: { index: index }
                }
              });
              index++;
            }

            await forms.forms.batchUpdate({
              formId: formId,
              requestBody: { requests }
            });
          }

          data = { formId, formUrl: res.data.responderUri || `https://docs.google.com/forms/d/${formId}/edit` };
        } else if (operation === 'create_event') {
          if (!args.topic || !args.startTime || !args.endTime) throw new Error("topic, startTime, and endTime are required for create_event");
          const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
          let eventParams = {
            calendarId: 'primary',
            requestBody: {
              summary: args.topic,
              start: { dateTime: args.startTime },
              end: { dateTime: args.endTime }
            }
          };
          if (args.addMeetLink) {
            eventParams.conferenceDataVersion = 1;
            eventParams.requestBody.conferenceData = {
              createRequest: {
                requestId: Math.random().toString(36).substring(2, 12),
                conferenceSolutionKey: { type: "hangoutsMeet" }
              }
            };
          }
          const res = await calendar.events.insert(eventParams);
          data = res.data;
        } else if (operation === 'list_classroom_courses') {
          const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
          const res = await classroom.courses.list({ pageSize: limit, courseStates: ['ACTIVE'] });
          data = res.data.courses || [];
        } else if (operation === 'list_classroom_teachers') {
          if (!args.courseId) throw new Error("courseId is required for list_classroom_teachers");
          const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
          const res = await classroom.courses.teachers.list({ courseId: args.courseId, pageSize: limit });
          data = res.data.teachers || [];
        } else if (operation === 'list_classroom_announcements') {
          if (!args.courseId) throw new Error("courseId is required for list_classroom_announcements");
          const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
          const res = await classroom.courses.announcements.list({ courseId: args.courseId, pageSize: limit, orderBy: 'updateTime desc' });
          data = res.data.announcements || [];
        } else if (operation === 'get_classroom_announcement') {
          if (!args.courseId || !args.announcementId) throw new Error("courseId and announcementId are required for get_classroom_announcement");
          const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
          const res = await classroom.courses.announcements.get({ courseId: args.courseId, id: args.announcementId });
          data = res.data || {};
        } else if (operation === 'list_classroom_topics') {
          if (!args.courseId) throw new Error("courseId is required for list_classroom_topics");
          const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
          const res = await classroom.courses.topics.list({ courseId: args.courseId, pageSize: limit });
          data = res.data.topic || [];
        } else if (operation === 'list_classroom_assignments') {
          if (!args.courseId) throw new Error("courseId is required for list_classroom_assignments");
          const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
          const res = await classroom.courses.courseWork.list({ courseId: args.courseId, pageSize: limit, orderBy: 'updateTime desc' });
          data = res.data.courseWork || [];
        } else if (operation === 'create_classroom_assignment') {
          if (!args.courseId || !args.title) throw new Error("courseId and title are required for create_classroom_assignment");
          const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
          const requestBody = {
            title: args.title,
            description: args.description || '',
            workType: 'ASSIGNMENT',
            state: 'PUBLISHED',
          };

          requestBody.materials = [];
          if (args.link) requestBody.materials.push({ link: { url: args.link } });
          if (args.driveFileId) requestBody.materials.push({ driveFile: { driveFile: { id: args.driveFileId } } });
          if (requestBody.materials.length === 0) delete requestBody.materials;

          const res = await classroom.courses.courseWork.create({ courseId: args.courseId, requestBody });
          data = { message: "Assignment created successfully!", coursework: res.data };
        } else if (operation === 'create_classroom_announcement') {
          if (!args.courseId || !args.description) throw new Error("courseId and description are required for create_classroom_announcement");
          const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
          const requestBody = {
            text: args.description,
            state: 'PUBLISHED',
          };

          requestBody.materials = [];
          if (args.link) requestBody.materials.push({ link: { url: args.link } });
          if (args.driveFileId) requestBody.materials.push({ driveFile: { driveFile: { id: args.driveFileId } } });
          if (requestBody.materials.length === 0) delete requestBody.materials;

          const res = await classroom.courses.announcements.create({ courseId: args.courseId, requestBody });
          data = { message: "Announcement created successfully!", announcement: res.data };
        } else if (operation === 'get_classroom_coursework') {
          if (!args.courseId || !args.courseworkId) throw new Error("courseId and courseworkId are required for get_classroom_coursework");
          const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
          const res = await classroom.courses.courseWork.get({ courseId: args.courseId, id: args.courseworkId });
          data = res.data || {};
        } else if (operation === 'list_classroom_materials') {
          if (!args.courseId) throw new Error("courseId is required for list_classroom_materials");
          const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
          const res = await classroom.courses.courseWorkMaterials.list({ courseId: args.courseId, pageSize: limit, orderBy: 'updateTime desc' });
          data = res.data.courseWorkMaterial || [];
        } else if (operation === 'list_classroom_submissions') {
          if (!args.courseId || !args.courseworkId) throw new Error("courseId and courseworkId are required for list_classroom_submissions");
          const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
          const res = await classroom.courses.courseWork.studentSubmissions.list({ courseId: args.courseId, courseWorkId: args.courseworkId, pageSize: limit });
          data = res.data.studentSubmissions || [];
        } else if (operation === 'read_classroom_file') {
          if (!args.fileId) throw new Error("fileId is required for read_classroom_file");
          // Classroom files are just Drive files, so we reuse the read_drive_file logic under the hood
          const drive = google.drive({ version: 'v3', auth: oauth2Client });
          const fileMeta = await drive.files.get({ fileId: args.fileId, fields: 'name, mimeType' });
          const isGoogleWorkspaceType = fileMeta.data.mimeType.startsWith('application/vnd.google-apps.');

          let buffer;
          let mime = fileMeta.data.mimeType;
          if (isGoogleWorkspaceType) {
            const exportMime = args.mimeType || 'application/pdf';
            if (fileMeta.data.mimeType === 'application/vnd.google-apps.folder') throw new Error("Cannot read a folder as a file.");
            const file = await drive.files.export({ fileId: args.fileId, mimeType: exportMime }, { responseType: 'arraybuffer' });
            buffer = Buffer.from(file.data);
            mime = exportMime;
            if (exportMime === 'application/pdf' && !fileMeta.data.name.endsWith('.pdf')) fileMeta.data.name += '.pdf';
          } else {
            const file = await drive.files.get({ fileId: args.fileId, alt: 'media' }, { responseType: 'arraybuffer' });
            buffer = Buffer.from(file.data);
          }

          if (buffer.length > 10 * 1024 * 1024) throw new Error("File exceeds 10MB limit. OCR/Parsing rejected.");
          const objectKey = await uploadPrivateBufferToR2(buffer, `ai-temp-cache/${Date.now()}-${fileMeta.data.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`, mime);
          const url = await getPrivateDownloadUrl(objectKey);
          data = { message: "Classroom file downloaded and securely staged in R2 temp cache.", url, name: fileMeta.data.name, mimeType: mime, sizeBytes: buffer.length };
        } else {
          throw new Error(`Unsupported operation: ${operation}`);
        }

        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to execute Google API call: ${e.message}` }] };
      }
    }

    if (name === 'zoom_connector') {
      const { operation } = args;
      const { userEmail = '' } = context;

      const user = await mongoose.models.User.findOne({ email: userEmail });
      if (!user || (!user.zoom_access_token && !user.zoom_refresh_token)) {
        return { content: [{ type: 'text', text: `Error: No Zoom connection found. Please connect your Zoom account first.` }] };
      }

      try {
        let accessToken = user.zoom_access_token;
        if (user.zoom_token_expiry && new Date(user.zoom_token_expiry.getTime() - 5 * 60000) < new Date()) {
          const tokenResponse = await fetch("https://zoom.us/oauth/token", {
            method: "POST",
            headers: {
              "Authorization": `Basic ${Buffer.from(process.env.ZOOM_CLIENT_ID + ':' + process.env.ZOOM_CLIENT_SECRET).toString('base64')}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: user.zoom_refresh_token })
          });
          const tokenData = await tokenResponse.json();
          if (tokenData.error) throw new Error("Zoom token expired");
          user.zoom_access_token = tokenData.access_token;
          user.zoom_refresh_token = tokenData.refresh_token;
          user.zoom_token_expiry = new Date(Date.now() + tokenData.expires_in * 1000);
          await user.save();
          accessToken = user.zoom_access_token;
        }

        if (operation === 'list_meetings') {
          const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data.meetings, null, 2) }] };
        } else if (operation === 'create_meeting') {
          if (!args.topic || !args.startTime) throw new Error("topic and startTime are required for create_meeting");
          const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              topic: args.topic,
              type: 2,
              start_time: args.startTime,
              duration: args.duration || 60,
              settings: { host_video: true, participant_video: true, join_before_host: false }
            })
          });
          const data = await res.json();
          if (data.code) throw new Error(`Zoom API error: ${data.message}`);
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } else {
          throw new Error(`Unsupported operation: ${operation}`);
        }
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to execute Zoom API call: ${e.message}` }] };
      }
    }

    if (name === 'microsoft_workspace_connector') {
      const { operation, limit = 10, unreadOnly, to, subject, body, startTime, endTime, messageId } = args;
      const { userEmail = '' } = context;

      const user = await mongoose.models.User.findOne({ email: userEmail });
      if (!user || (!user.microsoft_access_token && !user.microsoft_refresh_token)) {
        return { content: [{ type: 'text', text: `Error: No Microsoft connection found. Please connect your Microsoft account first.` }] };
      }

      try {
        let accessToken = user.microsoft_access_token;
        if (user.microsoft_token_expiry && new Date(user.microsoft_token_expiry.getTime() - 5 * 60000) < new Date()) {
          const tokenResponse = await fetch(`https://login.microsoftonline.com/common/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.MICROSOFT_CLIENT_ID,
              client_secret: process.env.MICROSOFT_CLIENT_SECRET,
              refresh_token: user.microsoft_refresh_token,
              grant_type: 'refresh_token'
            })
          });
          const tokenData = await tokenResponse.json();
          if (tokenData.error) throw new Error("Microsoft token expired");
          user.microsoft_access_token = tokenData.access_token;
          if (tokenData.refresh_token) user.microsoft_refresh_token = tokenData.refresh_token;
          user.microsoft_token_expiry = new Date(Date.now() + tokenData.expires_in * 1000);

          try {
            const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
              headers: { "Authorization": `Bearer ${tokenData.access_token}` }
            });
            if (profileRes.ok) {
              const profile = await profileRes.json();
              if (profile.displayName) user.microsoft_name = profile.displayName;
              if (profile.mail || profile.userPrincipalName) user.microsoft_email = profile.mail || profile.userPrincipalName;
            }
          } catch (e) {
            console.error("Failed to sync Microsoft profile during tool refresh:", e);
          }

          await user.save();
          accessToken = user.microsoft_access_token;
        }

        if (operation === 'list_sent_emails') {
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders('SentItems')/messages?$top=${limit}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          const safeData = (data.value || []).map(msg => ({
            id: msg.id,
            subject: msg.subject,
            to: msg.toRecipients?.map(r => r.emailAddress?.address).join(', ') || 'Unknown',
            sentDateTime: msg.sentDateTime,
            bodyPreview: msg.bodyPreview
          }));
          return { content: [{ type: 'text', text: JSON.stringify(safeData, null, 2) }] };
        } else if (operation === 'list_emails') {
          let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${limit}`;
          if (unreadOnly) {
            url += `&$filter=isRead eq false`;
          }
          const res = await fetch(url, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          const safeData = (data.value || []).map(msg => {
            const rawDate = new Date(msg.receivedDateTime);
            const istDate = rawDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', timeZoneName: 'short' });
            return {
              id: msg.id,
              subject: msg.subject,
              senderName: msg.sender?.emailAddress?.name || msg.from?.emailAddress?.name || 'Unknown',
              senderEmail: msg.sender?.emailAddress?.address || msg.from?.emailAddress?.address || 'Unknown',
              receivedDateTime: istDate,
              bodyPreview: msg.bodyPreview
            };
          });
          return { content: [{ type: 'text', text: JSON.stringify(safeData, null, 2) }] };
        } else if (operation === 'read_email') {
          if (!messageId) throw new Error("messageId is required for read_email");
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message);
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } else if (operation === 'list_meetings') {
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings?$top=${limit}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data.value, null, 2) }] };
        } else if (operation === 'create_meeting') {
          if (!subject || !startTime || !endTime) throw new Error("subject, startTime, and endTime are required for create_meeting");
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/events`, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: subject,
              start: { dateTime: startTime, timeZone: "UTC" },
              end: { dateTime: endTime, timeZone: "UTC" },
              isOnlineMeeting: true
            })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || "Failed to create meeting");
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } else if (operation === 'send_email') {
          if (!to || !subject || !body) throw new Error("to, subject, and body are required for send_email");
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/sendMail`, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                subject: subject,
                body: { contentType: "HTML", content: body },
                toRecipients: [{ emailAddress: { address: to } }]
              },
              saveToSentItems: "true"
            })
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            throw new Error(`Failed to send email: ${errData?.error?.message || res.statusText}`);
          }
          return { content: [{ type: 'text', text: "Email sent successfully." }] };
        } else if (operation === 'mark_email_read') {
          if (!messageId) throw new Error("messageId is required for mark_email_read");
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
            method: 'PATCH',
            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ isRead: true })
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            throw new Error(`Failed to mark email as read: ${errData?.error?.message || res.statusText}`);
          }
          return { content: [{ type: 'text', text: "Email marked as read successfully." }] };
        } else if (operation === 'list_teams') {
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/joinedTeams`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || "Failed to list teams");
          return { content: [{ type: 'text', text: JSON.stringify(data.value, null, 2) }] };
        } else if (operation === 'list_channels') {
          if (!args.teamId) throw new Error("teamId is required for list_channels");
          const res = await fetch(`https://graph.microsoft.com/v1.0/teams/${args.teamId}/channels`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || "Failed to list channels");
          return { content: [{ type: 'text', text: JSON.stringify(data.value, null, 2) }] };
        } else if (operation === 'create_channel') {
          if (!args.teamId || !args.channelName) throw new Error("teamId and channelName are required for create_channel");
          const res = await fetch(`https://graph.microsoft.com/v1.0/teams/${args.teamId}/channels`, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              displayName: args.channelName,
              description: args.channelDescription || "",
              membershipType: "standard"
            })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || "Failed to create channel");
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } else if (operation === 'read_channel_messages') {
          if (!args.teamId || !args.channelId) throw new Error("teamId and channelId are required for read_channel_messages");
          const res = await fetch(`https://graph.microsoft.com/v1.0/teams/${args.teamId}/channels/${args.channelId}/messages?$top=${limit}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || "Failed to read channel messages");
          return { content: [{ type: 'text', text: JSON.stringify(data.value, null, 2) }] };
        } else if (operation === 'send_channel_message') {
          if (!args.teamId || !args.channelId || !body) throw new Error("teamId, channelId, and body are required for send_channel_message");
          const res = await fetch(`https://graph.microsoft.com/v1.0/teams/${args.teamId}/channels/${args.channelId}/messages`, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              body: { content: body }
            })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || "Failed to send channel message");
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } else if (operation === 'list_chats') {
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/chats?$top=${limit}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || "Failed to list chats");
          return { content: [{ type: 'text', text: JSON.stringify(data.value, null, 2) }] };
        } else if (operation === 'read_chat_messages') {
          if (!args.chatId) throw new Error("chatId is required for read_chat_messages");
          const res = await fetch(`https://graph.microsoft.com/v1.0/chats/${args.chatId}/messages?$top=${limit}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || "Failed to read chat messages");
          return { content: [{ type: 'text', text: JSON.stringify(data.value, null, 2) }] };
        } else if (operation === 'send_direct_message') {
          let targetChatId = args.chatId;
          if (!targetChatId) {
            if (!args.userId) throw new Error("Either chatId or userId must be provided to send a direct message.");
            const chatRes = await fetch(`https://graph.microsoft.com/v1.0/chats`, {
              method: 'POST',
              headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                chatType: 'oneOnOne',
                members: [
                  { "@odata.type": "#microsoft.graph.aadUserConversationMember", roles: ["owner"], "user@odata.bind": "https://graph.microsoft.com/v1.0/me" },
                  { "@odata.type": "#microsoft.graph.aadUserConversationMember", roles: ["owner"], "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${args.userId}')` }
                ]
              })
            });
            const chatData = await chatRes.json();
            if (chatData.error) throw new Error(chatData.error.message || "Failed to create or get chat with user");
            targetChatId = chatData.id;
          }
          if (!body) throw new Error("body is required to send direct message");
          const res = await fetch(`https://graph.microsoft.com/v1.0/chats/${targetChatId}/messages`, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ body: { content: body } })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || "Failed to send direct message");
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } else if (operation === 'read_meeting_transcript') {
          if (!args.meetingId) throw new Error("meetingId is required for read_meeting_transcript");
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${args.meetingId}/transcripts`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message || "Failed to list transcripts");
          if (!data.value || data.value.length === 0) return { content: [{ type: 'text', text: "No transcripts found for this meeting." }] };
          const transcriptId = data.value[0].id;
          const contentRes = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${args.meetingId}/transcripts/${transcriptId}/content?$format=text/vtt`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          if (!contentRes.ok) throw new Error("Failed to download transcript content");
          const contentText = await contentRes.text();
          return { content: [{ type: 'text', text: contentText.substring(0, 50000) }] };
        } else {
          throw new Error(`Unsupported operation: ${operation}`);
        }
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to execute Microsoft API call: ${e.message}` }] };
      }
    }

    if (name === 'check_email_logs') {
      const { recipientEmail } = args;
      if (!recipientEmail) throw new Error('recipientEmail is required');
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const NotificationLog = mongoose.model('NotificationLog');
      const logs = await NotificationLog.find({ recipient: recipientEmail, type: 'EMAIL', createdAt: { $gte: fifteenMinutesAgo } }).lean();
      if (logs.length > 0) {
        return { content: [{ type: 'text', text: 'YES: An email was already sent to ' + recipientEmail + ' recently. DO NOT SEND AGAIN.' }] };
      }
      return { content: [{ type: 'text', text: 'NO: No recent email found for ' + recipientEmail + '. Safe to send.' }] };
    }

    if (name === 'slack_workspace_connector') {
      const { operation, channelId, text, limit = 10, channelName, isPrivate, query, userIds } = args;
      const { userEmail = '' } = context;

      const user = await mongoose.models.User.findOne({ email: userEmail });
      if (!user || !user.slack_access_token) {
        return { content: [{ type: 'text', text: "Error: No Slack account connected. Tell the user to click the Connect button in the AI Hub to link their Slack account." }] };
      }

      const accessToken = user.slack_access_token;

      try {
        if (operation === 'list_channels') {
          const res = await fetch(`https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=50`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Failed to list channels");
          return { content: [{ type: 'text', text: JSON.stringify(data.channels.map(c => ({ id: c.id, name: c.name, is_private: c.is_private })), null, 2) }] };
        } else if (operation === 'read_channel_messages') {
          if (!channelId) throw new Error("channelId is required for read_channel_messages");
          const res = await fetch(`https://slack.com/api/conversations.history?channel=${channelId}&limit=${limit}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Failed to read messages");
          return { content: [{ type: 'text', text: JSON.stringify(data.messages, null, 2) }] };
        } else if (operation === 'send_message') {
          if (!channelId || !text) throw new Error("channelId and text are required for send_message");
          const res = await fetch(`https://slack.com/api/chat.postMessage`, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ channel: channelId, text })
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Failed to send message");
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, ts: data.ts }, null, 2) }] };
        } else if (operation === 'create_channel') {
          if (!channelName) throw new Error("channelName is required for create_channel");
          const res = await fetch(`https://slack.com/api/conversations.create`, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ name: channelName, is_private: isPrivate })
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Failed to create channel");
          return { content: [{ type: 'text', text: JSON.stringify({ id: data.channel.id, name: data.channel.name }, null, 2) }] };
        } else if (operation === 'list_users') {
          const res = await fetch(`https://slack.com/api/users.list?limit=50`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Failed to list users");
          return { content: [{ type: 'text', text: JSON.stringify(data.members.filter(u => !u.deleted).map(u => ({ id: u.id, name: u.name, real_name: u.real_name })), null, 2) }] };
        } else if (operation === 'search_messages') {
          if (!query) throw new Error("query is required for search_messages");
          const res = await fetch(`https://slack.com/api/search.messages?query=${encodeURIComponent(query)}&count=${limit}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Failed to search messages");
          return { content: [{ type: 'text', text: JSON.stringify(data.messages.matches, null, 2) }] };
        } else if (operation === 'invite_to_channel') {
          if (!channelId || !userIds) throw new Error("channelId and userIds are required for invite_to_channel");
          const res = await fetch(`https://slack.com/api/conversations.invite`, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ channel: channelId, users: userIds })
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Failed to invite to channel");
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, channel: data.channel.id }, null, 2) }] };
        } else if (operation === 'archive_channel') {
          if (!channelId) throw new Error("channelId is required for archive_channel");
          const res = await fetch(`https://slack.com/api/conversations.archive`, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ channel: channelId })
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Failed to archive channel");
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Successfully deleted/archived channel ${channelId}` }, null, 2) }] };
        } else {
          throw new Error(`Unsupported operation: ${operation}`);
        }
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to execute Slack API call: ${e.message}` }] };
      }
    }

    if (name === 'github_workspace_connector') {
      const { operation, owner, repo, path: filePath, title, body, state = 'open', repoName, isPrivate, content, message, branch, sha, head, base, issueNumber, query, isClassgridManaged } = args;
      const { userEmail = '' } = context;

      // A Project Mode chat already has its own repo: making another one or pushing the project to a different
      // repo would only make a copy of the same code, so these go through the project's own repo tools.
      if (operation === 'create_repo' || operation === 'push_sandbox_files') {
        const project = context.sessionId ? await projectForChat(context.sessionId).catch(() => null) : null;
        if (project?.repo && (operation === 'create_repo' || `${owner}/${repo}`.toLowerCase() !== project.repo.toLowerCase())) {
          return { content: [{ type: 'text', text: `Not done: this Project Mode project is already linked to the GitHub repo ${project.repo}, so a new or different repo would be a duplicate. Its changes go to ${project.repo} with push_project_to_github.` }] };
        }
        if (project && !project.repo && operation === 'create_repo') {
          return { content: [{ type: 'text', text: 'Not done: in a Project Mode chat the repo is made with create_github_repo_for_project, which also links it to the project and pushes its files.' }] };
        }
        if (project?.repo && operation === 'push_sandbox_files') {
          return { content: [{ type: 'text', text: `Not done: Project Mode files are pushed to ${project.repo} with push_project_to_github.` }] };
        }
      }

      let accessToken = '';
      if (isClassgridManaged) {
        accessToken = process.env.GITHUB_MASTER_TOKEN || process.env.GITHUB_TOKEN;
        if (!accessToken) throw new Error("GITHUB_MASTER_TOKEN environment variable is not configured on the server.");
      } else {
        const user = await mongoose.models.User.findOne({ email: userEmail });
        if (!user || !user.github_access_token) {
          return { content: [{ type: 'text', text: "Error: No GitHub account connected. Tell the user to click the Connect button in the AI Hub to link their GitHub account." }] };
        }
        await ensureFreshGithubToken(user); // keys run out after about 8 hours; renew with the saved refresh key
        accessToken = user.github_access_token;
      }

      const headers = {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28"
      };

      try {
        if (operation === 'list_repos') {
          let url = `https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,organization_member,collaborator`;
          if (owner) {
            url = `https://api.github.com/orgs/${owner}/repos?per_page=100&sort=updated`;
          }
          const res = await fetch(url, { headers });
          let data = await res.json();

          // If org repos fail (e.g. 404 or bad credentials), fallback to user repos
          if (data.message && owner) {
            console.log(`[GitHub] Failed to fetch org repos for ${owner}. Falling back to user repos.`);
            const fallbackRes = await fetch(`https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,organization_member,collaborator`, { headers });
            data = await fallbackRes.json();
          }

          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify(data.map(r => ({ id: r.id, full_name: r.full_name, private: r.private, html_url: r.html_url })), null, 2) }] };
        } else if (operation === 'read_file') {
          if (!owner || !repo || !filePath) throw new Error("owner, repo, and path are required for read_file");
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, { headers });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          if (data.type === 'file' && data.content) {
            const contentDecoded = Buffer.from(data.content, 'base64').toString('utf8');
            return { content: [{ type: 'text', text: contentDecoded }] };
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } else if (operation === 'list_issues') {
          if (!owner || !repo) throw new Error("owner and repo are required for list_issues");
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=${state}`, { headers });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify(data.map(i => ({ number: i.number, title: i.title, state: i.state, user: i.user.login })), null, 2) }] };
        } else if (operation === 'create_issue') {
          if (!owner || !repo || !title || !body) throw new Error("owner, repo, title, and body are required for create_issue");
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ title, body })
          });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify({ number: data.number, html_url: data.html_url }, null, 2) }] };
        } else if (operation === 'create_repo') {
          if (!repoName) throw new Error("repoName is required for create_repo");
          const res = await fetch(`https://api.github.com/user/repos`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: repoName, private: isPrivate || false })
          });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify({ id: data.id, full_name: data.full_name, html_url: data.html_url }, null, 2) }] };
        } else if (operation === 'create_or_update_file') {
          if (!owner || !repo || !filePath || !content || !message) throw new Error("owner, repo, path, content, and message are required for create_or_update_file");
          const contentEncoded = Buffer.from(content, 'utf8').toString('base64');
          const payload = { message, content: contentEncoded };
          if (branch) payload.branch = branch;
          if (sha) payload.sha = sha;
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify({ commit: data.commit.html_url, content: data.content?.html_url }, null, 2) }] };
        } else if (operation === 'push_sandbox_files') {
          // All sandbox files in one commit, read by the server: no file content passes through the model,
          // which used to cost two extra rounds (read back + push) and two extra copies of every file.
          if (!owner || !repo) throw new Error("owner and repo are required for push_sandbox_files");
          if (!/^[\w.\-]+$/.test(owner) || !/^[\w.\-]+$/.test(repo)) throw new Error("invalid owner or repo name");
          // Only the website's files: the model lists them (names only), so leftovers from earlier tasks in
          // this chat's sandbox don't end up in what is usually a public repo.
          const wanted = Array.isArray(args.paths) ? args.paths.map((p) => String(p).replace(/^\/?data\//, '').replace(/^\.?\//, '')).filter(Boolean) : [];
          if (wanted.length === 0) throw new Error("paths is required for push_sandbox_files: list every website file to push, relative to /data/ (e.g. [\"index.html\", \"src/App.jsx\", \"README.md\"]).");
          const files = await readSandboxFilesForPush(sessionId, wanted);
          const paths = Object.keys(files);
          const missing = wanted.filter((p) => !(p in files));
          if (missing.length > 0) throw new Error(`these files are not in the sandbox or can't be pushed (hidden files, keys and .env files are never pushed): ${missing.join(', ')}`);

          const gh = async (path, init = {}) => {
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, { ...init, headers: { ...headers, ...(init.body ? { 'Content-Type': 'application/json' } : {}) } });
            const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
            return { status: res.status, ok: res.ok, data };
          };

          const repoInfo = await gh('');
          if (!repoInfo.ok) throw new Error(repoInfo.data.message || `repo not found (${repoInfo.status})`);
          const targetBranch = branch || repoInfo.data.default_branch || 'main';
          if (!/^[\w.\-/]+$/.test(targetBranch) || targetBranch.includes('..')) throw new Error(`invalid branch name: ${targetBranch}`);

          let ref = await gh(`/git/ref/heads/${targetBranch}`);
          if (!ref.ok && targetBranch !== repoInfo.data.default_branch) {
            // A new branch on a repo that has commits: start it from the default branch.
            const base = await gh(`/git/ref/heads/${repoInfo.data.default_branch}`);
            if (base.ok) {
              const created = await gh('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${targetBranch}`, sha: base.data.object.sha }) });
              if (!created.ok) throw new Error(created.data.message || `could not create branch ${targetBranch}`);
              ref = await gh(`/git/ref/heads/${targetBranch}`);
            }
          }
          if (!ref.ok) {
            // A new empty repo has no commits, and the Git Data API refuses empty repos: create the first
            // file through the contents API, which makes the initial commit and the branch.
            const first = paths.includes('README.md') ? 'README.md' : paths[0];
            const init = await gh(`/contents/${first.split('/').map(encodeURIComponent).join('/')}`, {
              method: 'PUT',
              body: JSON.stringify({ message: message || 'Initial commit', content: files[first], branch: targetBranch })
            });
            if (!init.ok) throw new Error(init.data.message || `could not create the first commit (${init.status})`);
            ref = await gh(`/git/ref/heads/${targetBranch}`);
            if (!ref.ok) throw new Error(ref.data.message || `branch ${targetBranch} not found`);
          }
          const parentSha = ref.data.object.sha;
          const parent = await gh(`/git/commits/${parentSha}`);
          if (!parent.ok) throw new Error(parent.data.message || 'could not read the latest commit');

          const tree = [];
          for (const p of paths) {
            const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: files[p], encoding: 'base64' }) });
            if (!blob.ok) throw new Error(`${p}: ${blob.data.message || `blob upload failed (${blob.status})`}`);
            tree.push({ path: p, mode: '100644', type: 'blob', sha: blob.data.sha });
          }
          const newTree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: parent.data.tree.sha, tree }) });
          if (!newTree.ok) throw new Error(newTree.data.message || 'could not create the tree');
          const commit = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: message || 'Add website files', tree: newTree.data.sha, parents: [parentSha] }) });
          if (!commit.ok) throw new Error(commit.data.message || 'could not create the commit');
          const update = await gh(`/git/refs/heads/${targetBranch}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.data.sha }) });
          if (!update.ok) throw new Error(update.data.message || 'could not update the branch');

          return { content: [{ type: 'text', text: JSON.stringify({ commit: commit.data.html_url, branch: targetBranch, files_pushed: paths }, null, 2) }] };
        } else if (operation === 'create_pull_request') {
          if (!owner || !repo || !title || !head || !base) throw new Error("owner, repo, title, head, and base are required for create_pull_request");
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ title, body, head, base })
          });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify({ number: data.number, html_url: data.html_url, state: data.state }, null, 2) }] };
        } else if (operation === 'list_pull_requests') {
          if (!owner || !repo) throw new Error("owner and repo are required for list_pull_requests");
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}`, { headers });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify(data.map(pr => ({ number: pr.number, title: pr.title, state: pr.state, url: pr.html_url })), null, 2) }] };
        } else if (operation === 'add_issue_comment') {
          if (!owner || !repo || !issueNumber || !body) throw new Error("owner, repo, issueNumber, and body are required for add_issue_comment");
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ body })
          });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify({ id: data.id, html_url: data.html_url }, null, 2) }] };
        } else if (operation === 'search_code') {
          if (!query) throw new Error("query is required for search_code");
          const res = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}`, { headers });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify(data.items.slice(0, 10).map(i => ({ name: i.name, path: i.path, repository: i.repository.full_name, html_url: i.html_url })), null, 2) }] };
        } else if (operation === 'list_commits') {
          if (!owner || !repo) throw new Error("owner and repo are required for list_commits");
          let url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`;
          if (filePath) url += `&path=${filePath}`;
          const res = await fetch(url, { headers });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify(data.map(c => ({ sha: c.sha, message: c.commit.message, author: c.commit.author.name, date: c.commit.author.date })), null, 2) }] };
        } else if (operation === 'get_commit') {
          if (!owner || !repo || !sha) throw new Error("owner, repo, and sha are required for get_commit");
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, { headers });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify({ sha: data.sha, message: data.commit.message, files: data.files?.map(f => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions, patch: f.patch })) }, null, 2) }] };
        } else if (operation === 'list_branches') {
          if (!owner || !repo) throw new Error("owner and repo are required for list_branches");
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=50`, { headers });
          const data = await res.json();
          if (data.message) throw new Error(data.message);
          return { content: [{ type: 'text', text: JSON.stringify(data.map(b => ({ name: b.name, commit_sha: b.commit.sha })), null, 2) }] };
        } else {
          throw new Error(`Unsupported operation: ${operation}`);
        }
      } catch (e) {
        // Identical repeated calls are blocked as duplicates, so a retry of the push needs a new commit message.
        const retryHint = operation === 'push_sandbox_files' ? ' To retry after fixing the cause, call push_sandbox_files again with a different commit message.' : '';
        return { content: [{ type: 'text', text: `Failed to execute GitHub API call: ${e.message}${retryHint}` }] };
      }
    }

    if (name === 'notion_connector') {
      const { operation, query, limit = 10, pageId } = args;
      const { userEmail = '' } = context;

      const parseMarkdownToNotionBlocks = (text) => {
        if (!text) return [];
        const blocks = [];
        const lines = text.split('\n');
        
        const parseRichText = (str) => {
          const tokens = [];
          let current = '';
          let i = 0;
          while (i < str.length) {
            if (str.substr(i, 2) === '**') {
              if (current) tokens.push({ type: 'text', text: { content: current } });
              current = '';
              i += 2;
              let boldText = '';
              while (i < str.length && str.substr(i, 2) !== '**') { boldText += str[i]; i++; }
              if (str.substr(i, 2) === '**') i += 2;
              tokens.push({ type: 'text', text: { content: boldText }, annotations: { bold: true } });
            } else if (str[i] === '`') {
              if (current) tokens.push({ type: 'text', text: { content: current } });
              current = '';
              i++;
              let codeText = '';
              while (i < str.length && str[i] !== '`') { codeText += str[i]; i++; }
              if (str[i] === '`') i++;
              tokens.push({ type: 'text', text: { content: codeText }, annotations: { code: true } });
            } else {
              current += str[i];
              i++;
            }
          }
          if (current) tokens.push({ type: 'text', text: { content: current } });
          return tokens.length > 0 ? tokens : [{ type: 'text', text: { content: " " } }];
        };

        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          if (line.startsWith('# ')) {
            blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: parseRichText(line.substring(2)) } });
          } else if (line.startsWith('## ')) {
            blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: parseRichText(line.substring(3)) } });
          } else if (line.startsWith('### ')) {
            blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: parseRichText(line.substring(4)) } });
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: parseRichText(line.substring(2)) } });
          } else if (/^\d+\.\s/.test(line)) {
            blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: parseRichText(line.replace(/^\d+\.\s/, '')) } });
          } else if (line.startsWith('> ')) {
            blocks.push({ object: 'block', type: 'quote', quote: { rich_text: parseRichText(line.substring(2)) } });
          } else {
            blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: parseRichText(line) } });
          }
        }
        const maxBlocks = blocks.slice(0, 100);
        return maxBlocks.length > 0 ? maxBlocks : [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: "Empty page created by Classgrid AI" } }] } }];
      };

      const user = await mongoose.models.User.findOne({ email: userEmail });
      if (!user || (!user.notion_access_token && !user.notion_refresh_token)) {
        return { content: [{ type: 'text', text: `Error: No Notion connection found. Please connect your Notion account first.` }] };
      }

      try {
        let accessToken = user.notion_access_token;
        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        };

        if (operation === 'search') {
          const res = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: query || "", page_size: limit })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.message || 'Notion API error');

          // Clean up response for AI token size
          const safeResults = (data.results || []).map(r => ({
            id: r.id,
            object: r.object,
            url: r.url,
            title: r.properties?.title?.title?.[0]?.plain_text || r.properties?.Name?.title?.[0]?.plain_text || 'Untitled'
          }));
          return { content: [{ type: 'text', text: JSON.stringify(safeResults, null, 2) }] };

        } else if (operation === 'get_page') {
          if (!pageId) throw new Error("pageId is required for get_page");
          const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
            headers
          });
          const data = await res.json();
          if (data.error) throw new Error(data.message || 'Notion API error');

          // Extract text from blocks
          const textBlocks = (data.results || []).map(b => {
            const type = b.type;
            const richText = b[type]?.rich_text || [];
            return richText.map(t => t.plain_text).join('');
          }).filter(t => t.trim() !== '');

          let outputText = textBlocks.join('\n');
          if (outputText.length > 3000) outputText = outputText.substring(0, 3000) + "\n[TRUNCATED TO SAVE CONTEXT]";

          return { content: [{ type: 'text', text: outputText || 'No readable text on this page.' }] };
        } else if (operation === 'create_page') {
          if (!args.pageId) throw new Error("pageId (parent page ID) is required for create_page");
          if (!args.title) throw new Error("title is required for create_page");

          const payload = {
            parent: { page_id: args.pageId },
            properties: {
              title: [
                {
                  text: { content: args.title }
                }
              ]
            },
            children: parseMarkdownToNotionBlocks(args.content)
          };

          const res = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.error) throw new Error(data.message || 'Notion API error');

          return { content: [{ type: 'text', text: `Success! Created Notion page with ID: ${data.id} and URL: ${data.url}` }] };
        } else if (operation === 'update_page') {
          if (!args.pageId) throw new Error("pageId is required for update_page");
          if (!args.content) throw new Error("content is required for update_page");

          const payload = {
            children: parseMarkdownToNotionBlocks(args.content)
          };

          const res = await fetch(`https://api.notion.com/v1/blocks/${args.pageId}/children`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.error) throw new Error(data.message || 'Notion API error');

          return { content: [{ type: 'text', text: `Success! Appended content to page/block ID: ${args.pageId}` }] };
        } else if (operation === 'add_comment') {
          if (!args.pageId) throw new Error("pageId is required for add_comment");
          if (!args.content) throw new Error("content is required for add_comment");

          const payload = {
            parent: { page_id: args.pageId },
            rich_text: [
              {
                type: 'text',
                text: { content: args.content }
              }
            ]
          };

          const res = await fetch(`https://api.notion.com/v1/comments`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.error) throw new Error(data.message || 'Notion API error');

          return { content: [{ type: 'text', text: `Success! Added comment to page ID: ${args.pageId}` }] };
        } else if (operation === 'read_comments') {
          if (!args.pageId) throw new Error("pageId is required for read_comments");

          const res = await fetch(`https://api.notion.com/v1/comments?block_id=${args.pageId}`, {
            method: 'GET',
            headers
          });
          const data = await res.json();
          if (data.error) throw new Error(data.message || 'Notion API error');

          const comments = (data.results || []).map(c => {
            const text = c.rich_text.map(t => t.plain_text).join('');
            return `[${new Date(c.created_time).toLocaleString()}] Comment: ${text}`;
          });

          return { content: [{ type: 'text', text: comments.length > 0 ? comments.join('\n') : "No comments found." }] };
        } else {
          throw new Error(`Unsupported operation: ${operation}`);
        }
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to execute Notion API call: ${e.message}` }] };
      }
    }

    if (name === 'whatsapp_business_connector') {
      const { toPhoneNumber, messageText } = args;
      try {
        if (!process.env.WHATSAPP_PHONE_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
          throw new Error("WhatsApp Business API keys are not configured in the backend environment.");
        }

        const res = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: toPhoneNumber,
            type: "text",
            text: {
              preview_url: false,
              body: messageText
            }
          })
        });

        const data = await res.json();
        if (data.error) {
          throw new Error(data.error.message);
        }

        return { content: [{ type: 'text', text: `WhatsApp message sent successfully to ${toPhoneNumber}. Message ID: ${data.messages[0].id}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to send WhatsApp message: ${e.message}` }] };
      }
    }

    if (name === 'read_server_logs') {
      const { log_type, lines = 100 } = args;
      const numLines = Math.min(lines, 500);
      try {
        let output = '';
        if (log_type === 'pm2_error' || log_type === 'pm2_out') {
          const stream = log_type === 'pm2_error' ? 'err' : 'out';
          const { stdout, stderr } = await execPromise(`pm2 logs --${stream} --lines ${numLines} --nostream`);
          output = stdout || stderr || 'No PM2 logs found.';
        } else if (log_type === 'winston_error' || log_type === 'winston_combined') {
          const fileName = log_type === 'winston_error' ? 'error.log' : 'combined.log';
          const logPath = path.join(process.cwd(), 'logs', fileName);
          if (!fs.existsSync(logPath)) {
            output = `Log file ${logPath} does not exist.`;
          } else {
            try {
              const { stdout } = await execPromise(`tail -n ${numLines} "${logPath}"`);
              output = stdout || `No logs in ${fileName}.`;
            } catch (tailErr) {
              // Fallback for Windows or if tail fails (reads into memory, could be heavy)
              const content = fs.readFileSync(logPath, 'utf-8');
              const fileLines = content.split('\n');
              output = fileLines.slice(-numLines).join('\n');
            }
          }
        }
        return { content: [{ type: 'text', text: output.substring(0, 50000) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to read server logs: ${err.message}` }] };
      }
    }

    if (name === 'aws_ses_connector') {
      const { operation } = args;
      try {
        const sesClient = new SESClient({ region: process.env.AWS_REGION || 'ap-south-1' });

        if (operation === 'get_statistics') {
          const command = new GetSendStatisticsCommand({});
          const response = await sesClient.send(command);
          return { content: [{ type: 'text', text: JSON.stringify(response.SendDataPoints, null, 2) }] };
        } else if (operation === 'list_identities') {
          const command = new ListIdentitiesCommand({ IdentityType: 'EmailAddress' });
          const response = await sesClient.send(command);
          return { content: [{ type: 'text', text: JSON.stringify(response.Identities, null, 2) }] };
        } else {
          throw new Error(`Unsupported operation: ${operation}`);
        }
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed to connect to AWS SES: ${e.message}` }] };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    console.error(`[MCP Tool Error] ${name}:`, error);
    return {
      isError: true,
      content: [{ type: 'text', text: `Error executing ${name}: ${error.message}` }],
    };
  }
};

export async function readSandboxFiles(sessionId) {
  const ssh = new NodeSSH();
  const isProd = process.env.NODE_ENV === 'production';
  await ssh.connect({
    host: isProd ? '172.31.6.98' : '13.63.34.197',
    username: 'ubuntu',
    ...(process.env.AGENT_SSH_KEY
      ? { privateKey: process.env.AGENT_SSH_KEY.replace(/\\n/g, '\n') }
      : { privateKeyPath: 'C:\\Users\\nikhi\\Downloads\\Nikhil.pem' })
  });

  try {
    if (await projectForChat(sessionId).catch(() => null)) return {}; // Project Mode: the code editor shows the files
    const dir = `/home/ubuntu/sandbox_data/${sessionId}`;
    // Recursively find ALL files (including subdirectories like css/, js/), excluding the hidden runner files
    // (.cg_run.*, .cg_run_terminal.sh). A site's own script.js is a normal file and is included.
    const { stdout } = await ssh.execCommand(`find ${dir} -type f ! -name '${SANDBOX_RUNNER_PREFIX}*' -printf '%P\\n' 2>/dev/null`);
    const filenames = stdout.split('\n').map(f => f.trim()).filter(Boolean);

    const files = {};
    for (const name of filenames) {
      // Only read text files we care about (html, css, js, json, svg, md, txt)
      if (!/\.(html|css|js|json|svg|md|txt)$/i.test(name)) continue;
      const { stdout: content } = await ssh.execCommand(`cat ${dir}/${name}`);
      files[name] = content;
    }
    return files;
  } catch (err) {
    console.error("Failed to read sandbox files via SSH:", err);
    return {};
  } finally {
    ssh.dispose();
  }
}


/**
 * Every project file in the session's sandbox, base64-encoded, for pushing to GitHub: all file types
 * (images too), without the sandbox's own runner files (the hidden .cg_run* files, dropped by NEVER_PUSH;
 * script.py / script.sh runner leftovers from older sessions; deploy.js at the top level, which the
 * Classgrid Cloud deploy writes) and without dependency or build folders. A site's own script.js is pushed.
 */
// Never pushed, whatever the model lists: hidden files and folders (.env, .ssh, ...) and key/credential files.
const NEVER_PUSH = /(^|\/)\.(?!gitignore$)[^/]*($|\/)|\.(pem|key|p12|pfx|crt|cer|keystore|jks)$|(^|\/)id_(rsa|ed25519|ecdsa|dsa)(\.pub)?$/i;

async function readSandboxFilesForPush(sessionId, wantedPaths) {
  if (!/^[\w-]+$/.test(String(sessionId))) throw new Error("invalid sandbox session");
  const MAX_FILES = 300;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
  const ssh = new NodeSSH();
  const isProd = process.env.NODE_ENV === 'production';
  await ssh.connect({
    host: isProd ? '172.31.6.98' : '13.63.34.197',
    username: 'ubuntu',
    ...(process.env.AGENT_SSH_KEY
      ? { privateKey: process.env.AGENT_SSH_KEY.replace(/\\n/g, '\n') }
      : { privateKeyPath: 'C:\\Users\\nikhi\\Downloads\\Nikhil.pem' })
  });

  try {
    const dir = await sandboxDataDir(sessionId);
    const { stdout } = await ssh.execCommand(
      `cd ${dir} 2>/dev/null && find . \\( -name node_modules -o -name .git -o -name dist -o -name build -o -name .next -o -name .vite \\) -prune -o -type f -printf '%s %P\\n'`
    );
    const wanted = new Set(wantedPaths);
    const entries = stdout.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const space = l.indexOf(' ');
      return { size: Number(l.slice(0, space)), path: l.slice(space + 1) };
    }).filter(({ size, path }) => Number.isFinite(size) && path && wanted.has(path)
      && !/^(script\.(py|sh)|deploy\.js)$/.test(path) && !NEVER_PUSH.test(path) && !/['\n\\]/.test(path));

    if (entries.length > MAX_FILES) throw new Error(`too many files in the sandbox (${entries.length}, max ${MAX_FILES})`);
    const total = entries.reduce((s, e) => s + e.size, 0);
    if (total > MAX_TOTAL_BYTES) throw new Error(`sandbox files are too large (${Math.round(total / 1048576)} MB, max 30 MB)`);
    const tooBig = entries.find((e) => e.size > MAX_FILE_BYTES);
    if (tooBig) throw new Error(`${tooBig.path} is larger than 5 MB`);

    const files = {};
    for (const { path } of entries) {
      const { stdout: b64, code } = await ssh.execCommand(`base64 -w0 '${dir}/${path}'`);
      if (code !== 0 && code !== null) throw new Error(`could not read ${path} from the sandbox`);
      files[path] = b64.trim();
    }
    return files;
  } finally {
    ssh.dispose();
  }
}

// Trigger redeploy for env keys

