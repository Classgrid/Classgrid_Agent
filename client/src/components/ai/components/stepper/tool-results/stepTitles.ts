// Titles for the special step views (code, database, files, web, email, PDF, CDN) that say what this step
// actually did — "Ran Python: draw a bar chart of sales" — instead of the same "Executing Code" every time.

type Status = 'loading' | 'success' | 'error';

const firstLine = (s: unknown) => String(s ?? '').split('\n').map((l) => l.trim()).find(Boolean) ?? '';
const fileNameOf = (url: unknown) => {
  const raw = String(url ?? '').split('?')[0]!.split('/').filter(Boolean).pop() ?? '';
  try { return decodeURIComponent(raw); } catch { return raw; }
};
const hostOf = (url: unknown) => { try { return new URL(String(url)).host.replace(/^www\./, ''); } catch { return ''; } };

/** What a piece of code does, in a few words: its first comment, else what it clearly works with */
const CODE_HINTS: Array<[RegExp, string]> = [
  [/pip install|npm install|apt-get install|yarn add/, 'install packages'],
  [/plt\.|matplotlib|seaborn|\.plot\(|plotly/, 'draw a chart'],
  [/to_excel|openpyxl|xlsxwriter/, 'make an Excel file'],
  [/\bFPDF\b|fpdf|reportlab|\.pdf['"]/, 'make a PDF'],
  [/python-docx|\bDocument\(\)|\.docx['"]/, 'make a Word file'],
  [/pptx|Presentation\(/, 'make a PowerPoint'],
  [/ffmpeg|moviepy|pydub/, 'process audio or video'],
  [/\bPIL\b|Image\.open|cv2\./, 'edit an image'],
  [/sklearn|\.fit\(|torch|tensorflow/, 'train a model'],
  [/read_csv|read_excel|pd\.read_|json\.load/, 'read the data'],
  [/requests\.(get|post)|fetch\(|urllib|axios|curl /, 'fetch from the web'],
  [/zipfile|make_archive|\bzip -/, 'zip files'],
  [/open\([^)]*['"][wa]/, 'write a file'],
  [/print\(|console\.log|echo /, 'work it out and print the result'],
];

export function describeCode(code: unknown): string {
  const src = String(code ?? '');
  const comment = src.split('\n').map((l) => l.trim()).find((l) => /^(#|\/\/)\s*\S/.test(l) && !/^#!|coding[:=]|-\*-|eslint|@ts-/.test(l));
  if (comment) return comment.replace(/^(#|\/\/)\s*/, '').replace(/[.:]+$/, '');
  for (const [re, phrase] of CODE_HINTS) if (re.test(src)) return phrase;
  const line = src.split('\n').map((l) => l.trim()).find((l) => l && !/^(import|from|const .*require|#|\/\/)/.test(l));
  return line ?? '';
}

const LANG: Record<string, string> = { python: 'Python', javascript: 'JavaScript', js: 'JavaScript', node: 'JavaScript', bash: 'a command', sh: 'a command' };

const exitFailed = (result: unknown) => {
  const code = String(result ?? '').match(/EXIT CODE:\s*(-?\d+)/)?.[1];
  return code !== undefined && code !== '0';
};

const DB_VERB: Record<string, [string, string]> = {
  find: ['Looking up', 'Looked up'], findOne: ['Looking up', 'Looked up'], countDocuments: ['Counting', 'Counted'], count: ['Counting', 'Counted'],
  distinct: ['Listing', 'Listed'], aggregate: ['Analysing', 'Analysed'], insert: ['Adding to', 'Added to'], update: ['Updating', 'Updated'], delete: ['Deleting from', 'Deleted from'],
};

/** Title for one of the special step views, or null to keep the old title */
export function specialStepTitle(tool: string, args: any, result: unknown, status: Status): string | null {
  const a = args ?? {};
  const loading = status === 'loading';
  switch (tool) {
    case 'run_code': {
      const lang = LANG[String(a.language ?? '').toLowerCase()] ?? 'code';
      const what = describeCode(a.code);
      const tail = what ? `: ${what}` : '';
      if (loading) return `Running ${lang}${tail}`;
      if (status === 'error' || exitFailed(result)) return `${lang === 'a command' ? 'Command' : lang} failed${tail}`;
      return `Ran ${lang}${tail}`;
    }
    case 'execute_terminal_command': {
      const what = firstLine(a.description) || firstLine(a.command);
      const tail = what ? `: ${what}` : '';
      if (loading) return `Running a command${tail}`;
      if (status === 'error' || exitFailed(result)) return `Command failed${tail}`;
      return `Ran a command${tail}`;
    }
    case 'unified_db_query': {
      const [ing, past] = DB_VERB[String(a.operation ?? '')] ?? ['Querying', 'Queried'];
      const where = a.collectionOrTable ? ` ${a.collectionOrTable}` : ' the database';
      return `${loading ? ing : past}${where}`;
    }
    case 'parse_document': {
      const name = fileNameOf(a.url) || 'document';
      const part = a.part && Number(a.part) > 1 ? ` (part ${a.part})` : '';
      return `${loading ? 'Reading' : 'Read'} ${name}${part}`;
    }
    case 'search_web':
      return a.query ? `${loading ? 'Searching' : 'Searched'} the web for "${firstLine(a.query)}"` : null;
    case 'search_knowledge_base':
      return a.query ? `${loading ? 'Searching' : 'Searched'} the knowledge base for "${firstLine(a.query)}"` : null;
    case 'open_url': {
      const host = hostOf(a.url);
      if (!host) return null;
      return loading ? `Opening ${host}` : status === 'error' ? `Couldn't open ${host}` : `Opened ${host}`;
    }
    case 'generate_pdf':
    case 'generate_pdf_from_db':
      return a.title ? `${loading ? 'Making PDF' : 'Made PDF'}: ${firstLine(a.title)}` : null;
    case 'upload_file_to_cdn':
      return a.fileName ? `${loading ? 'Uploading' : 'Uploaded'} ${firstLine(a.fileName)}` : null;
    default:
      return null;
  }
}

/** "Drafted email to x: subject" / "Sent email to x" */
export function emailTitle(args: any, sent: boolean, status: Status): string | null {
  const to = firstLine(args?.to);
  if (!to) return null;
  if (sent) return `Sent email to ${to}`;
  const subject = firstLine(args?.subject);
  return `${status === 'success' ? 'Drafted' : 'Drafting'} email to ${to}${subject ? `: ${subject}` : ''}`;
}
