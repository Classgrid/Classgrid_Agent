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

type StatTileProps = {
  label: string;
  value: string;
  meta?: string;
};

type TableColumn = {
  key: string;
  label: string;
};

type TablePanelProps = {
  title: string;
  actions?: string[];
  columns: TableColumn[];
  rows: Record<string, string>[];
};

type ActivityEntry = {
  label: string;
  time?: string;
  detail?: string;
};

type ActivityFeedProps = {
  title: string;
  entries: Array<string | ActivityEntry>;
  cta?: string;
};

export function StatTile({ label, value, meta }: StatTileProps) {
  return (
    <article className=" ">
      <p className="">{label}</p>
      <strong className="">{value}</strong>
      {meta ? <small className="">{meta}</small> : null}
    </article>
  );
}

export function TablePanel({ title, actions = [], columns, rows }: TablePanelProps) {
  return (
    <article className="">
      <div className="">
        <div>
          <h3>{title}</h3>
          {actions.length > 0 ? (
            <div className="">
              {actions.map((action) => (
                <span key={action} className="">
                  {action}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <table className="">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={`${title}-${rowIdx}`}>
              {columns.map((column) => (
                <td key={`${rowIdx}-${column.key}`}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export function ActivityFeed({ title, entries, cta }: ActivityFeedProps) {
  return (
    <article className="">
      <div className="">
        <h3>{title}</h3>
        {cta ? <small className="">{cta}</small> : null}
      </div>

      <ul className="">
        {entries.map((entry) => {
          const item =
            typeof entry === "string"
              ? { label: entry }
              : entry;

          return (
            <li key={`${item.label}-${item.time ?? "item"}`} className="">
              <div className="">
                <span>{item.label}</span>
                {item.detail ? <small>{item.detail}</small> : null}
              </div>
              {item.time ? <small className="">{item.time}</small> : null}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
