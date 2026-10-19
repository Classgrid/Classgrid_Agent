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
import { sendEmail } from '../src/services/aws-ses.service.js';
import {
    getGrantedCreditsLowEmailHtml,
    getTopUpCreditsLowEmailHtml,
    getFreeLimitsExhaustedEmailHtml,
    getGrantedCreditsExhaustedEmailHtml,
    getTopUpCreditsExhaustedEmailHtml
} from '../src/services/email-templates.service.js';
import dotenv from 'dotenv';
dotenv.config();

const testEmails = async () => {
    const recipients = ['nikhil.shinde@classgrid.in', 'nikhilsubsun123@gmail.com'];
    const userName = 'Nikhil';
    const expDate = '31 Oct 2026';
    const resetDate = '12 Oct 2026';
    const subdomain = 'university';

    for (const to of recipients) {
        console.log(`Sending to ${to}...`);

        await sendEmail({
            to,
            subject: 'Action Required: You have used 80% of your Granted AI Credits',
            html: getGrantedCreditsLowEmailHtml(userName, expDate, subdomain)
        });

        await sendEmail({
            to,
            subject: 'Action Required: You have used 80% of your Top-Up AI Credits',
            html: getTopUpCreditsLowEmailHtml(userName, subdomain)
        });

        await sendEmail({
            to,
            subject: 'Action Required: You have reached 100% of your Free AI Usage',
            html: getFreeLimitsExhaustedEmailHtml(userName, resetDate, subdomain)
        });

        await sendEmail({
            to,
            subject: 'Action Required: You have reached 100% of your Granted AI Credits',
            html: getGrantedCreditsExhaustedEmailHtml(userName, resetDate, subdomain)
        });

        await sendEmail({
            to,
            subject: 'Action Required: You have reached 100% of your Top-Up AI Credits',
            html: getTopUpCreditsExhaustedEmailHtml(userName, resetDate, subdomain)
        });
    }
    console.log('All test emails sent!');
};

testEmails().catch(console.error);
