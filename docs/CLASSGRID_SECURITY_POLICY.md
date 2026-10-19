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

# SECURITY POLICY

**Classgrid — Educational Management Platform**
**Operated by: Classgrid Technologies, Pune, Maharashtra, India**
**Registered Address:** Akurdi Railway Station Road, Sector No. 26, Pradhikaran, Nigdi, Pimpri-Chinchwad, Maharashtra 411044, India
**Effective Date: 20-04-2026**
**Last Updated: 20-04-2026**

---

At Classgrid Technologies ("Company", "We", "Us", "Our"), the security of Your data is Our highest priority. This Security Policy describes the technical and organizational measures We implement to protect the Classgrid Platform, its infrastructure, and all data processed through it.

This Policy covers all components of the Platform including the website (classgrid.in), tenant websites (*.classgrid.in), the ERP system, mobile applications, APIs, and backend infrastructure.

---

## TABLE OF CONTENTS

1. [Our Security Commitment](#1-our-security-commitment)
2. [Infrastructure Security](#2-infrastructure-security)
3. [Application Security](#3-application-security)
4. [Data Encryption](#4-data-encryption)
5. [Authentication and Access Control](#5-authentication-and-access-control)
6. [API Security](#6-api-security)
7. [Mobile Application Security](#7-mobile-application-security)
8. [Database Security](#8-database-security)
9. [File Storage Security](#9-file-storage-security)
10. [Network Security](#10-network-security)
11. [Organizational Security](#11-organizational-security)
12. [Data Backup and Recovery](#12-data-backup-and-recovery)
13. [Incident Response](#13-incident-response)
14. [Vulnerability Management](#14-vulnerability-management)
15. [Compliance](#15-compliance)
16. [Tenant Data Isolation](#16-tenant-data-isolation)
17. [Third-Party Security](#17-third-party-security)
18. [User Security Best Practices](#18-user-security-best-practices)
19. [Responsible Disclosure](#19-responsible-disclosure)
20. [Contact](#20-contact)

---

## 1. OUR SECURITY COMMITMENT

We are committed to protecting the confidentiality, integrity, and availability (CIA) of all data entrusted to Us. Given that Our Platform handles sensitive educational data — including data of minor students — We apply security measures that meet or exceed industry standards for EdTech platforms.

### Security Principles:
- **Defense in Depth** — Multiple layers of security controls at every level
- **Least Privilege** — Users and systems are granted only the minimum access required
- **Zero Trust** — Every request is authenticated and authorized, regardless of origin
- **Data Minimization** — We collect and retain only the data necessary for Platform functionality
- **Transparency** — This document openly describes Our security practices

---

## 2. INFRASTRUCTURE SECURITY

### 2.1 Cloud Infrastructure
The Platform is hosted on enterprise-grade cloud infrastructure:

| Component | Provider | Security Certifications |
|---|---|---|
| **Frontend & ERP Hosting** | Vercel | SOC 2 Type II, ISO 27001 |
| **API & Auth Management** | Google Cloud Platform | SOC 1/2/3, ISO 27001, ISO 27017, ISO 27018, PCI DSS |
| **Primary Database** | MongoDB Atlas | SOC 2 Type II, ISO 27001, HIPAA |
| **File & Media Storage** | AWS (via Supabase) | SOC 2 Type II, ISO 27001 |
| **Google Authentication** | Google Identity | SOC 2, ISO 27001 |
| **Push Notifications** | Firebase (Google) | SOC 1/2/3, ISO 27001 |
| **Payment Processing** | Razorpay | PCI DSS Level 1 |

### 2.2 Server Hardening
- All servers run on managed, auto-patched cloud infrastructure
- No direct SSH access to production servers from the public internet
- All administrative access is through secure, authenticated cloud consoles with MFA
- Unused ports and services are disabled
- Operating system and runtime environments are kept up-to-date

### 2.3 Environment Isolation
- **Production**, **Staging**, and **Development** environments are strictly isolated
- Production credentials and API keys are never used in non-production environments
- Environment variables and secrets are managed through secure secret management services, never committed to source code

---

## 3. APPLICATION SECURITY

### 3.1 Secure Development Practices
- Code reviews are required for all changes to the main codebase
- Security-sensitive code undergoes additional review
- Dependencies are regularly audited for known vulnerabilities using automated tools (npm audit, Snyk)
- We follow the OWASP Top 10 guidelines for web application security

### 3.2 Protection Against Common Attacks

| Attack Vector | Protection Measure |
|---|---|
| **SQL/NoSQL Injection** | Parameterized queries, Mongoose ODM with schema validation, input sanitization |
| **Cross-Site Scripting (XSS)** | Output encoding, Content Security Policy (CSP) headers, React's built-in XSS protection |
| **Cross-Site Request Forgery (CSRF)** | CSRF tokens for state-changing operations, SameSite cookie attributes |
| **Broken Authentication** | JWT with expiration, secure password hashing (bcrypt), rate-limited login attempts |
| **Security Misconfiguration** | Automated security header checks, Helmet.js middleware, no default credentials |
| **Sensitive Data Exposure** | HTTPS everywhere, encrypted storage, no sensitive data in URLs or logs |
| **Broken Access Control** | Role-based access control (RBAC) at API and UI level, server-side authorization checks |
| **Server-Side Request Forgery (SSRF)** | URL validation, allowlist-based external requests |
| **Denial of Service (DoS)** | Rate limiting, request size limits, DDoS protection via CDN |
| **Insecure Deserialization** | Input validation, schema-based data parsing |

### 3.3 Security Headers
All web responses include the following security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: [configured per deployment]
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 4. DATA ENCRYPTION

### 4.1 Encryption in Transit
- All data transmitted between Users and the Platform is encrypted using **TLS 1.2 or higher**
- HTTPS is enforced across all domains and sub-domains (classgrid.in, *.classgrid.in)
- HTTP Strict Transport Security (HSTS) is enabled with preloading
- API-to-database connections use encrypted TLS connections
- Internal service-to-service communication uses encrypted channels

### 4.2 Encryption at Rest
- **Database (MongoDB Atlas):** All data is encrypted at rest using AES-256 encryption
- **File Storage (Supabase):** All uploaded files are encrypted at rest using server-side encryption (AES-256)
- **Backups:** All database backups are encrypted at rest

### 4.3 Password Security
- User passwords are never stored in plain text
- Passwords are hashed using **bcrypt** with a minimum of 10 salt rounds
- We enforce minimum password complexity requirements
- Password reset tokens are cryptographically random, single-use, and expire within 1 hour

---

## 5. AUTHENTICATION AND ACCESS CONTROL

### 5.1 Authentication Methods
- **Email + Password** — Standard authentication with bcrypt-hashed passwords
- **Google Sign-In** — OAuth 2.0 based authentication via Google Identity
- **JWT Tokens** — Stateless authentication tokens with configurable expiration

### 5.2 Token Security
- **Access Tokens (JWT):** Short-lived (1 hour default), signed with a secure secret
- **Refresh Tokens:** Longer-lived (30 days), stored as HTTP-only cookies, rotated on use
- Tokens contain only the minimum claims necessary (user ID, role, organization ID)
- Token secrets are rotated periodically
- Revoked tokens are blacklisted

### 5.3 Role-Based Access Control (RBAC)
The Platform enforces strict RBAC at both the API and UI levels:

| Action | Super Admin | Org Admin | Faculty | Student | Parent |
|---|---|---|---|---|---|
| Manage all organizations | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage own organization | ❌ | ✅ | ❌ | ❌ | ❌ |
| Create/delete user accounts | ✅ | ✅ (own org) | ❌ | ❌ | ❌ |
| Enter grades/attendance | ❌ | ✅ | ✅ (own classes) | ❌ | ❌ |
| View own academic data | ❌ | ❌ | ❌ | ✅ | ✅ (ward only) |
| Manage tenant website | ❌ | ✅ | ❌ | ❌ | ❌ |
| Access super admin dashboard | ✅ | ❌ | ❌ | ❌ | ❌ |

- All API endpoints validate the requesting User's role before executing
- Role escalation is not possible through the API
- Org Admins can only access data within their own organization

### 5.4 Brute Force Protection
- Login attempts are rate-limited (maximum 5 failed attempts per 15-minute window)
- After exceeding the limit, the account is temporarily locked for 15 minutes
- Repeated lockouts trigger security notifications via email
- CAPTCHA may be presented after multiple failed login attempts

### 5.5 Session Management
- Sessions are invalidated upon password change
- Users can view and revoke active sessions
- Inactive sessions expire automatically
- Logout clears all tokens and session data from the client

---

## 6. API SECURITY

### 6.1 API Authentication
- All API endpoints (except public tenant resolution) require a valid JWT token
- Tokens are validated on every request, checking expiration, signature, and claims
- Public endpoints (tenant website resolution) are read-only and do not expose sensitive data

### 6.2 Rate Limiting
- API requests are rate-limited per user and per IP address
- Standard limits: 100 requests per minute per authenticated user
- Public endpoints: 30 requests per minute per IP address
- File upload endpoints: 10 requests per minute per user
- Rate-limited responses return HTTP 429 with appropriate retry-after headers

### 6.3 Input Validation
- All API inputs are validated against predefined schemas (using Joi/Zod or Mongoose validation)
- Request body size limits are enforced (default: 10MB for standard requests, 50MB for file uploads)
- File uploads are validated for type (MIME type checking), size, and content
- URL parameters and query strings are sanitized

### 6.4 API Versioning
- APIs are versioned to ensure backward compatibility
- Deprecated API endpoints are announced with at least 90 days notice

---

## 7. MOBILE APPLICATION SECURITY

### 7.1 Secure Storage
- Authentication tokens are stored in platform-native secure storage:
  - **Android:** Android Keystore System
  - **iOS:** iOS Keychain Services
- Sensitive data is never stored in plain text on the device

### 7.2 Network Security
- The mobile app communicates exclusively over HTTPS
- Certificate pinning is implemented to prevent man-in-the-middle attacks
- The app validates server certificates before transmitting data

### 7.3 App Security
- The app does not log sensitive information (tokens, passwords, personal data) to device logs
- Debug features are disabled in production builds
- The app enforces minimum OS version requirements to ensure availability of security patches
- ProGuard/R8 obfuscation is applied to Android builds

### 7.4 Permissions
- The app requests only the minimum permissions necessary for its features
- Permissions are requested at the time of use, not at install time
- The app functions with reduced capability if optional permissions are denied

---

## 8. DATABASE SECURITY

### 8.1 MongoDB Atlas Security
- Hosted on MongoDB Atlas with enterprise-grade security
- **Network Access:** Database access is restricted to known, allowlisted IP addresses and VPCs
- **Authentication:** Database access requires authenticated credentials (not default admin accounts)
- **Encryption:** AES-256 encryption at rest, TLS encryption in transit
- **Audit Logging:** All database access and operations are logged
- **Automatic Patching:** MongoDB Atlas automatically applies security patches

### 8.2 Data Validation
- All data is validated at the application layer (Mongoose schemas) before being written to the database
- Database queries use parameterized inputs to prevent NoSQL injection
- Indexes are used to optimize query performance and prevent denial-of-service through slow queries

### 8.3 Access Controls
- Database credentials are stored in environment variables, never in source code
- Application-level database users have the minimum required permissions
- Direct database access is restricted to authorized DevOps personnel only, with full audit logging

---

## 9. FILE STORAGE SECURITY

### 9.1 Supabase Storage
- Files are stored in Supabase Storage (backed by AWS S3)
- **Access Control:** Storage buckets use row-level security (RLS) policies
- **Public Buckets:** Only tenant website assets (gallery images, hero images) are in public buckets
- **Private Buckets:** Student documents, PDFs, assignments, and institutional files are in private, authenticated buckets
- **Encryption:** Server-side encryption (AES-256) for all stored files

### 9.2 File Upload Security
- Uploaded files are validated for:
  - **File type:** Only allowed MIME types are accepted (images: jpg/png/webp, documents: pdf/doc/docx, video: mp4)
  - **File size:** Maximum limits enforced (images: 5MB, documents: 25MB, hero video: 20MB)
  - **File content:** Magic byte validation to prevent disguised malicious files
- Uploaded files are scanned for malware where feasible
- File names are sanitized and stored with generated UUIDs to prevent path traversal attacks

### 9.3 Download Security
- Private files require valid authentication to download
- Signed URLs with expiration times are used for temporary access to private files
- Download links cannot be shared or used after expiration

---

## 10. NETWORK SECURITY

### 10.1 DDoS Protection
- The Platform is served through CDN (Vercel Edge Network / Cloudflare) with built-in DDoS mitigation
- Layer 3/4 attacks are automatically mitigated by the CDN provider
- Layer 7 attacks are mitigated through rate limiting and request filtering

### 10.2 Firewall and Network Controls
- Web Application Firewall (WAF) rules are configured to block common attack patterns
- Geolocation-based blocking is available if needed
- All inbound traffic is filtered and monitored

### 10.3 DNS Security
- DNS is managed through providers with DNSSEC support
- DNS records are monitored for unauthorized changes

---

## 11. ORGANIZATIONAL SECURITY

### 11.1 Personnel Security
- All team members undergo security awareness training
- Access to production systems is granted based on job responsibility and revoked upon role change or departure
- All team members are bound by Non-Disclosure Agreements (NDAs) and confidentiality clauses
- The principle of least privilege is enforced for all internal access

### 11.2 Access Management
- Multi-Factor Authentication (MFA) is mandatory for all team members accessing production systems
- Access reviews are conducted periodically to ensure ongoing necessity
- Privileged access (database, cloud console) is limited to designated DevOps personnel
- All administrative actions are logged and auditable

### 11.3 Physical Security
- We do not operate our own data centers; physical security is managed by Our cloud providers (Google Cloud, MongoDB Atlas, AWS)
- All cloud providers maintain SOC 2 Type II compliance, which includes physical security controls
- Company devices used for production access have full-disk encryption enabled

---

## 12. DATA BACKUP AND RECOVERY

### 12.1 Backup Strategy
- **Continuous Backups:** MongoDB Atlas provides continuous backups with point-in-time recovery
- **Snapshot Frequency:** Full database snapshots every 6 hours
- **Retention:** Backups retained for 30 days (rolling)
- **Backup Encryption:** All backups are encrypted at rest using AES-256

### 12.2 Disaster Recovery
- **Recovery Point Objective (RPO):** Maximum 1 hour of data loss in worst-case scenario
- **Recovery Time Objective (RTO):** Platform restoration within 4 hours of a critical incident
- **Geographic Redundancy:** Database replicas are maintained across multiple availability zones
- **Regular Testing:** Disaster recovery procedures are tested periodically

### 12.3 Data Restoration
- In the event of accidental data deletion by a Tenant Organization, restoration from backup may be possible within the backup retention window
- Data restoration requests should be submitted to support@classgrid.in immediately upon discovery of data loss

---

## 13. INCIDENT RESPONSE

### 13.1 Incident Response Plan
We maintain a documented incident response plan that covers:
- **Detection:** Automated monitoring and alerting for security events
- **Triage:** Classification of incidents by severity (Critical, High, Medium, Low)
- **Containment:** Immediate actions to prevent further damage
- **Eradication:** Removal of the root cause
- **Recovery:** Restoration of affected services and data
- **Post-Incident Review:** Analysis and documentation of lessons learned

### 13.2 Incident Severity Levels

| Severity | Description | Response Time |
|---|---|---|
| **Critical** | Active data breach, complete service outage, active exploitation | Immediate (within 1 hour) |
| **High** | Potential data exposure, significant service degradation, vulnerability under active exploit | Within 4 hours |
| **Medium** | Minor data inconsistency, non-critical service disruption | Within 24 hours |
| **Low** | Informational security event, minor configuration issue | Within 72 hours |

### 13.3 Breach Notification
In the event of a confirmed data breach:
- **Affected Users:** Notified within 72 hours of confirmation, with details of what data was affected and recommended actions
- **Data Protection Board of India:** Notified as required under the DPDP Act, 2023
- **Tenant Organizations:** Notified immediately if institutional data is involved
- **Law Enforcement:** Notified if criminal activity is suspected

### 13.4 Communication
- Security incidents are communicated transparently
- A public status page will display real-time Platform availability and incident updates
- Post-incident reports are shared with affected Tenant Organizations

---

## 14. VULNERABILITY MANAGEMENT

### 14.1 Dependency Scanning
- Automated dependency scanning is performed regularly using tools like `npm audit`
- Critical and high-severity vulnerabilities in dependencies are patched within 72 hours
- Dependencies are kept up-to-date with automated update monitoring

### 14.2 Code Security
- Static Application Security Testing (SAST) is integrated into the development workflow
- Security-focused code reviews for sensitive modules (authentication, authorization, data access)
- Regular manual security reviews of critical Platform components

### 14.3 Penetration Testing
- The Company plans to conduct annual penetration testing by qualified third-party security firms
- Critical findings are remediated before the next release
- Results are used to continuously improve security posture

### 14.4 Patch Management
- Security patches for operating systems and libraries are applied within defined SLAs:
  - **Critical vulnerabilities:** Within 24 hours
  - **High vulnerabilities:** Within 72 hours
  - **Medium vulnerabilities:** Within 7 days
  - **Low vulnerabilities:** Within 30 days

---

## 15. COMPLIANCE

### 15.1 Regulatory Compliance
The Platform is designed to comply with:
- **Information Technology Act, 2000** — India's primary cyber law
- **IT (Reasonable Security Practices) Rules, 2011** — Standards for handling sensitive personal data
- **Digital Personal Data Protection Act, 2023 (DPDP Act)** — India's comprehensive data protection law
- **Google Play Developer Program Policies** — For mobile app distribution
- **Apple App Store Guidelines** — For iOS app distribution
- **PCI DSS** — Payment card data is handled by PCI DSS Level 1 certified Razorpay; the Platform never stores card data

### 15.2 Educational Regulatory Support
The Platform helps Tenant Organizations comply with:
- **NAAC / AICTE disclosure requirements** — Through mandatory disclosure pages on tenant websites
- **State Board requirements** — Through structured data management and reporting
- **RTI-related obligations** — Through publicly accessible institutional information on tenant websites

### 15.3 Audit Readiness
- All security-relevant events are logged and retained for audit purposes
- Access logs, authentication events, and data modification events are maintained
- Logs are stored in tamper-evident storage with controlled access

---

## 16. TENANT DATA ISOLATION

### 16.1 Logical Isolation
- Each Tenant Organization's data is logically isolated using Organization IDs in all database queries
- API endpoints enforce organization-level access control — a User from Organization A cannot access Organization B's data
- Tenant website content is isolated by `org_slug` in the database

### 16.2 Access Boundaries
- Faculty can only access data for classes/sections they are assigned to
- Students can only access their own academic records
- Parents can only access their ward's data
- Org Admins can only manage data within their own organization
- Super Admins have cross-organization access but all actions are logged

### 16.3 Testing
- Data isolation is tested as part of the development process
- Access control tests verify that cross-tenant data access is not possible through any API endpoint

---

## 17. THIRD-PARTY SECURITY

### 17.1 Vendor Assessment
We evaluate the security posture of all third-party service providers before integration. Key criteria include:
- SOC 2 Type II or equivalent certification
- Data encryption capabilities (at rest and in transit)
- Access control and authentication mechanisms
- Incident response capabilities
- Data processing agreements and privacy commitments

### 17.2 Current Third-Party Security Status

| Provider | Certification | Data Processing Agreement |
|---|---|---|
| MongoDB Atlas | SOC 2 Type II, ISO 27001 | Yes |
| Google Cloud Platform | SOC 1/2/3, ISO 27001/27017/27018 | Yes (Google DPA) |
| Supabase | SOC 2 Type II | Yes |
| Vercel | SOC 2 Type II | Yes |
| Razorpay | PCI DSS Level 1 | Yes |
| Firebase | SOC 1/2/3, ISO 27001 | Yes (Google DPA) |

### 17.3 Supply Chain Security
- Third-party libraries and packages are sourced from official registries (npm)
- Package integrity is verified using lockfiles and checksums
- Critical dependencies are pinned to specific versions

---

## 18. USER SECURITY BEST PRACTICES

We recommend all Users follow these security best practices:

### 18.1 For All Users
- Use a **strong, unique password** (minimum 8 characters, mix of uppercase, lowercase, numbers, and symbols)
- Do **not share** Your login credentials with anyone
- **Log out** after each session, especially on shared devices
- Report suspicious activity to Your Org Admin or support@classgrid.in immediately
- Keep Your device's operating system and browser updated

### 18.2 For Org Admins
- Regularly **review user accounts** and deactivate accounts of users who have left the institution
- Use **strong admin passwords** and change them periodically
- **Limit Org Admin access** to trusted personnel only
- Review and audit faculty access to student data
- Ensure institutional devices used to access the Platform have up-to-date antivirus software

### 18.3 For Faculty
- Do **not access** student data on unsecured or public Wi-Fi networks without a VPN
- Lock Your device when stepping away from it
- Do not download student personal data to personal devices
- Report any suspected data breach or unauthorized access immediately

---

## 19. RESPONSIBLE DISCLOSURE

### 19.1 Reporting Security Vulnerabilities
We welcome responsible disclosure of security vulnerabilities. If You discover a security issue in the Platform, please report it to Us:

- **Email:** security@classgrid.in
- **Subject Line:** "Security Vulnerability Report — [Brief Description]"

### 19.2 What to Include
- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Your contact information (optional but appreciated)

### 19.3 Our Commitment
- We will acknowledge receipt of Your report within 48 hours
- We will investigate the vulnerability within 7 days
- We will provide updates on remediation progress
- We will credit You (if desired) in Our security acknowledgments
- We will not take legal action against researchers who follow responsible disclosure guidelines

### 19.4 Rules of Engagement
- Do **not** access or modify data belonging to other Users
- Do **not** perform denial-of-service testing
- Do **not** use social engineering or phishing attacks
- Do **not** publicly disclose the vulnerability before We have had a reasonable time to address it (90 days)

---

## 20. CONTACT

For security-related inquiries, vulnerability reports, or concerns:

**Classgrid Technologies — Security Team**
- **Security Reports:** security@classgrid.in
- **General Support:** support@classgrid.in
- **Privacy Inquiries:** privacy@classgrid.in
- **Phone:** +91 8623947038 / +91 8149277038
- **Address:** Akurdi Railway Station Road, Sector No. 26, Pradhikaran, Nigdi, Pimpri-Chinchwad, Maharashtra 411044, India

---

*This Security Policy is reviewed and updated periodically. The Company reserves the right to modify this Policy at any time.*

*© 2026 Classgrid Technologies. All rights reserved.*
