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
const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../server/src/controllers/auth.controller.js');
let content = fs.readFileSync(targetFile, 'utf8');

// The replacement logic:
const newActivateAdmin = `// POST /api/auth/activate-admin
// Validates activation token, sets password, marks admin as activated, auto-logs in
export const activateAdmin = async (req, res) => {
    try {
        await connectDB();
        const { token, password, email, activationCode, subdomain, username, orgEmail, orgPhone, personalDetails, orgIdentity, orgDetails, dynamicData } = req.body;

        if ((!token && !(email && activationCode)) || !password) {
            return res.status(400).json({ message: "Provide password plus either token or email + activationCode." });
        }

        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!strongPassword.test(password)) {
            return res.status(400).json({ message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character." });
        }

        // --- 1. Lookup user by token ---
        const lookupResult = await findPendingUserByActivation({ token, email, activationCode });
        let user = null;
        let orgPending = null;

        if (lookupResult && lookupResult.isPendingAdmin) {
            orgPending = lookupResult.org;
            // DO NOT CREATE USER HERE. We defer user creation to first dashboard entry.
        } else {
            user = lookupResult;
        }

        if (!user && !orgPending) {
            if (token) {
                const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
                const User = (await import("../models/User.js")).default;
                const staleUser = await User.findOne({ activationToken: hashedToken }).select("activationUsedAt activationTokenExpires activationAttempts activationAttemptsExpiresAt");
                if (staleUser?.activationUsedAt) {
                    return res.status(410).json({ message: "This activation link has already been used. Your account is active — please sign in." });
                }
                if (staleUser && staleUser.activationTokenExpires < new Date()) {
                    return res.status(410).json({ message: "This activation link has expired (links are valid for 7 hours). Please ask your admin to resend the invitation." });
                }
            }
            return res.status(400).json({ message: "This activation credential is invalid or has expired. Please request a new one." });
        }

        // --- 2. Rate Limit ---
        const now = Date.now();
        const targetObj = user || orgPending.pending_admin;
        if (targetObj.activationAttemptsExpiresAt && targetObj.activationAttemptsExpiresAt > now) {
            if ((targetObj.activationAttempts || 0) >= ACTIVATION_RATE_LIMIT_MAX) {
                const minutesLeft = Math.ceil((targetObj.activationAttemptsExpiresAt - now) / 60000);
                return res.status(429).json({ message: \`Too many activation attempts. Please wait \${minutesLeft} minute(s) before trying again.\` });
            }
            targetObj.activationAttempts = (targetObj.activationAttempts || 0) + 1;
        } else {
            targetObj.activationAttempts = 1;
            targetObj.activationAttemptsExpiresAt = new Date(now + ACTIVATION_RATE_LIMIT_WINDOW_MS);
        }
        
        if (user) await user.save();
        if (orgPending) await orgPending.save();

        if (user && !user.mustResetPassword) {
            return res.status(400).json({ message: "This account has already been activated. Please sign in." });
        }

        // --- 3. Validate Organization Specifics ---
        let finalSubdomain = null;
        const targetOrgId = orgPending ? orgPending._id : user?.organization_id;
        const Organization = (await import("../models/Organization.js")).default;
        const User = (await import("../models/User.js")).default;

        if (targetOrgId && subdomain) {
            const cleanSubdomain = String(subdomain).toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
            if (cleanSubdomain && cleanSubdomain.length >= 3) {
                const existing = await Organization.findOne({ subdomain: cleanSubdomain, _id: { $ne: targetOrgId } });
                if (!existing) {
                    finalSubdomain = cleanSubdomain;
                }
            }
        }

        if (targetOrgId && !finalSubdomain) {
            const org = await Organization.findById(targetOrgId).select("subdomain").lean();
            finalSubdomain = org?.subdomain;
        }

        // Validate Billing Info for Org Admin
        const billingSettings = {};
        if (orgPending) {
            if (orgEmail) {
                const cleanEmail = orgEmail.toLowerCase().trim();
                const orgExists = await Organization.findOne({ invoice_email: cleanEmail, _id: { $ne: targetOrgId } });
                const userExists = await User.findOne({ email: cleanEmail });
                if (orgExists || userExists) {
                    return res.status(409).json({ message: "The organization email provided is already registered with another account." });
                }
                billingSettings.invoice_email = orgEmail;
                billingSettings.email_verified = true;
            }
            if (orgPhone) {
                const cleanPhone = orgPhone.trim();
                const orgExists = await Organization.findOne({ 
                    $or: [{ invoice_phone: cleanPhone }, { contactNumber: cleanPhone }],
                    _id: { $ne: targetOrgId }
                });
                const userExists = await User.findOne({ phoneNumber: cleanPhone });
                if (orgExists || userExists) {
                    return res.status(409).json({ message: "The organization phone number provided is already registered with another account." });
                }
                billingSettings.invoice_phone = orgPhone;
                billingSettings.phone_verified = true;
            }
            if (orgDetails?.city) billingSettings.city = orgDetails.city;
            if (orgDetails?.pincode) billingSettings.pincode = orgDetails.pincode;
        }

        // --- 4. Org Admin Provisional Flow ---
        if (orgPending) {
            // Hash password and store provisionally
            orgPending.pending_admin.hashedPassword = await bcrypt.hash(password, 10);
            
            // Clear activation tokens
            orgPending.pending_admin.activationToken = null;
            orgPending.pending_admin.activationTokenExpires = null;
            orgPending.pending_admin.activationCodeHash = null;
            orgPending.pending_admin.activationCodeExpires = null;
            orgPending.pending_admin.activationAttempts = 0;
            orgPending.pending_admin.activationAttemptsExpiresAt = null;

            // Update Metadata
            const metadataToSave = orgPending.pending_admin.metadata || {};
            if (dynamicData) {
                for (const [k, v] of Object.entries(dynamicData)) {
                    if (k !== "profile_photo" && k !== "org_logo" && typeof v !== "object") {
                        metadataToSave[k] = v;
                    }
                }
                if (dynamicData["identity.first_name"]) metadataToSave.first_name = dynamicData["identity.first_name"];
                if (dynamicData["identity.last_name"]) metadataToSave.last_name = dynamicData["identity.last_name"];
                if (dynamicData["identity.dob"]) metadataToSave.dob = dynamicData["identity.dob"];
                if (dynamicData["identity.gender"]) metadataToSave.gender = dynamicData["identity.gender"];
            }
            
            if (username) metadataToSave.username = username;
            
            if (dynamicData?.profile_photo?.image) {
                // We'll upload this and store URL in metadata for finalization
                metadataToSave.profilePicture = await uploadBase64ToS3(dynamicData.profile_photo.image, "profile_pictures", "pending_" + orgPending._id.toString());
            }
            
            orgPending.pending_admin.metadata = metadataToSave;

            // Update Org Fields
            if (finalSubdomain) orgPending.subdomain = finalSubdomain;
            if (orgDetails?.name) orgPending.name = orgDetails.name;
            if (orgDetails?.address) orgPending.address = orgDetails.address;
            
            if (orgDetails?.type) {
                const typeMap = {
                    "School": { org_type: "school", structure_type: "school_with_div" },
                    "Junior College": { org_type: "junior_college", structure_type: "junior_college" },
                    "Engineering College": { org_type: "engineering", structure_type: "engineering" },
                    "Diploma College": { org_type: "diploma", structure_type: "diploma" },
                    "Coaching Institute": { org_type: "coaching", structure_type: "coaching" }
                };
                const mappedType = typeMap[orgDetails.type];
                if (mappedType) {
                    orgPending.org_type = mappedType.org_type;
                    orgPending.structure_type = mappedType.structure_type;
                }
            }
            
            if (Object.keys(billingSettings).length > 0) {
                orgPending.billing_settings = billingSettings;
            }
            
            if (orgIdentity?.logo) {
                orgPending.logo_url = await uploadBase64ToS3(orgIdentity.logo, "organization_logos", orgPending._id.toString());
            }
            if (personalDetails?.designation) {
                orgPending.designation = personalDetails.designation;
            }
            
            // Mark stage as dashboard_entry_pending
            if (!orgPending.onboarding_progress) {
                orgPending.onboarding_progress = {};
            }
            orgPending.onboarding_progress.current_stage = "dashboard_entry_pending";
            
            await orgPending.save();
            await syncDerivedOnboardingProgress(orgPending._id);

            // Generate Provisional Token
            const provisionalToken = jwt.sign({
                id: "pending_" + orgPending._id,
                orgId: orgPending._id,
                email: orgPending.pending_admin.email,
                role: "org_admin",
                isProvisional: true
            }, JWT_SECRET, { expiresIn: '1h' });
            
            setTokenCookie(res, provisionalToken, req);

            const frontendUrl = getFrontendUrl();
            const isLocal = frontendUrl.includes("localhost");
            const domainBase = isLocal ? "localhost:3000" : "classgrid.in";
            const protocol = isLocal ? "http://" : "https://";
            const tenantDomain = finalSubdomain ? \`\${finalSubdomain}.\${domainBase}\` : domainBase;
            const dashboardTarget = \`\${protocol}\${tenantDomain}/admin/dashboard\`;

            return res.status(200).json({
                message: "Onboarding successfully submitted. Pending dashboard entry.",
                token: provisionalToken,
                redirectTo: dashboardTarget,
                provisional: true,
                user: {
                    id: "pending_" + orgPending._id,
                    name: orgPending.pending_admin.name,
                    email: orgPending.pending_admin.email,
                    role: "org_admin",
                    organization_id: orgPending._id,
                    isProvisional: true
                }
            });
        }

        // --- 5. Regular User Flow (e.g. Faculty, Student) ---
        user.password = await bcrypt.hash(password, 10);
        user.mustResetPassword = false;
        user.isEmailVerified = true;
        user.activationToken = null;
        user.activationTokenExpires = null;
        user.activationCodeHash = null;
        user.activationCodeExpires = null;
        user.activationUsedAt = new Date(); 
        user.activationAttempts = 0;        
        user.activationAttemptsExpiresAt = null;
        
        if (username) user.username = username;
        if (dynamicData?.profile_photo?.image) {
            user.profilePicture = await uploadBase64ToS3(dynamicData.profile_photo.image, "profile_pictures", user._id.toString());
        }

        if (dynamicData) {
            const firstName = dynamicData["identity.first_name"] || personalDetails?.first_name || "";
            const lastName = dynamicData["identity.last_name"] || personalDetails?.last_name || "";
            if (firstName || lastName) user.name = \`\${firstName} \${lastName}\`.trim();
            if (dynamicData["identity.dob"]) user.dob = new Date(dynamicData["identity.dob"]);
            if (dynamicData["identity.gender"]) user.gender = dynamicData["identity.gender"];
            
            const metadataToSave = user.metadata || {};
            for (const [k, v] of Object.entries(dynamicData)) {
                if (k !== "profile_photo" && k !== "org_logo" && typeof v !== "object") {
                    metadataToSave[k] = v;
                }
            }
            user.metadata = metadataToSave;
            user.markModified("metadata");
        }

        if (!user.linkedProviders) user.linkedProviders = [];
        if (!user.linkedProviders.includes("manual")) user.linkedProviders.push("manual");
        user.authProvider = "manual";
        if (user.status === "pending") user.status = "active";
        user.lastLoginAt = new Date();
        await user.save();

        if (user.organization_id && finalSubdomain) {
            await Organization.findByIdAndUpdate(user.organization_id, { $set: { subdomain: finalSubdomain } });
        }

        const jwtToken = generateToken(user, req);
        setTokenCookie(res, jwtToken, req);

        let dashboardTarget = getFrontendDashboardTarget(user);
        if (user.role === "org_admin" && finalSubdomain) {
            const frontendUrl = getFrontendUrl();
            const isLocal = frontendUrl.includes("localhost");
            const domainBase = isLocal ? "localhost:3000" : "classgrid.in";
            const protocol = isLocal ? "http://" : "https://";
            dashboardTarget = \`\${protocol}\${finalSubdomain}.\${domainBase}/admin/dashboard\`;
        }

        res.status(200).json({
            message: "Account activated successfully",
            token: jwtToken,
            redirectTo: dashboardTarget,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture || "",
                photoURL: user.profilePicture || "",
                organization_id: user.organization_id || null,
                authProvider: "manual",
            }
        });
    } catch (err) {
        console.error("Activate Admin Error:", err);
        res.status(500).json({ message: "Server error during activation." });
    }
}`;

const finalizeOnboardingController = \`
// POST /api/auth/finalize-onboarding
// Finalizes onboarding, creates User, emits First Login milestone
export const finalizeOnboarding = async (req, res) => {
    try {
        await connectDB();
        const { token } = req.body;
        
        let actualToken = token;
        if (!actualToken) {
            if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
                actualToken = req.headers.authorization.split(" ")[1];
            } else if (req.cookies && (req.cookies.token || req.cookies.jwt)) {
                actualToken = req.cookies.token || req.cookies.jwt;
            }
        }
        
        if (!actualToken) {
            return res.status(401).json({ message: "Provisional token required." });
        }
        
        const decoded = jwt.verify(actualToken, JWT_SECRET);
        
        if (!decoded.isProvisional || !decoded.orgId) {
            // It might already be a fully resolved user token if they retry
            const User = (await import("../models/User.js")).default;
            const existingUser = await User.findById(decoded.id || decoded.userId);
            if (existingUser) {
                return res.status(200).json({ 
                    message: "Account already active.", 
                    token: actualToken,
                    user: { id: existingUser._id, role: existingUser.role, email: existingUser.email }
                });
            }
            return res.status(400).json({ message: "Invalid provisional token." });
        }
        
        const Organization = (await import("../models/Organization.js")).default;
        const org = await Organization.findById(decoded.orgId);
        
        if (!org || !org.pending_admin) {
            return res.status(404).json({ message: "Organization or pending admin not found." });
        }
        
        if (org.onboarding_progress?.current_stage !== "dashboard_entry_pending") {
            // Maybe already finalized in a parallel request
            const User = (await import("../models/User.js")).default;
            if (org.owner_id) {
                const owner = await User.findById(org.owner_id);
                if (owner) {
                    const jwtToken = generateToken(owner, req);
                    setTokenCookie(res, jwtToken, req);
                    return res.status(200).json({ token: jwtToken, user: { id: owner._id, role: owner.role } });
                }
            }
            return res.status(400).json({ message: "Onboarding is not in dashboard_entry_pending stage." });
        }
        
        const User = (await import("../models/User.js")).default;
        
        // 1. Create User Atomically
        const { metadata, hashedPassword, name, email, phone } = org.pending_admin;
        
        const newUser = new User({
            email: email,
            name: name || metadata?.first_name ? \`\${metadata.first_name} \${metadata.last_name || ''}\`.trim() : "Admin",
            phoneNumber: phone || "",
            role: "org_admin",
            organization_id: org._id,
            password: hashedPassword,
            status: "active",
            authProvider: "manual",
            linkedProviders: ["manual"],
            isEmailVerified: true,
            mustResetPassword: false,
            username: metadata?.username || undefined,
            profilePicture: metadata?.profilePicture || "",
            dob: metadata?.dob ? new Date(metadata.dob) : undefined,
            gender: metadata?.gender || undefined,
            metadata: metadata || {},
            lastLoginAt: new Date()
        });
        
        await newUser.save();
        
        // 2. Link Organization and Update State
        org.owner_id = newUser._id;
        if (!org.onboarding_progress) org.onboarding_progress = {};
        org.onboarding_progress.current_stage = "completed";
        org.onboardingCompleted = true;
        
        // Clear pending admin sensitive data
        org.pending_admin.hashedPassword = "";
        
        await org.save();
        
        // 3. Track Milestone and Events
        const { default: DemoRequest } = await import("../models/super-admin/DemoRequest.js");
        await DemoRequest.findOneAndUpdate(
            { provisionedOrganizationId: org._id },
            { $set: { provisionedAdminId: newUser._id, lifecycleStage: "activated" } }
        );
        
        await trackOnboardingEvent({
            organizationId: org._id,
            demoRequestId: null,
            userId: newUser._id,
            eventType: "org_admin_activated",
            stage: "dashboard_entry_first_login",
            actorRole: newUser.role,
            metadata: { message: "First Admin Dashboard Entry Completed" },
        });
        
        // Send Activation Email
        try {
            const { getOrgAdminActivatedHtml, getOrgAdminActivatedPlainText } = await import("../services/email-templates.service.js");
            const frontendUrl = getFrontendUrl();
            const isLocal = frontendUrl.includes("localhost");
            const domainBase = isLocal ? "localhost:3000" : "classgrid.in";
            const protocol = isLocal ? "http://" : "https://";
            const tenantDomain = org.subdomain ? \`\${org.subdomain}.\${domainBase}\` : domainBase;
            const dashboardLink = \`\${protocol}\${tenantDomain}/admin/dashboard\`;
            const adminLoginLink = \`\${protocol}\${tenantDomain}/admin/login\`;

            await sendEmail({
                to: newUser.email,
                subject: "Your Classgrid Admin Account is Active",
                html: getOrgAdminActivatedHtml(newUser.name, dashboardLink, adminLoginLink),
                text: getOrgAdminActivatedPlainText(newUser.name, dashboardLink, adminLoginLink),
            });
        } catch (emailErr) {
            console.error("Activation email send error:", emailErr.message);
        }
        
        // 4. Generate Standard JWT
        const jwtToken = generateToken(newUser, req);
        setTokenCookie(res, jwtToken, req);
        
        return res.status(200).json({
            message: "Onboarding finalized successfully",
            token: jwtToken,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                profilePicture: newUser.profilePicture || "",
                organization_id: newUser.organization_id || null,
                authProvider: "manual",
            }
        });
        
    } catch (err) {
        console.error("Finalize Onboarding Error:", err);
        return res.status(500).json({ message: "Server error finalizing onboarding." });
    }
};
\`;

const startIdx = content.indexOf('export const activateAdmin');
let nextFuncIdx = content.indexOf('export const resendActivation', startIdx);
if (nextFuncIdx === -1) nextFuncIdx = content.length; // Just in case
const endIdx = content.lastIndexOf('}', nextFuncIdx);

const before = content.substring(0, startIdx);
const after = content.substring(nextFuncIdx);

const newContent = before + newActivateAdmin + '\\n\\n' + finalizeOnboardingController + '\\n\\n' + after;
fs.writeFileSync(targetFile, newContent);
console.log('Successfully updated auth.controller.js');
