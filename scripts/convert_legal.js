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
const fs = require('fs');

function parseMarkdownToPortableText(markdownText) {
    const blocks = [];
    const paragraphs = markdownText.split(/\n\n+/);

    for (const para of paragraphs) {
        let text = para.trim();
        if (!text) continue;

        // Strip simple markdown bold and italic for standard span
        // For simplicity, we just leave it or clean it up if needed. The prompt user just wants it structured.
        // Actually, if we want bold, we need to map marks. Let's just do plain text for spans for now, 
        // to keep it simple, but remove ### for headings.

        if (text.startsWith('### ')) {
            blocks.push({
                _type: 'block',
                style: 'h3',
                children: [{ _type: 'span', text: text.replace('###', '').trim(), marks: [] }]
            });
        } else if (text.startsWith('## ')) {
            blocks.push({
                _type: 'block',
                style: 'h2',
                children: [{ _type: 'span', text: text.replace('##', '').trim(), marks: [] }]
            });
        } else if (text.startsWith('- ') || text.startsWith('* ')) {
            // It's a list. Portable text handles lists by tagging blocks with listItem: 'bullet'.
            // Multiple lists might be separated by \n
            const listItems = text.split('\n');
            for (const item of listItems) {
                if (item.trim() === '') continue;
                blocks.push({
                    _type: 'block',
                    style: 'normal',
                    listItem: 'bullet',
                    children: [{ _type: 'span', text: item.replace(/^[-*]\s*/, '').trim(), marks: [] }]
                });
            }
        } else {
            // Check for internal list that didn't have \n\n spacing
            if (text.includes('\n- ')) {
               const lines = text.split('\n');
               let pAcc = [];
               for(let line of lines) {
                   if (line.startsWith('- ') || line.startsWith('* ')) {
                       if (pAcc.length > 0) {
                           blocks.push({
                               _type: 'block',
                               style: 'normal',
                               children: [{ _type: 'span', text: pAcc.join(' '), marks: [] }]
                           });
                           pAcc = [];
                       }
                       blocks.push({
                           _type: 'block',
                           style: 'normal',
                           listItem: 'bullet',
                           children: [{ _type: 'span', text: line.replace(/^[-*]\s*/, '').trim(), marks: [] }]
                       });
                   } else {
                       pAcc.push(line.trim());
                   }
               }
               if (pAcc.length > 0) {
                   blocks.push({
                       _type: 'block',
                       style: 'normal',
                       children: [{ _type: 'span', text: pAcc.join(' '), marks: [] }]
                   });
               }
            } else {
                // Just a normal paragraph
                // Strip markdown bold asterisks just to look cleaner, 
                // portable text bold needs markDefs which is too complex for this quick script.
                let cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/---/g, '').trim();
                
                if (cleanText) {
                    blocks.push({
                        _type: 'block',
                        style: 'normal',
                        children: [{ _type: 'span', text: cleanText, marks: [] }]
                    });
                }
            }
        }
    }
    return blocks;
}


function parseDoc(markdownPath, objName, topTitle) {
    if (!fs.existsSync(markdownPath)) return `export const ${objName} = { title: "${topTitle}", updated: "Last Updated: 20-04-2026", sections: [] };\n`;
    
    const content = fs.readFileSync(markdownPath, 'utf8');
    const parts = content.split('---');
    let mainContent = parts.length > 2 ? parts.slice(2).join('---').trim() : content;
    
    if (parts.length === 2 && !content.includes('## 1.')) {
        mainContent = parts[1].trim();
    }
    if (parts.length === 3 && parts[1].includes('Updated')) {
         mainContent = parts[2].trim();
    }
    
    const sections = [];
    const sectionChunks = mainContent.split('\n## ');
    
    if (sectionChunks[0] && !sectionChunks[0].startsWith('1.')) {
         let introText = sectionChunks[0].replace(/#/g, '').replace(/---/g, '').trim();
         if (introText) {
             sections.push({
                 heading: "Introduction",
                 content: parseMarkdownToPortableText(introText)
             });
         }
    }
    
    for (let i = 1; i < sectionChunks.length; i++) {
        const chunk = sectionChunks[i];
        const firstLineEnd = chunk.indexOf('\n');
        const title = chunk.substring(0, firstLineEnd).replace(/#/g, '').trim();
        const rawBody = chunk.substring(firstLineEnd).trim();
        
        sections.push({
            heading: title,
            content: parseMarkdownToPortableText(rawBody)
        });
    }
    
    return `export const ${objName} = ${JSON.stringify({
        title: topTitle,
        updated: "Last Updated: 20-04-2026",
        sections: sections
    }, null, 2)};\n`;
}

function run() {
    const out = [];
    out.push('// AUTOGENERATED FROM MARKDOWN FILES BY ANTIGRAVITY\n');
    out.push(parseDoc('docs/CLASSGRID_PRIVACY_POLICY.md', 'privacyPolicy', 'Privacy Policy'));
    out.push(parseDoc('docs/CLASSGRID_TERMS_OF_SERVICE.md', 'termsOfService', 'Terms of Service'));
    out.push(parseDoc('docs/CLASSGRID_SECURITY_POLICY.md', 'securityPolicy', 'Security Policy'));
    out.push(parseDoc('docs/CLASSGRID_COOKIE_POLICY.md', 'cookiePolicy', 'Cookie Policy'));
    out.push(parseDoc('docs/CLASSGRID_DISCLAIMER.md', 'disclaimerPolicy', 'Disclaimer'));

    fs.writeFileSync('C:\\Users\\nikhi\\OneDrive\\Documents\\classgrid_marketting\\content\\legal.ts', out.join('\n\n'));
    console.log("Successfully wrote to legal.ts with PortableText schema!");
}

run();
