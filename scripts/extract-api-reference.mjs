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
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const parser = require("../client/node_modules/@babel/parser");
const traverse = require("../client/node_modules/@babel/traverse").default;
const generate = require("../client/node_modules/@babel/generator").default;

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (m) => m.slice(1))), "..");
const routesRoot = path.join(repoRoot, "server", "src", "routes");
const apiIndex = path.join(repoRoot, "server", "api", "index.js");

const domains = {
  "api-auth-doc.md": {
    title: "Authentication API",
    files: ["auth.routes.js", "google.routes.js"],
  },
  "api-organization-doc.md": {
    title: "Organization API",
    files: ["org.routes.js", "organization.routes.js", "admin.routes.js", "hierarchy.routes.js"],
  },
  "api-students-faculty-doc.md": {
    title: "Students and Faculty API",
    files: ["student.routes.js", "student-profile.routes.js", "faculty.routes.js", "user.routes.js"],
  },
  "api-attendance-doc.md": {
    title: "Attendance and Leave API",
    files: ["attendance.routes.js", "attendance_dashboard.routes.js", "leave.routes.js", "holidays.routes.js"],
  },
  "api-fees-billing-doc.md": {
    title: "Fees and Billing API",
    files: ["fees.routes.js", "fee-records.routes.js", "billing-checkout.routes.js", "billing-demo.routes.js", "billing-handoff.routes.js", "payroll.routes.js"],
  },
  "api-exams-marks-doc.md": {
    title: "Exams and Marks API",
    files: ["exam.routes.js", "examination.routes.js", "examinations.routes.js", "marks.routes.js", "result.routes.js", "internal-tests.routes.js", "online-exam.routes.js", "viva.routes.js", "certificate.routes.js"],
  },
  "api-academics-doc.md": {
    title: "Academics API",
    files: ["academic.routes.js", "academic-plan.routes.js", "course.routes.js", "classroom.routes.js", "timetable.routes.js"],
  },
  "api-communication-doc.md": {
    title: "Communication API",
    files: ["chat.routes.js", "messaging.routes.js", "notification.routes.js", "push.routes.js", "forum.routes.js"],
  },
  "api-admissions-doc.md": {
    title: "Admissions API",
    files: ["admission.routes.js", "crm.routes.js"],
  },
  "api-library-doc.md": {
    title: "Library API",
    files: ["library.routes.js"],
  },
};

function parseFile(file) {
  return parser.parse(fs.readFileSync(file, "utf8"), {
    sourceType: "module",
    errorRecovery: true,
    plugins: [
      "jsx",
      "classProperties",
      "objectRestSpread",
      "optionalChaining",
      "nullishCoalescingOperator",
      "topLevelAwait",
      "dynamicImport",
    ],
  });
}

function literalValue(node) {
  if (!node) return null;
  if (node.type === "StringLiteral" || node.type === "NumericLiteral" || node.type === "BooleanLiteral") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0]?.value?.cooked ?? "";
  return null;
}

function expressionText(node) {
  try {
    return generate(node, { comments: false, compact: true }).code;
  } catch {
    return "unknown";
  }
}

function getPropertyName(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "StringLiteral") return node.value;
  return null;
}

function asciiClean(value) {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function flattenArgs(node) {
  if (!node) return [];
  if (node.type === "ArrayExpression") return node.elements.flatMap(flattenArgs);
  return [node];
}

function middlewareLabel(node) {
  if (!node) return "unknown middleware";
  return expressionText(node);
}

function handlerRef(node) {
  if (!node) return null;
  if (node.type === "Identifier") return { local: node.name, member: null };
  if (node.type === "MemberExpression" && !node.computed && node.object.type === "Identifier" && node.property.type === "Identifier") {
    return { local: node.object.name, member: node.property.name };
  }
  return null;
}

function commentFor(node) {
  const comments = node.leadingComments || [];
  if (!comments.length) return "";
  const text = comments.at(-1).value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*?\s?/, "").trim())
    .filter(Boolean)
    .filter((line) => !/^[-=─━═]{3,}$/.test(line))
    .filter((line) => !/^@(route|access|desc|param|returns?)\b/i.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const cleaned = asciiClean(text);
  return cleaned.length > 260 ? `${cleaned.slice(0, 257)}...` : cleaned;
}

function extractMounts() {
  const ast = parseFile(apiIndex);
  const imports = new Map();
  for (const stmt of ast.program.body) {
    if (stmt.type !== "ImportDeclaration") continue;
    const source = stmt.source.value;
    if (!source.includes("/routes/")) continue;
    for (const spec of stmt.specifiers) imports.set(spec.local.name, path.basename(source));
  }
  const mounts = new Map();
  traverse(ast, {
    CallExpression(p) {
      const n = p.node;
      if (n.callee.type !== "MemberExpression" || n.callee.object.type !== "Identifier" || n.callee.object.name !== "app") return;
      if (getPropertyName(n.callee.property) !== "use" || n.arguments.length < 2) return;
      const prefix = literalValue(n.arguments[0]);
      const routerArg = n.arguments.at(-1);
      if (typeof prefix !== "string" || routerArg.type !== "Identifier") return;
      const file = imports.get(routerArg.name);
      if (!file) return;
      if (!mounts.has(file)) mounts.set(file, []);
      mounts.get(file).push(prefix);
    },
  });
  // This route is imported dynamically immediately before its mount.
  mounts.set("razorpay-webhook.routes.js", ["/api/webhooks"]);
  return mounts;
}

function extractImports(ast, routeFile) {
  const imports = new Map();
  for (const stmt of ast.program.body) {
    if (stmt.type !== "ImportDeclaration") continue;
    const resolved = path.resolve(path.dirname(routeFile), stmt.source.value);
    const sourceFile = path.extname(resolved) ? resolved : `${resolved}.js`;
    for (const spec of stmt.specifiers) {
      if (spec.type === "ImportSpecifier") imports.set(spec.local.name, { sourceFile, imported: spec.imported.name, kind: "named" });
      if (spec.type === "ImportDefaultSpecifier") imports.set(spec.local.name, { sourceFile, imported: "default", kind: "default" });
      if (spec.type === "ImportNamespaceSpecifier") imports.set(spec.local.name, { sourceFile, imported: "*", kind: "namespace" });
    }
  }
  return imports;
}

const astCache = new Map();
function cachedAst(file) {
  if (!fs.existsSync(file)) return null;
  if (!astCache.has(file)) astCache.set(file, parseFile(file));
  return astCache.get(file);
}

function findExportedNode(file, importedName) {
  const ast = cachedAst(file);
  if (!ast) return null;
  let found = null;
  traverse(ast, {
    FunctionDeclaration(p) {
      if (p.node.id?.name === importedName) found = p.node;
    },
    VariableDeclarator(p) {
      if (p.node.id.type === "Identifier" && p.node.id.name === importedName) found = p.node.init;
    },
    ObjectProperty(p) {
      if (importedName !== "default" || p.parentPath?.parentPath?.node?.type !== "ExportDefaultDeclaration") return;
      found = p.parentPath.parentPath.node.declaration;
    },
  });
  if (importedName === "default") {
    const exp = ast.program.body.find((s) => s.type === "ExportDefaultDeclaration");
    if (exp?.declaration && exp.declaration.type !== "Identifier") found = exp.declaration;
  }
  return found;
}

function resolveHandlerNode(routeFile, imports, node) {
  if (!node) return { node: null, name: "inline handler", source: routeFile };
  if (["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration"].includes(node.type)) {
    return { node, name: "inline handler", source: routeFile };
  }
  const ref = handlerRef(node);
  if (!ref) return { node: null, name: expressionText(node), source: routeFile };
  const imp = imports.get(ref.local);
  if (!imp) {
    const localAst = cachedAst(routeFile);
    let localNode = null;
    traverse(localAst, {
      FunctionDeclaration(p) { if (p.node.id?.name === ref.local) localNode = p.node; },
      VariableDeclarator(p) { if (p.node.id.type === "Identifier" && p.node.id.name === ref.local) localNode = p.node.init; },
    });
    return { node: localNode, name: ref.local, source: routeFile };
  }
  const importedName = ref.member || (imp.kind === "namespace" ? ref.member : imp.imported);
  return { node: findExportedNode(imp.sourceFile, importedName), name: importedName || ref.member || ref.local, source: imp.sourceFile };
}

function collectReqFields(rootNode) {
  const buckets = { body: new Map(), query: new Map(), params: new Map() };
  if (!rootNode) return buckets;

  const add = (kind, name, node, required = false, defaultValue = null, localName = null) => {
    if (!name || !buckets[kind]) return;
    const previous = buckets[kind].get(name) || { name, required: false, defaults: [], usages: [], localNames: [] };
    previous.required ||= required;
    if (defaultValue !== null && !previous.defaults.includes(defaultValue)) previous.defaults.push(defaultValue);
    if (localName && !previous.localNames.includes(localName)) previous.localNames.push(localName);
    if (node && previous.usages.length < 8) previous.usages.push(expressionText(node));
    buckets[kind].set(name, previous);
  };

  const wrapped = rootNode.type === "File" ? rootNode : parser.parse(`(${expressionText(rootNode)})`, { sourceType: "module", plugins: ["jsx"] });
  traverse(wrapped, {
    VariableDeclarator(p) {
      const init = p.node.init;
      if (!init || init.type !== "MemberExpression" || init.object.type !== "Identifier" || init.object.name !== "req") return;
      const kind = getPropertyName(init.property);
      if (!buckets[kind] || p.node.id.type !== "ObjectPattern") return;
      for (const prop of p.node.id.properties) {
        if (prop.type !== "ObjectProperty") continue;
        const sourceName = getPropertyName(prop.key);
        const assignment = prop.value.type === "AssignmentPattern" ? literalValue(prop.value.right) : null;
        const localName = prop.value.type === "Identifier"
          ? prop.value.name
          : prop.value.type === "AssignmentPattern" && prop.value.left.type === "Identifier"
            ? prop.value.left.name
            : sourceName;
        add(kind, sourceName, prop, false, assignment, localName);
      }
    },
    MemberExpression(p) {
      const n = p.node;
      if (n.object.type !== "MemberExpression" || n.object.object.type !== "Identifier" || n.object.object.name !== "req") return;
      const kind = getPropertyName(n.object.property);
      const name = getPropertyName(n.property);
      if (buckets[kind]) add(kind, name, p.parentPath?.node);
    },
    UnaryExpression(p) {
      if (p.node.operator !== "!") return;
      const a = p.node.argument;
      if (a.type === "Identifier") {
        for (const kind of Object.keys(buckets)) {
          for (const field of buckets[kind].values()) {
            if (field.name === a.name || field.localNames.includes(a.name)) field.required = true;
          }
        }
      }
      if (a.type === "MemberExpression" && a.object.type === "MemberExpression" && a.object.object.type === "Identifier" && a.object.object.name === "req") {
        const kind = getPropertyName(a.object.property);
        const name = getPropertyName(a.property);
        add(kind, name, p.parentPath?.node, true);
      }
    },
  });
  return buckets;
}

function inferType(field) {
  const name = field.name;
  const usage = field.usages.join(" ");
  const defaults = field.defaults;
  if (/(^|_)id$|Id$|token$|code$|email$|phone$|uuid$|prn$/i.test(name)) return "string";
  if (defaults.some((v) => typeof v === "boolean") || /Boolean\s*\(/.test(usage) || /^(is_|has_|can_|should_|include_|enabled$|active$)/i.test(name)) return "boolean";
  if (defaults.some((v) => typeof v === "number") || /Number\s*\(|parseInt\s*\(|parseFloat\s*\(/.test(usage) || /(^|_)(page|limit|offset|amount|count|year|month|day|size|duration|score|marks|price|quantity|percentage|percent|hours?|minutes?|seconds?|priority|order|capacity|total)(_|$)/i.test(name)) return "number";
  if (/Array\.isArray\s*\(/.test(usage) || /(^|_)(ids|items|records|files|roles|students|faculty|courses|subjects|classes|members|questions|answers|options|attendees|dates|tags)(_|$)/i.test(name)) return "array";
  if (/Date\s*\(|date|_at$|At$/.test(`${name} ${usage}`)) return "string (date/time)";
  if (/^(file|image|photo|pdf|proof|attachment)$/i.test(name)) return "file";
  if (/(config|settings|metadata|payload|mapping|filters|address|location|schedule|structure|rubric|details|data)$/i.test(name)) return "object";
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return "string";
  return "unknown";
}

function fieldDescription(kind, field) {
  const readable = field.name.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  const suffix = field.defaults.length ? ` Default: \`${field.defaults.join("`, `")}\`.` : "";
  return `${kind === "params" ? "Path identifier/value" : kind === "query" ? "Query value" : "Request value"} for ${readable}.${suffix}`;
}

function extractResponse(rootNode) {
  if (!rootNode) return "Response shape is defined by the handler at runtime.";
  const statuses = new Set();
  const keys = new Set();
  const messages = new Set();
  const wrapped = parser.parse(`(${expressionText(rootNode)})`, { sourceType: "module", plugins: ["jsx"] });
  traverse(wrapped, {
    CallExpression(p) {
      const n = p.node;
      let isResponse = false;
      let status = null;
      if (n.callee.type === "MemberExpression") {
        const method = getPropertyName(n.callee.property);
        if (["json", "send"].includes(method)) {
          const obj = n.callee.object;
          if (obj.type === "Identifier" && obj.name === "res") isResponse = true;
          if (obj.type === "CallExpression" && obj.callee.type === "MemberExpression" && obj.callee.object.type === "Identifier" && obj.callee.object.name === "res" && getPropertyName(obj.callee.property) === "status") {
            isResponse = true;
            status = literalValue(obj.arguments[0]);
          }
        }
        if (method === "redirect" && n.callee.object.type === "Identifier" && n.callee.object.name === "res") {
          messages.add("Redirects the client to the generated destination URL.");
        }
      }
      if (!isResponse) return;
      if (status !== null) statuses.add(status);
      const payload = n.arguments[0];
      if (payload?.type === "ObjectExpression") {
        for (const prop of payload.properties) {
          if (prop.type !== "ObjectProperty" && prop.type !== "ObjectMethod") continue;
          const key = getPropertyName(prop.key);
          if (key) keys.add(key);
          if (key === "message" && prop.type === "ObjectProperty") {
            const msg = literalValue(prop.value);
            if (typeof msg === "string" && msg.length < 160) messages.add(asciiClean(msg));
          }
        }
      }
    },
  });
  const pieces = [];
  if (keys.size) pieces.push(`JSON response fields observed in the handler include ${[...keys].slice(0, 14).map((k) => `\`${k}\``).join(", ")}${keys.size > 14 ? ", and others" : ""}.`);
  if (statuses.size) pieces.push(`Explicit status codes include ${[...statuses].sort().join(", ")}.`);
  if (messages.size) pieces.push([...messages][0]);
  return pieces.join(" ") || "Returns the handler result as JSON or an HTTP error response.";
}

function humanizeHandler(name) {
  if (!name || name === "inline handler") return "Processes the request using the inline route handler.";
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}.`;
}

function inferredRouteDescription(method, routePath) {
  const segments = routePath
    .split("/")
    .filter(Boolean)
    .filter((part) => !part.startsWith(":"))
    .map((part) => part.replace(/[-_]+/g, " "));
  const resource = (segments.join(" ") || "resource").replace(/\s+/g, " ");
  const last = segments.at(-1) || "resource";
  const actionMap = [
    [/^login$/, "Authenticates the user"],
    [/^logout$/, "Ends the current user session"],
    [/^issue$/, "Issues the requested item"],
    [/^return$/, "Records the requested item return"],
    [/^import$/, "Imports the supplied records"],
    [/^reserve$/, "Creates a reservation"],
    [/^cancel reservation$/, "Cancels a reservation"],
    [/^fulfill reservation$/, "Fulfills a reservation"],
    [/^approve/, "Approves the requested record"],
    [/^reject/, "Rejects the requested record"],
    [/^verify/, "Verifies the supplied information"],
    [/^send/, "Sends the requested information"],
    [/^resend/, "Resends the requested information"],
    [/^generate/, "Generates the requested resource"],
    [/^create/, "Creates the requested resource"],
    [/^submit/, "Submits the supplied information"],
    [/^publish/, "Publishes the requested resource"],
    [/^unpublish/, "Unpublishes the requested resource"],
    [/^start/, "Starts the requested operation"],
    [/^stop/, "Stops the requested operation"],
    [/^join/, "Joins the requested resource"],
    [/^leave/, "Leaves the requested resource"],
    [/^cancel/, "Cancels the requested operation"],
    [/^complete/, "Completes the requested operation"],
    [/^download/, "Downloads the requested resource"],
    [/^upload/, "Uploads the supplied resource"],
    [/^search/, "Searches the requested records"],
    [/^bulk/, "Processes the requested bulk operation"],
  ];
  for (const [pattern, sentence] of actionMap) {
    if (pattern.test(last)) return `${sentence}.`;
  }
  if (method === "GET") return `Retrieves ${resource}.`;
  if (method === "POST") return `Creates or processes ${resource}.`;
  if (method === "PUT" || method === "PATCH") return `Updates ${resource}.`;
  if (method === "DELETE") return `Deletes ${resource}.`;
  return `Processes ${resource}.`;
}

function roleSummary(middleware) {
  const joined = middleware.join(" ");
  const roles = new Set();
  for (const match of joined.matchAll(/require(?:Admission)?Role\s*\(([^)]*)\)/g)) {
    for (const role of match[1].matchAll(/["']([a-zA-Z0-9_-]+)["']/g)) roles.add(role[1]);
  }
  if (/requireSuperAdmin|isSuperAdmin|superAdminOnly/.test(joined)) roles.add("super_admin");
  if (roles.size) return [...roles].map((r) => `\`${r}\``).join(", ");
  if (/isAdmissionCandidate/.test(joined)) return "`admission_candidate`";
  if (/\bisParent\b/.test(joined)) return "`parent`";
  if (/requireClassroomOwner/.test(joined)) return "Authenticated classroom owner.";
  if (/requireClassroomMember/.test(joined)) return "Authenticated classroom member.";
  if (/enforceClassroomAccess/.test(joined)) return "Authenticated user with access to the classroom.";
  if (/isAuthenticated/.test(joined)) return "Any authenticated user, subject to organization, plan, and feature middleware listed below.";
  return "Public endpoint unless an upstream platform gate applies.";
}

function authSummary(middleware) {
  const relevant = middleware.filter((m) => /isAuthenticated|isAdmissionCandidate|\bisParent\b|require(?:Admission)?Role|requireOrganization|requirePasswordSet|requireClassroom|enforceClassroomAccess|attachInstitutionProfile/.test(m));
  if (!relevant.length) return "None at route level";
  return relevant.map((m) => `\`${m}\``).join(", ");
}

function combinePath(prefix, routePath) {
  if (routePath === "/") return prefix || "/";
  return `${prefix.replace(/\/$/, "")}/${String(routePath).replace(/^\//, "")}`.replace(/\/+/g, "/");
}

function extractRoutes(fileName, mounts) {
  const file = path.join(routesRoot, fileName);
  const ast = parseFile(file);
  const imports = extractImports(ast, file);
  const routes = [];
  const globalMiddleware = [];

  for (const stmt of ast.program.body) {
    if (stmt.type !== "ExpressionStatement" || stmt.expression.type !== "CallExpression") continue;
    const call = stmt.expression;
    if (call.callee.type !== "MemberExpression" || call.callee.object.type !== "Identifier" || call.callee.object.name !== "router") continue;
    const method = getPropertyName(call.callee.property)?.toLowerCase();
    if (method === "use" && typeof literalValue(call.arguments[0]) !== "string") {
      globalMiddleware.push(...call.arguments.flatMap(flattenArgs).map(middlewareLabel));
    }
  }

  traverse(ast, {
    CallExpression(p) {
      const n = p.node;
      if (n.callee.type !== "MemberExpression" || n.callee.object.type !== "Identifier" || n.callee.object.name !== "router") return;
      const method = getPropertyName(n.callee.property)?.toLowerCase();
      if (!["get", "post", "put", "patch", "delete"].includes(method)) return;
      const routePath = literalValue(n.arguments[0]);
      if (typeof routePath !== "string") return;
      const handlerArgs = n.arguments.slice(1).flatMap(flattenArgs);
      const handlerArg = handlerArgs.at(-1);
      const middlewareArgs = handlerArgs.slice(0, -1);
      const handler = resolveHandlerNode(file, imports, handlerArg);
      const fields = collectReqFields(handler.node);
      for (const param of routePath.matchAll(/:([A-Za-z0-9_]+)/g)) {
        if (!fields.params.has(param[1])) fields.params.set(param[1], { name: param[1], required: true, defaults: [], usages: [], localNames: [param[1]] });
        else fields.params.get(param[1]).required = true;
      }
      const prefixes = mounts.get(fileName) || [];
      const fullPaths = prefixes.length ? prefixes.map((prefix) => combinePath(prefix, routePath)) : [];
      const middleware = [...new Set([...globalMiddleware, ...middlewareArgs.map(middlewareLabel)])];
      const middlewareText = middleware.join(" ");
      const uploadMatch = middlewareText.match(/\.single\(["']([^"']+)["']\)/);
      if (uploadMatch && !fields.body.has(uploadMatch[1])) {
        fields.body.set(uploadMatch[1], { name: uploadMatch[1], required: false, defaults: [], usages: [middlewareText], localNames: [uploadMatch[1]] });
      }
      const sourceComment = commentFor(p.parentPath?.node || n);
      const handlerDescription = humanizeHandler(handler.name);
      const cleanedComment = sourceComment
        .replace(/^(GET|POST|PUT|PATCH|DELETE)\s+\S+\s*/i, "")
        .replace(/^[—-]\s*/, "")
        .trim();
      const inferredDescription = handler.name === "inline handler"
        ? inferredRouteDescription(method.toUpperCase(), routePath)
        : handlerDescription;
      const description = cleanedComment
        ? `${cleanedComment.replace(/[.\s]+$/, "")}. ${inferredDescription}`
        : inferredDescription;
      routes.push({
        method: method.toUpperCase(),
        routePath,
        fullPaths,
        mounted: prefixes.length > 0,
        middleware,
        roles: roleSummary(middleware),
        auth: authSummary(middleware),
        fields,
        description,
        response: extractResponse(handler.node),
        handlerName: handler.name,
        handlerSource: path.relative(repoRoot, handler.source).replace(/\\/g, "/"),
        sourceLine: n.loc?.start?.line || null,
      });
    },
  });
  routes.sort((a, b) => (a.sourceLine || 0) - (b.sourceLine || 0));
  return { fileName, file, mounts: mounts.get(fileName) || [], globalMiddleware, routes };
}

function tableForFields(title, fields) {
  if (!fields.size) return `**${title}:** None detected in the route or handler.\n`;
  const lines = [
    `**${title}:**`,
    "",
    "| Field | Type | Required | Description |",
    "|---|---|---|---|",
  ];
  for (const field of fields.values()) {
    lines.push(`| \`${field.name}\` | ${inferType(field)} | ${field.required ? "yes" : "no"} | ${fieldDescription(title.startsWith("Path") ? "params" : title.startsWith("Query") ? "query" : "body", field)} |`);
  }
  return lines.join("\n");
}

function renderDoc(fileName, domain, routeGroups) {
  const total = routeGroups.reduce((sum, group) => sum + group.routes.length, 0);
  const lines = [
    "---",
    `title: ${domain.title}`,
    `description: "Code-grounded Classgrid REST API reference for ${domain.title.toLowerCase()}"`,
    "---",
    "",
    `# ${domain.title}`,
    "",
    "This reference is generated from the current Express route definitions and their handlers. It documents route-level authentication and authorization; deployment-wide middleware may add further checks.",
    "",
    "## Conventions",
    "",
    "- Base API origin: `https://api.classgrid.in`",
    "- Authentication: authenticated routes use the Classgrid session/JWT recognized by `isAuthenticated`.",
    "- JSON is the default request and response format unless an endpoint explicitly accepts multipart data or redirects.",
    "- Path parameters are always required.",
    "- A field marked `no` means the static handler scan did not find a direct required-field check; business rules may still make it conditionally required.",
    "- Role checks can also accept `super_admin` through the shared authorization middleware where implemented.",
    "",
    `This document contains **${total} route definitions** from ${routeGroups.length} source file${routeGroups.length === 1 ? "" : "s"}.`,
    "",
  ];

  for (const group of routeGroups) {
    lines.push(`## ${group.fileName}`, "");
    if (group.mounts.length) {
      lines.push(`**Mounted at:** ${group.mounts.map((m) => `\`${m}\``).join(", ")}`, "");
    } else {
      lines.push("**Mount status:** This route file is not mounted by `server/api/index.js`. Its route-local definitions are included for completeness but are not currently reachable through the main API application.", "");
    }
    if (group.globalMiddleware.length) lines.push(`**File-wide middleware:** ${group.globalMiddleware.map((m) => `\`${m}\``).join(", ")}`, "");
    if (!group.routes.length) {
      lines.push("No HTTP endpoint definitions were found in this file.", "");
      continue;
    }
    lines.push("| Method | Path | Access |", "|---|---|---|");
    for (const route of group.routes) {
      const pathLabel = route.fullPaths.length ? route.fullPaths.map((p) => `\`${p}\``).join(" / ") : `route-local \`${route.routePath}\``;
      lines.push(`| ${route.method} | ${pathLabel} | ${route.roles.replace(/\|/g, "\\|")} |`);
    }
    lines.push("");

    for (const route of group.routes) {
      const headingPath = route.fullPaths[0] || `[unmounted] ${route.routePath}`;
      lines.push(`### ${route.method} ${headingPath}`, "");
      if (route.fullPaths.length > 1) lines.push(`**Aliases:** ${route.fullPaths.slice(1).map((p) => `\`${p}\``).join(", ")}`, "");
      lines.push(`**Auth:** ${route.auth}`, "");
      lines.push(`**Roles:** ${route.roles}`, "");
      lines.push(`**Middleware:** ${route.middleware.length ? route.middleware.map((m) => `\`${m}\``).join(", ") : "None at route level"}`, "");
      lines.push(`**What it does:** ${route.description}`, "");
      lines.push(tableForFields("Path parameters", route.fields.params), "");
      lines.push(tableForFields("Query parameters", route.fields.query), "");
      lines.push(tableForFields("Body", route.fields.body), "");
      lines.push(`**Response:** ${route.response}`, "");
      lines.push(`**Source:** \`server/src/routes/${group.fileName}:${route.sourceLine}\`; handler \`${route.handlerName}\` in \`${route.handlerSource}\`.`, "");
    }
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

const mounts = extractMounts();
const command = process.argv[2] || "summary";

if (command === "summary") {
  const summary = {};
  for (const [doc, domain] of Object.entries(domains)) {
    summary[doc] = domain.files.map((file) => {
      const group = extractRoutes(file, mounts);
      return { file, mounts: group.mounts, endpoints: group.routes.length, middleware: group.globalMiddleware };
    });
  }
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else if (command === "middleware") {
  const values = new Set();
  for (const domain of Object.values(domains)) {
    for (const file of domain.files) {
      for (const route of extractRoutes(file, mounts).routes) route.middleware.forEach((m) => values.add(m));
    }
  }
  process.stdout.write(`${[...values].sort().join("\n")}\n`);
} else if (command === "render") {
  const target = process.argv[3];
  if (!domains[target]) throw new Error(`Unknown document: ${target}`);
  const groups = domains[target].files.map((file) => extractRoutes(file, mounts));
  process.stdout.write(renderDoc(target, domains[target], groups));
} else if (command === "render-chunk") {
  const target = process.argv[3];
  const start = Math.max(0, Number.parseInt(process.argv[4] || "0", 10));
  const count = Math.max(1, Number.parseInt(process.argv[5] || "200", 10));
  if (!domains[target]) throw new Error(`Unknown document: ${target}`);
  const groups = domains[target].files.map((file) => extractRoutes(file, mounts));
  const lines = renderDoc(target, domains[target], groups).split("\n");
  process.stdout.write(lines.slice(start, start + count).join("\n"));
} else if (command === "line-count") {
  const target = process.argv[3];
  if (!domains[target]) throw new Error(`Unknown document: ${target}`);
  const groups = domains[target].files.map((file) => extractRoutes(file, mounts));
  process.stdout.write(String(renderDoc(target, domains[target], groups).split("\n").length));
} else {
  throw new Error(`Unknown command: ${command}`);
}
