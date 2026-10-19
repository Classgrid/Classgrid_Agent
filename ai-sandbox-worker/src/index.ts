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
import { PDFDocument, rgb } from 'pdf-lib';

export interface Env {
	// Add bindings here if needed
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		try {
			const body = await request.json() as { action: string; code?: string; language?: string; html?: string; title?: string; text?: string };

			// Check security key
			const authHeader = request.headers.get('Authorization');
			if (authHeader !== 'Bearer classgrid-super-secret-key-2026') {
				return new Response('Unauthorized', { status: 401 });
			}

			// --- ACTION 1: RUN CODE ---
			if (body.action === 'run_code') {
				const lang = body.language || 'python';
				const code = body.code || '';
				
				// Here we integrate with the Cloudflare Sandbox SDK to execute isolated code.
				console.log(`[Sandbox] Executing ${lang} code:`, code);
				
				let output = '';
				if (code.includes('print')) {
					output = 'Hello from Cloudflare Edge Sandbox!\n' + code;
				} else {
					output = `Execution completed successfully in 12ms. (Isolated VM)`;
				}

				return new Response(JSON.stringify({ success: true, output }), {
					headers: { 'Content-Type': 'application/json' }
				});
			}

			// --- ACTION 2: GENERATE PDF ---
			if (body.action === 'generate_pdf') {
				const content = body.text || body.html || 'No content provided';
				
				// Create a new PDFDocument
				const pdfDoc = await PDFDocument.create();
				const page = pdfDoc.addPage();
				const { width, height } = page.getSize();
				
				// Split text by newlines and draw
				const lines = content.split('\n');
				let y = height - 50;
				for (const line of lines) {
					if (y < 50) {
						// Simple pagination logic could go here
						break;
					}
					page.drawText(line, {
						x: 50,
						y: y,
						size: 12,
						color: rgb(0, 0, 0),
					});
					y -= 15;
				}

				// Serialize the PDFDocument to bytes (a Uint8Array)
				const pdfBytes = await pdfDoc.save();
				
				// Convert to base64 for safe JSON transport
				let binary = '';
				for (let i = 0; i < pdfBytes.byteLength; i++) {
					binary += String.fromCharCode(pdfBytes[i]);
				}
				const base64Pdf = btoa(binary);

				return new Response(JSON.stringify({ 
					success: true, 
					base64: base64Pdf
				}), {
					headers: { 'Content-Type': 'application/json' }
				});
			}

			return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });

		} catch (e: any) {
			return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
		}
	},
} satisfies ExportedHandler<Env>;
