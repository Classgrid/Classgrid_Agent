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
import { generateAiReceiptPdfBuffer } from './src/services/pdf-invoice.service.js';
import { sendEmail } from './src/services/aws-ses.service.js';

async function run() {
    console.log('Generating PDF...');
    const pdfBuffer = await generateAiReceiptPdfBuffer({
        amountFormatted: '₹1.00',
        creditsAdded: 5000,
        paymentId: 'pay_Tj3gsUq2M7IiDa',
        paidAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
        payerName: 'Nikhil Shinde',
        payerEmail: 'nikhil.shinde@classgrid.in'
    });
    
    console.log('PDF Generated. Size:', pdfBuffer.length);

    const emailBodyText = `Subject: Payment Successful — ₹1.00 | Classgrid AI

Hello Nikhil Shinde,

Your purchase of AI Credits was completed successfully. The credits have been instantly added to your account.

Amount Paid: ₹1.00
Credits Received: 5,000 Credits
Payment ID: pay_Tj3gsUq2M7IiDa
Paid At: 02 Oct 2026, 07:07 pm IST

Thank you for your purchase.

This is an automated receipt from Classgrid.`;

    const adminEmailBodyText = `Subject: New AI Credit Purchase: ₹1.00 from Nikhil Shinde

New AI Credit Purchase!

Hello Nikhil,

A user has just successfully purchased AI Credits. Here are the details:

Amount: ₹1.00
Credits Purchased: 5,000 Credits
Purchaser: Nikhil Shinde (nikhil.shinde@classgrid.in)
Payment ID: pay_Tj3gsUq2M7IiDa

Attempt Security Details:
Device: Chrome on Windows
Location: Pune, India
IP Address: 103.82.41.202
Time: 02 Oct 2026, 07:07 pm IST`;

    console.log('Sending User Receipt Email to nikhil.shinde@classgrid.in...');
    await sendEmail({
        to: 'nikhil.shinde@classgrid.in',
        subject: 'Payment Successful — ₹1.00 | Classgrid AI',
        fromName: 'Classgrid Billing',
        fromEmail: 'billing@classgrid.in',
        text: emailBodyText,
        attachments: [{
            filename: 'Classgrid_AI_Receipt_pay_Tj3gsUq2M7IiDa.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf'
        }]
    });

    console.log('Sending Admin Notification to nikhil.shinde@classgrid.in...');
    await sendEmail({
        to: 'nikhil.shinde@classgrid.in',
        subject: 'New AI Credit Purchase: ₹1.00 from Nikhil Shinde',
        fromName: 'Classgrid Billing',
        fromEmail: 'billing@classgrid.in',
        text: adminEmailBodyText
    });
    
    console.log('Done! Both emails sent.');
    process.exit(0);
}

run().catch(console.error);
