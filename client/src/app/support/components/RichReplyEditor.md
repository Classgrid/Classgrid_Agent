<!-- CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK) -->
<!--
─────────────────────────────────────────────────────────
🚨 HOSTING & ARCHITECTURE RULE 🚨
1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
2. FRONTEND IS HOSTED ON VERCEL
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 NAMING CONVENTION RULE 🚨
1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 CRITICAL AI AND SYSTEM RULES 🚨
1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
─────────────────────────────────────────────────────────
-->

# Rich Text Editor Architecture & Terminology

> [!NOTE]
> This document explains the architecture of the `RichReplyEditor.tsx` component used across both the Classgrid Marketing repository and the Classgrid Platform (Superadmin) repository. 

## 1. Architectural Comparison (Marketing vs. Platform)

After deeply analyzing both codebases, **the Rich Text Editor in the Marketing repo and the Platform (Superadmin) repo are functionally identical.** 

They both use the exact same underlying technology, UI components, and keyboard event handlers. They share the same robust design, meaning the platform editor is already utilizing the "best" version from the marketing side.

### Why is it built this way?
Most modern web applications use heavy, third-party frameworks to handle rich text (like TipTap, ProseMirror, Slate.js, or Quill). 

However, importing one of those libraries adds hundreds of kilobytes to the application bundle, which slows down the initial page load. Instead of using a bloated library, the Classgrid `RichReplyEditor` is a **Zero-Dependency Native Editor**. It leverages the browser's built-in APIs to be blazing fast and extremely lightweight.

---

## 2. Core Terminology & Technologies

If you or another AI agent ever needs to modify this editor in the future, you must understand the native browser APIs it relies on. 

### `contentEditable`
The core of the editor is a standard HTML `<div>` with the `contentEditable` attribute applied. This tells the browser: "Allow the user to type inside this div as if it were an input field, but allow HTML tags inside it."

### `document.execCommand()`
This is the native browser API used to format text inside a `contentEditable` div. When the user clicks the "Bold" button, the editor runs:
```javascript
document.execCommand("bold");
```
The browser automatically finds the highlighted text and wraps it in `<b>` or `<strong>` tags. The editor uses this for Bold, Italic, Underline, Lists, Blockquotes, and Text Alignment.

### `window.getSelection()` and `Range`
To know exactly where the user's cursor is (or what text they have highlighted), the editor uses the `window.getSelection()` API. A **Range** represents the specific start and end points of that selection.
- **Why it matters:** When the user clicks "Insert Link", the editor saves the `Range` so it remembers exactly where the cursor was before the Link Modal popped up.

### Tailwind Typography (`prose`)
Instead of writing custom CSS for every single HTML element (like `<h1>`, `<ul>`, `<blockquote>`), the editor relies on the `@tailwindcss/typography` plugin. By simply adding the class `prose prose-sm dark:prose-invert` to the editor div, Tailwind automatically styles all the native HTML output beautifully.

---

## 3. Advanced Custom Behaviors

Because native `contentEditable` can be quirky, the editor includes a massive custom `handleKeyDown` function to "fix" default browser behaviors and add modern features:

> [!TIP]
> **Markdown Auto-formatting:** If a user types `- ` or `1. ` and presses Space, the `handleKeyDown` function intercepts it, deletes the characters, and triggers `document.execCommand("insertUnorderedList")` to instantly convert it into a real bulleted list (just like Notion or Slack).

> [!TIP]
> **Smart Enter Key:** Pressing `Enter` usually submits the reply. But if the user's cursor is *inside a bulleted list*, the editor intercepts the `Enter` key to create a new list item instead of submitting the form.

> [!IMPORTANT]
> **Paste Preservation:** When a user copies rich text from ChatGPT or Google Docs, the `handlePaste` function intercepts it and uses `insertHTML` to safely paste the rich structure into the editor, preventing formatting loss.

---

## 4. How Attachments & Images Work

- **Inline Images:** When an image is selected, it is immediately uploaded to Supabase Storage via `uploadToSupabase`. Once the URL is returned, an `<img>` tag is injected directly into the HTML where the cursor was using `document.execCommand("insertHTML")`.
- **File Attachments:** Non-image files (PDFs, Docs) are not injected into the text. Instead, they are kept in a standard React state array (`const [files, setFiles] = useState([])`) and rendered as a list of pills below the editor toolbar.

## Conclusion
You do not need to study heavy external libraries to maintain this component. It is a masterpiece of native DOM manipulation. Any future edits should focus on intercepting events in `handleKeyDown` or managing native browser selections via `window.getSelection()`.
