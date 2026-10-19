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
import { uploadBufferToR2 } from './src/config/r2Client.js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Classgrid Sites | AI Hosting</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0f172a;
            --primary: #38bdf8;
            --secondary: #818cf8;
            --text: #f8fafc;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
        }
        
        /* Background Glows */
        .glow {
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(15, 23, 42, 0) 70%);
            top: -200px;
            left: -200px;
            z-index: 0;
            border-radius: 50%;
        }
        .glow:nth-child(2) {
            background: radial-gradient(circle, rgba(129, 140, 248, 0.15) 0%, rgba(15, 23, 42, 0) 70%);
            bottom: -200px;
            right: -200px;
            top: auto;
            left: auto;
        }

        .container {
            position: relative;
            z-index: 10;
            text-align: center;
            padding: 4rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 24px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            max-width: 800px;
            width: 90%;
            animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
        }

        .badge {
            display: inline-block;
            padding: 8px 16px;
            background: rgba(56, 189, 248, 0.1);
            color: var(--primary);
            border-radius: 100px;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 24px;
            letter-spacing: 1px;
            text-transform: uppercase;
            border: 1px solid rgba(56, 189, 248, 0.2);
        }

        h1 {
            font-size: 4rem;
            font-weight: 700;
            line-height: 1.1;
            margin-bottom: 1.5rem;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        h1 span {
            background: linear-gradient(to right, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        p {
            font-size: 1.25rem;
            color: #94a3b8;
            margin-bottom: 2.5rem;
            line-height: 1.6;
            font-weight: 300;
        }

        .features {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .feature-card {
            background: rgba(0, 0, 0, 0.2);
            padding: 20px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.03);
            flex: 1;
            min-width: 200px;
            transition: all 0.3s ease;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
            border-color: rgba(56, 189, 248, 0.3);
            background: rgba(56, 189, 248, 0.05);
        }

        .feature-icon {
            font-size: 24px;
            margin-bottom: 12px;
        }

        .feature-title {
            font-weight: 500;
            font-size: 1.1rem;
            color: #e2e8f0;
            margin-bottom: 8px;
        }

        .feature-desc {
            font-size: 0.9rem;
            color: #64748b;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="glow"></div>
    <div class="glow"></div>

    <div class="container">
        <div class="badge">Powered by Classgrid Cloud</div>
        <h1>AI Can Host <span>Any Site</span> Here</h1>
        <p>The R2 Reverse Proxy is fully operational. Your AI assistant can now instantly deploy beautiful, functional websites directly to this cloud infrastructure in seconds.</p>
        
        <div class="features">
            <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <div class="feature-title">Instant Deploy</div>
                <div class="feature-desc">Sub-second deployments globally.</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🤖</div>
                <div class="feature-title">AI Generated</div>
                <div class="feature-desc">Prompt to production instantly.</div>
            </div>
            <div class="feature-card">
                <div class="feature-title" style="margin-top: 10px; font-size: 1.25rem;">✓ Systems Go</div>
            </div>
        </div>
    </div>
</body>
</html>
`;

async function testUpload() {
    console.log("Uploading test HTML to R2...");
    const buffer = Buffer.from(html, 'utf-8');
    
    const url1 = await uploadBufferToR2(buffer, 'index.html', 'text/html', 'websites/nikhil/index.html');
    
    console.log("Upload complete! URLs:");
    console.log(url1);
}

testUpload();
