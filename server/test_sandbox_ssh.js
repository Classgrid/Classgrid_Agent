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
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function rebuildSandbox() {
    console.log("🚀 Connecting to AWS EC2 Sandbox...");
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: process.env.AGENT_SANDBOX_HOST || '13.63.34.197',
            username: process.env.AGENT_SANDBOX_USER || 'ubuntu',
            ...(process.env.AGENT_SSH_KEY 
                ? { privateKey: process.env.AGENT_SSH_KEY.replace(/\\n/g, '\n') } 
                : { privateKeyPath: 'C:\\Users\\nikhi\\Downloads\\Nikhil.pem' }),
            tryKeyboard: true,
        });

        console.log("✅ Connected! Updating Dockerfile...");
        
        const updateCmd = `sed -i 's/pymupdf/pymupdf boto3/g' /home/ubuntu/Dockerfile || echo "boto3 already added"`;
        await ssh.execCommand(updateCmd);
        
        console.log("🐳 Rebuilding Docker image...");
        const buildCmd = `cd /home/ubuntu && sudo docker build -t my-agent-sandbox .`;
        
        const result = await ssh.execCommand(buildCmd, {
            onStdout(chunk) { process.stdout.write(chunk.toString('utf8')); },
            onStderr(chunk) { process.stderr.write(chunk.toString('utf8')); },
        });

        if (result.code === 0) {
            console.log("✅ Docker image rebuilt successfully!");
        } else {
            console.log("❌ Docker build failed.");
        }
    } catch (err) {
        console.error("SSH Error:", err);
    } finally {
        ssh.dispose();
    }
}

rebuildSandbox();

