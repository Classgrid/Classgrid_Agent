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

# COOKIE POLICY

**Classgrid — Educational Management Platform**
**Operated by: Classgrid Technologies, Pune, Maharashtra, India**
**Registered Address:** Akurdi Railway Station Road, Sector No. 26, Pradhikaran, Nigdi, Pimpri-Chinchwad, Maharashtra 411044, India
**Effective Date: 20-04-2026**
**Last Updated: 20-04-2026**

---

This Cookie Policy explains how Classgrid Technologies ("Company", "We", "Us", "Our") uses cookies and similar technologies on the Classgrid website ([classgrid.in](https://classgrid.in)), its sub-domain tenant websites (*.classgrid.in), and the Classgrid ERP Platform (collectively, the "Platform").

This Cookie Policy should be read together with Our [Privacy Policy](https://classgrid.in/legal/privacy-policy) and [Terms of Service](https://classgrid.in/legal/terms-of-service).

---

## 1. WHAT ARE COOKIES?

Cookies are small text files that are placed on Your device (computer, smartphone, tablet) when You visit a website. They are widely used to make websites work efficiently, provide a better user experience, and give website owners useful information.

### Types of Storage Technologies We Use:
- **Cookies** — Small text files stored in Your browser
- **Local Storage** — Browser-based storage that persists until explicitly cleared
- **Session Storage** — Browser-based storage that is cleared when the browser tab is closed
- **JWT Tokens** — Encrypted authentication tokens stored in browser memory or local storage

---

## 2. HOW WE USE COOKIES AND SIMILAR TECHNOLOGIES

We use cookies and similar technologies for the following purposes:

### 2.1 Strictly Necessary (Essential)
These are required for the Platform to function. Without these, You cannot log in, navigate, or use core features. **These cannot be disabled.**

| Cookie/Technology | Purpose | Duration | Type |
|---|---|---|---|
| `auth_token` (JWT) | Stores Your encrypted authentication session so You remain logged in | 1 Year (Mobile App default) | Local Storage |
| `refresh_token` | Used to silently refresh expired authentication tokens | 30 days | HTTP-Only Cookie |
| `csrf_token` | Protects against Cross-Site Request Forgery attacks | Session | Cookie |
| `session_id` | Maintains server-side session state | Session | Cookie |
| `tenant_slug` | Identifies which tenant website is being accessed | Session | Session Storage |
| `user_role` | Stores Your assigned role (student/faculty/admin) for RBAC enforcement | Session | Local Storage |
| `theme_preference` | Stores Your chosen theme (light/dark mode) | Persistent (1 year) | Local Storage |

### 2.2 Functional
These enhance Your experience by remembering preferences and settings. **You may disable these, but some features may not work optimally.**

| Cookie/Technology | Purpose | Duration | Type |
|---|---|---|---|
| `language_pref` | Remembers Your preferred language | 1 year | Local Storage |
| `sidebar_state` | Remembers if the dashboard sidebar is collapsed or expanded | Persistent | Local Storage |
| `notification_dismissed` | Tracks which notification banners You have dismissed | Session | Session Storage |
| `last_visited_page` | Remembers the last page You visited for navigation continuity | Session | Session Storage |
| `font_size_pref` | Stores Your preferred font size setting (accessibility feature) | Persistent | Local Storage |

### 2.3 Performance and Analytics
These help Us understand how Users interact with the Platform, identify errors, and improve performance. **No personally identifiable information is collected through these technologies.**

| Cookie/Technology | Purpose | Duration | Type |
|---|---|---|---|
| `_ga` / `_gid` (if enabled) | Google Analytics — anonymized page view tracking, session duration, device type | 2 years / 24 hours | Cookie |
| `error_log_session` | Captures frontend error logs for debugging | Session | Session Storage |
| `perf_metrics` | Stores page load performance data for monitoring | Session | Local Storage |

**Important:** We currently do **not** use Google Analytics or any third-party analytics cookies. If We decide to implement analytics in the future, this Policy will be updated, and You will be notified.

### 2.4 What We Do NOT Use
We want to be completely transparent:

- ❌ **No advertising cookies** — We do not serve ads on the Platform
- ❌ **No third-party tracking cookies** — We do not allow third-party advertisers to place cookies on the Platform
- ❌ **No social media tracking pixels** — We do not embed Facebook Pixel, Twitter Pixel, or any social media tracking
- ❌ **No cross-site tracking** — We do not track Your activity across other websites
- ❌ **No fingerprinting** — We do not use browser or device fingerprinting techniques
- ❌ **No retargeting** — We do not use cookies for retargeting or behavioral advertising

---

## 3. COOKIES ON TENANT WEBSITES

Tenant websites (e.g., collegename.classgrid.in) use a minimal set of cookies:

| Cookie/Technology | Purpose | Duration |
|---|---|---|
| `tenant_theme` | Stores the tenant's custom primary color for consistent rendering | Session |
| `visitor_session` | Anonymous session tracking for visitor count analytics (no PII) | Session |

Tenant websites do **not** place any third-party tracking, advertising, or analytics cookies unless the Tenant Organization has explicitly integrated external services (e.g., Google Analytics through custom code, which is not provided by Classgrid by default).

**Note:** If a tenant website embeds YouTube videos or Google Maps, those third-party services may set their own cookies. Please refer to [Google's Privacy Policy](https://policies.google.com/privacy) for details on their cookie practices.

---

## 4. COOKIES ON THE MOBILE APP

The Classgrid mobile application (Android/iOS) does **not** use traditional browser cookies. Instead, it uses:

- **Secure Token Storage** — Authentication tokens (JWT) are stored in the device's secure storage (Android Keystore / iOS Keychain)
- **App Preferences** — User preferences (theme, notification settings) are stored using the device's native preferences system (SharedPreferences on Android / UserDefaults on iOS)

These are functionally equivalent to cookies but are managed entirely within the mobile app's sandboxed environment and are not accessible by other apps or websites.

---

## 5. MANAGING YOUR COOKIE PREFERENCES

### 5.1 Browser Settings
You can control and manage cookies through Your browser settings. Most browsers allow You to:
- View what cookies are stored on Your device
- Delete individual cookies or all cookies
- Block all cookies or only third-party cookies
- Set preferences for specific websites

**Instructions for popular browsers:**
- **Google Chrome:** Settings → Privacy and Security → Cookies and other site data
- **Mozilla Firefox:** Settings → Privacy & Security → Cookies and Site Data
- **Safari:** Preferences → Privacy → Manage Website Data
- **Microsoft Edge:** Settings → Cookies and site permissions → Cookies and site data

### 5.2 Impact of Disabling Cookies
If You disable essential cookies:
- You will not be able to log in to the Platform
- The ERP dashboard will not function
- Tenant websites will load but without personalization

If You disable functional cookies:
- Your preferences (theme, sidebar state) will not be remembered
- You may need to reconfigure settings each time You visit

### 5.3 Local Storage and Session Storage
Unlike traditional cookies, Local Storage and Session Storage cannot be managed through standard browser cookie settings. To clear these:
- Open browser Developer Tools (F12)
- Navigate to Application → Local Storage / Session Storage
- Delete specific entries or clear all

---

## 6. DATA COLLECTED THROUGH COOKIES

### 6.1 What We Collect
Through essential and functional cookies, We may process:
- Your authentication status (logged in / logged out)
- Your user role (student, faculty, admin)
- Your UI preferences (theme, sidebar state, font size)
- The tenant website being accessed

### 6.2 What We Do NOT Collect
- No personal information (name, email, phone) is stored in cookies
- No browsing history beyond the Platform is tracked
- No cookies are used for profiling, advertising, or selling data

---

## 7. CHILDREN AND COOKIES

- Essential cookies are required for all Users, including minor students, to access the Platform
- No behavioral or profiling cookies are placed on minor students' devices
- The Platform complies with the DPDP Act 2023 requirements regarding children's data

---

## 8. THIRD-PARTY COOKIES

### 8.1 Current Third-Party Cookies
As of the date of this Policy, the Platform does **not** actively place any third-party cookies.

### 8.2 Embedded Content
Third-party cookies may be set by embedded content on tenant websites:
- **YouTube embeds** — YouTube (Google) may set cookies when a video is embedded. We use YouTube's privacy-enhanced mode (`youtube-nocookie.com`) where possible to minimize cookie usage.
- **Google Maps embeds** — Google Maps may set cookies when a map is embedded on the contact page.

We do not control these third-party cookies. Please refer to the respective third party's cookie policy for details.

---

## 9. CHANGES TO THIS COOKIE POLICY

We may update this Cookie Policy from time to time. When We make material changes:
- We will update the "Last Updated" date at the top
- We will notify Users through the Platform or via email for significant changes
- Your continued use of the Platform after changes constitutes acceptance

---

## 10. CONTACT US

For questions about this Cookie Policy or Our use of cookies, please contact:

**Classgrid Technologies**
- **Email:** privacy@classgrid.in
- **Support:** support@classgrid.in
- **Phone:** +91 8623947038 / +91 8149277038
- **Website:** [https://classgrid.in](https://classgrid.in)
- **Address:** Akurdi Railway Station Road, Sector No. 26, Pradhikaran, Nigdi, Pimpri-Chinchwad, Maharashtra 411044, India

---

*This Cookie Policy is an electronic record within the meaning of the Information Technology Act, 2000, and the rules made thereunder.*

*© 2026 Classgrid Technologies. All rights reserved.*
