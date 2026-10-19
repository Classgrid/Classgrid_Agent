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

# Custom Domains and Subdomains

> **Last updated:** July 17, 2026

This guide explains how institution IT administrators can use Classgrid's default subdomain, ERP login domain, and public website domain.

## Overview

Classgrid gives every organization a default address such as:

```text
https://institution.classgrid.in
```

You can keep using this address or connect domains that your institution owns. Custom domains make your ERP login and public website easier to brand and share.

There are two custom-domain options:

| Option | Purpose | Example | Portal links |
|---|---|---|---|
| ERP Login Portal Domain | Student, faculty, and department login | `erp.mycollege.edu` | Yes |
| Organization Website Domain | Public-facing institution website | `www.mycollege.edu` | No |

Your default Classgrid subdomain remains available as an administration and recovery address. It is not a custom DNS domain and does not require DNS changes at your provider.

### How the custom-domain flow works

1. You enter a domain in Domain Settings.
2. Classgrid normalizes the domain, checks its format, prevents `classgrid.in` domains from being registered as custom domains, and checks that another organization is not already using it.
3. Classgrid creates a unique verification token and shows the DNS records you must add.
4. You add the TXT and CNAME or A records at the provider that manages your DNS.
5. Classgrid checks the records using public DNS resolvers. Both the TXT record and the routing record must be correct.
6. After successful verification, Classgrid attaches the domain to the appropriate Vercel project when the deployment has Vercel integration configured. Vercel then provisions HTTPS/SSL.

## Prerequisites

Before you begin, make sure:

- Your account has the **Organization Admin** role.
- Your organization has the `custom_domain_module` feature enabled. If the Domain Settings cards do not appear, ask your Classgrid platform administrator to enable this module.
- You can edit DNS records for the domain at its DNS provider.
- You know whether you are configuring an ERP login domain or a public website domain.
- You are prepared to wait for DNS propagation. The Classgrid UI normally reports propagation as taking about 3–5 minutes, although some providers can take longer.

## Understanding Your Domain Options

### Default Classgrid Subdomain

Every organization can use a default URL in this format:

```text
https://{your-subdomain}.classgrid.in
```

For example:

```text
https://institution.classgrid.in
```

This address is managed by Classgrid. You do not add DNS records for it. The Domain Settings card includes the portal links for this address and an **Edit Domain** action for changing its subdomain.

Changing the subdomain changes the URL immediately. Existing links using the old address will stop being the organization URL, users are redirected to the new address where possible, the tenant cache is invalidated, and an email notification is sent to the administrator.

### ERP Login Portal Domain

The ERP Login Portal Domain is the branded address used by students, faculty, and department users to sign in. For example:

```text
https://erp.mycollege.edu
```

This domain is connected to the Classgrid platform application. After it is verified, the UI provides links for the organization admin, student, faculty, and department portals.

### Organization Website Domain

The Organization Website Domain is the public-facing website address. For example:

```text
https://www.mycollege.edu
```

This domain is connected to the Classgrid marketing/website project. It does not display ERP portal links in the Domain Settings card.

## Setting Up Your Custom Domain

### Step 1: Navigate to Domain Settings

Sign in as an Organization Admin and open the organization settings area that contains the **Custom Domains** cards.

You will see separate cards for:

- Your default Classgrid subdomain.
- **ERP Login Portal Domain**.
- Your organization, school, college, institute, academy, or polytechnic website domain.

### Step 2: Enter Your Domain

Choose the card for the feature you are configuring and enter the domain without a path. The safest format is:

```text
erp.mycollege.edu
```

or:

```text
www.mycollege.edu
```

Do not enter a login path such as `/student/login`. Do not use a domain under `classgrid.in`; Classgrid platform domains cannot be registered as customer custom domains.

Select **+ Add domain**. Classgrid creates a verification token and changes the domain to **Pending Verification**.

### Step 3: Configure DNS Records

Add both records shown in the Classgrid card at the DNS provider that manages your domain. The verification token is unique to your organization and domain, so copy the exact value shown in the card.

Use the apex/root configuration when the domain itself is the root, such as `mycollege.edu`. Use the subdomain configuration when the domain has a host label, such as `erp.mycollege.edu` or `www.mycollege.edu`.

#### DNS Records for Subdomain (for example, `erp.college.edu`)

For a subdomain, the application displays the host portion separately from the registered domain:

| Type | Name / Host | Value | TTL |
|---|---|---|---|
| TXT | `_classgrid-verify.erp` | `classgrid-verify={your-verification-token}` | 1 hour |
| CNAME | `erp` | `cname.classgrid.in` | 1 hour |

For a different host, replace `erp` in both names. For example, `www.mycollege.edu` uses `www` as the CNAME host and `_classgrid-verify.www` as the TXT name.

Some DNS providers automatically append the domain name. If your provider does this, enter only the host shown in the table; do not paste the complete fully qualified name into the Host field.

#### DNS Records for Apex/Root Domain (for example, `college.edu`)

For an apex domain, use an A record because standard DNS does not allow a normal CNAME at the root:

| Type | Name / Host | Value | TTL |
|---|---|---|---|
| TXT | `_classgrid-verify` | `classgrid-verify={your-verification-token}` | 1 hour |
| A | `@` | `76.76.21.21` | 1 hour |

The A record must be the only A record for `@`. Delete parked-domain or automatically added A records that point somewhere else. Multiple root A records can send visitors to a provider parking page or prevent the domain from routing correctly.

### Step 4: Select Your DNS Provider

In the DNS configuration panel, select your provider to see its in-app guidance and an official help link. The application lists these 11 named providers plus an **Other / Unlisted Provider** option:

- GoDaddy
- Cloudflare
- Namecheap
- Google Domains / Google Workspace
- AWS Route 53
- Hostinger
- Bluehost
- HostGator
- Wix
- Squarespace
- Zoho

Provider-specific notes are included later in this guide.

### Step 5: Verify Your Domain

After saving the records, return to Classgrid and select **Verify**.

Classgrid checks:

- The TXT record at `_classgrid-verify.{your-domain}` contains the exact value `classgrid-verify={your-verification-token}`.
- A CNAME points to an approved Classgrid or Vercel target, or an A record resolves to `76.76.21.21` for an apex domain.

The UI marks each record as it is found. During verification, it can poll automatically every 10 seconds. If the records have not propagated yet, the domain remains pending and you can wait before trying again.

When both records are found:

- The domain becomes verified.
- The verification time is recorded.
- For an ERP domain, its default Classgrid URL setting is changed to disabled as part of the white-label flow. The website domain has a separate configuration and does not change the ERP login switch.
- Classgrid attempts to attach the domain to the correct Vercel project when the required Vercel deployment configuration is available.

### Step 6: SSL Certificate Provisioning

After the domain is attached to Vercel, Vercel provisions the HTTPS certificate. Open the domain using:

```text
https://your-domain.example
```

Allow time for DNS and certificate provisioning. If HTTPS does not work after DNS is correct, see [SSL Certificate Not Provisioning](#ssl-certificate-not-provisioning).

## Managing Your Custom Domain

### Enable/Disable Custom Domain

On a verified domain card, use **Enable Custom Domain** to pause or resume traffic through that domain.

For an ERP domain:

- You cannot disable the ERP custom domain while the default Classgrid URL is also disabled; enable the Classgrid URL first so administrators are not locked out.
- Enabling the ERP custom domain while the Classgrid URL is active requires confirmation and disables the Classgrid URL to avoid two competing ERP login addresses.

For the website domain, the toggle controls whether the custom website domain is active. It does not provide the ERP Classgrid-URL switch.

### Enable/Disable Default Classgrid URL

The default Classgrid URL switch is available when a domain has been configured. Disabling it makes the ERP experience rely on the custom ERP domain for normal student, faculty, and department access.

> **Warning:** Before disabling the default Classgrid URL, save the emergency admin address. If the custom DNS expires or is misconfigured, students and staff may lose normal access through the custom domain.

The switch cannot be turned off unless an enabled custom ERP domain exists. Turning the Classgrid URL back on requires confirmation and automatically disables the active ERP custom domain.

### Emergency Admin Access

The Organization Admin portal is deliberately excluded from automatic domain enforcement. Keep this recovery URL:

```text
https://{your-subdomain}.classgrid.in/org/login
```

This path remains the emergency admin access route even when the ERP custom domain is enabled and the default Classgrid URL is disabled for other users.

### Portal Links

The ERP custom domain and default Classgrid subdomain provide these portal paths:

| Portal | Path |
|---|---|
| Org Admin | `/org/login` |
| Student | `/student/login` |
| Faculty | `/faculty/login` |
| Admissions | `/dept/admissions/login` |
| Fees | `/dept/fees/login` |
| Exams | `/dept/exams/login` |
| Attendance | `/dept/attendance/login` |
| HR & Payroll | `/dept/hr/login` |
| Hostel & Transport | `/dept/hostel/login` |
| Library | `/dept/library/login` |

For example, if your ERP domain is `erp.mycollege.edu`, the student URL is:

```text
https://erp.mycollege.edu/student/login
```

## Managing Your Classgrid Subdomain

### Editing Your Subdomain

In the default Classgrid subdomain card, open **Manage URL & View Links**, select **Edit Domain**, enter the new slug, and confirm the current domain when prompted.

The new URL is:

```text
https://{new-subdomain}.classgrid.in
```

The current page is redirected to the new URL after the change. Existing links using the old subdomain may no longer work, so update bookmarks, website links, and internal documentation.

### Subdomain Rules

The subdomain slug must:

- Be 3–30 characters long.
- Use lowercase letters, numbers, and hyphens only.
- Start and end with a letter or number, not a hyphen.
- Be unique across organizations.

Classgrid normalizes the value to lowercase before checking it.

### Reserved Subdomains

The following system names cannot be used:

```text
www, app, admin, api, dev, staging, mail, ftp, superadmin,
v1, v2, studio, docs, blog, help, support, status, cdn, static,
assets, test, demo, sandbox, classgrid, platform, dashboard
```

## DNS Provider-Specific Notes

The provider selector in the app shows these notes while you configure records. Provider dashboards can change their labels, so use the provider's current DNS help page if a field is named differently.

### GoDaddy

Use exactly `@` for the apex A record or `_classgrid-verify` for the TXT record. Do not append your domain name to the Host field. Remove any parked A records so `@` points only to `76.76.21.21`.

[GoDaddy DNS record guide](https://www.godaddy.com/help/add-an-a-record-19238)

### Cloudflare

Set the A record and verification records to **DNS Only** (gray cloud). Do not use **Proxied** (orange cloud) while verifying, because proxying can prevent the expected DNS response from being found.

[Cloudflare DNS record guide](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)

### Namecheap

Enter `@` or `_classgrid-verify` in the Host field. Namecheap appends the domain name automatically.

[Namecheap DNS record guide](https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/)

### Google Domains

For Google Domains / Google Workspace DNS, leave the Host name blank when creating a root-domain record.

[Google Domains DNS guide](https://support.google.com/domains/answer/3290350)

### AWS Route 53

Leave Record Name blank for an apex/root record. Use the host label for a subdomain record. Make sure the hosted zone is the authoritative zone for the domain.

[AWS Route 53 record guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html)

### Hostinger

Use `@` for the root domain and ensure no other A records exist for `@`.

[Hostinger DNS record guide](https://support.hostinger.com/en/articles/1583227-how-to-manage-my-dns-records-on-hpanel)

### Bluehost

Use `@` as the Host Record for the root domain.

[Bluehost DNS record guide](https://www.bluehost.com/help/article/dns-management-add-edit-or-delete-dns-entries)

### HostGator

Depending on the cPanel version, use your bare domain or `@` for the root host.

[HostGator DNS record guide](https://www.hostgator.com/help/article/how-to-change-dns-zones-mx-cname-and-a-records)

### Wix

Leave the Host Name field blank for the root domain.

[Wix A-record guide](https://support.wix.com/en/article/adding-or-updating-a-records-in-your-wix-account)

### Squarespace

Use `@` in the Host column for the root domain.

[Squarespace DNS record guide](https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-custom-DNS-records-to-your-Squarespace-domain)

### Zoho

Use `@`, or leave the Host/Name field blank, for the root domain.

[Zoho A-record guide](https://www.zoho.com/mail/help/adminconsole/a-records.html)

### Other / Unlisted Provider

For most providers, use `@` or leave the Name/Host field blank for the root domain. For the TXT record, use `_classgrid-verify`; do not enter `_classgrid-verify.example.com` if the provider appends the domain automatically.

[Vercel domain guide](https://vercel.com/docs/concepts/projects/domains/add-a-domain)

## How Domain Enforcement Works

When a custom ERP domain is active and the default Classgrid URL is disabled, Classgrid checks visits to `*.classgrid.in` for student, faculty, and department experiences.

If a user opens a Classgrid subdomain, the browser is redirected to:

```text
https://{custom-erp-domain}{same-path}{same-query-string}
```

For example, a visit to:

```text
https://institution.classgrid.in/student/login?campus=main
```

is redirected to the equivalent path on the active custom domain.

The `/org/` path is excluded from enforcement. This means the Organization Admin portal remains available at the default Classgrid URL for emergency recovery when custom DNS is unavailable.

## Removing a Custom Domain

Select the delete button on the domain card and confirm by typing the domain. Removal:

- Removes the domain configuration from the organization.
- Resets verification state and the domain settings.
- Restores `allow_classgrid_url` to `true` and the domain's `is_enabled` value to `true` in the stored configuration.
- Attempts to detach the domain from the appropriate Vercel project when Vercel integration is configured.
- Resets the organization's site title, favicon, campus photo, and primary/secondary brand colors to the Classgrid defaults in the current implementation.

> **Warning:** Removing the domain breaks access through that custom address. Users must use the default Classgrid URL until you add and verify a domain again. Removing a website domain also resets the branding values listed above.

## Troubleshooting

### Domain Not Verifying

Check each item:

1. The TXT value is exactly:

   ```text
   classgrid-verify={your-verification-token}
   ```

2. The TXT host is `_classgrid-verify` for an apex domain or `_classgrid-verify.{host}` for a subdomain.
3. A subdomain uses a CNAME to `cname.classgrid.in`.
4. An apex domain uses an A record at `@` pointing to `76.76.21.21`.
5. The provider did not append the domain twice to the Host field.
6. Cloudflare records are set to **DNS Only**.
7. No conflicting A records remain at `@`.

Wait a few minutes for propagation and select **Verify** again. Classgrid uses Cloudflare `1.1.1.1` and Google `8.8.8.8` resolvers for its check, so a local DNS cache can show a different result from the platform.

### SSL Certificate Not Provisioning

Confirm that:

- The domain is fully verified, not merely pending.
- The CNAME or A record still points to the required target.
- There are no proxy or parked-domain records interfering with the route.
- The domain is attached to the expected Vercel project by the deployment configuration.

After correcting DNS, wait for Vercel certificate provisioning and try the HTTPS address again.

### Users Can't Access Custom Domain

Confirm that the domain's **Enable Custom Domain** switch is on and that users are using the correct host and portal path. For an ERP domain, also check that the domain is not disabled because the organization switched back to the default Classgrid URL.

If only the Classgrid address is failing to redirect, check whether `allow_classgrid_url` is enabled. The Organization Admin URL under `/org/` is intentionally exempt from redirects.

### Locked Out of Admin Panel

Use the emergency admin URL:

```text
https://{your-subdomain}.classgrid.in/org/login
```

The admin path is not domain-enforced, so it remains the recovery route when the custom domain expires, DNS records are deleted, or the custom domain is disabled.

## FAQ

### Can I use both an ERP domain and a website domain?

Yes. They are separate configurations. The ERP domain serves login portals; the website domain serves the public institution website.

### Do I need to add DNS records for the default Classgrid subdomain?

No. Classgrid manages the `*.classgrid.in` address. DNS changes are required only for domains you own and are connecting as custom domains.

### Should I enter `https://` in the domain field?

Enter the hostname only, such as `erp.mycollege.edu`. Classgrid removes a leading HTTP/HTTPS scheme during registration, but omitting it avoids mistakes.

### Why do I need both TXT and CNAME/A records?

The TXT record proves that you control the DNS zone. The CNAME or A record routes the domain's traffic to Classgrid/Vercel. Both checks must pass before the domain is verified.

### Can I use a CNAME for the root domain?

Use the A record shown by Classgrid for an apex/root domain. Use the CNAME record for a host such as `erp.mycollege.edu` or `www.mycollege.edu`.

### What happens if I disable the default Classgrid URL?

Normal ERP users are expected to use the active custom ERP domain. The `/org/login` Organization Admin route remains available on the default Classgrid subdomain as an emergency path.

### What happens if I remove the domain and add it again later?

You receive a new verification configuration and must configure DNS verification again. The current removal flow also resets the stored branding fields to Classgrid defaults.
