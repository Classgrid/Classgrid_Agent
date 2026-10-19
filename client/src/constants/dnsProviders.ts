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

export type DnsProvider = {
  id: string;
  name: string;
  guideUrl: string;
  quirks?: string;
};

export const DNS_PROVIDERS: DnsProvider[] = [
  {
    id: "godaddy",
    name: "GoDaddy",
    guideUrl: "https://www.godaddy.com/help/add-an-a-record-19238",
    quirks: "Do not append your domain name to the Host field. Use exactly '@' or '_classgrid-verify'."
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    guideUrl: "https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/",
    quirks: "Crucial: Make sure the Proxy Status for the A record is set to 'DNS Only' (Gray Cloud). If it is set to 'Proxied' (Orange Cloud), the verification will fail."
  },
  {
    id: "namecheap",
    name: "Namecheap",
    guideUrl: "https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/",
    quirks: "Enter exactly '@' or '_classgrid-verify' in the Host field. Namecheap will automatically append your domain."
  },
  {
    id: "google_domains",
    name: "Google Domains / Google Workspace",
    guideUrl: "https://support.google.com/domains/answer/3290350",
    quirks: "Leave the 'Host name' field blank to represent the root domain (@)."
  },
  {
    id: "aws_route53",
    name: "AWS Route 53",
    guideUrl: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html",
    quirks: "Leave the Record Name blank for the apex/root domain."
  },
  {
    id: "hostinger",
    name: "Hostinger",
    guideUrl: "https://support.hostinger.com/en/articles/1583227-how-to-manage-my-dns-records-on-hpanel",
    quirks: "Use '@' for the root domain. Ensure no other A records exist for '@'."
  },
  {
    id: "bluehost",
    name: "Bluehost",
    guideUrl: "https://www.bluehost.com/help/article/dns-management-add-edit-or-delete-dns-entries",
    quirks: "Use '@' for the Host Record to point your root domain."
  },
  {
    id: "hostgator",
    name: "HostGator",
    guideUrl: "https://www.hostgator.com/help/article/how-to-change-dns-zones-mx-cname-and-a-records",
    quirks: "Use your bare domain (e.g. example.com) or '@' depending on the cPanel version."
  },
  {
    id: "wix",
    name: "Wix",
    guideUrl: "https://support.wix.com/en/article/adding-or-updating-a-records-in-your-wix-account",
    quirks: "Leave the Host Name field blank to point the root domain."
  },
  {
    id: "squarespace",
    name: "Squarespace",
    guideUrl: "https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-custom-DNS-records-to-your-Squarespace-domain",
    quirks: "Use '@' in the Host column for the root domain."
  },
  {
    id: "zoho",
    name: "Zoho",
    guideUrl: "https://www.zoho.com/mail/help/adminconsole/a-records.html",
    quirks: "Use '@' or leave the Host/Name field blank for the root domain."
  },
  {
    id: "other",
    name: "Other / Unlisted Provider",
    guideUrl: "https://vercel.com/docs/concepts/projects/domains/add-a-domain",
    quirks: "General Rule: Use '@' or leave the Name/Host field blank for the root domain. Do not type your domain name (e.g. use '_classgrid-verify', not '_classgrid-verify.example.com')."
  }
];
