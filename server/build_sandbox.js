// vvCLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import { NodeSSH } from 'node-ssh';
import dotenv from 'dotenv';
dotenv.config();

async function cleanupAndBuild() {
    const ssh = new NodeSSH();
    console.log("Connecting to EC2...");
    
    try {
        await ssh.connect({
            host: '13.63.34.197',
            username: process.env.AGENT_USER || 'ubuntu',
            ...(process.env.AGENT_SSH_KEY
                ? { privateKey: process.env.AGENT_SSH_KEY.replace(/\\n/g, '\n') }
                : { password: process.env.AGENT_PASSWORD })
        });
        
        console.log("Connected! Checking disk space...");
        const { stdout: df1 } = await ssh.execCommand('df -h /');
        console.log(df1);
        
        console.log("Cleaning up unused Docker data to free up space...");
        await ssh.execCommand('docker system prune -a --volumes -f');
        
        console.log("Disk space after cleanup:");
        const { stdout: df2 } = await ssh.execCommand('df -h /');
        console.log(df2);
        
        console.log("Uploading latest Dockerfile to EC2...");
        await ssh.putFile('agent-sandbox-env/Dockerfile', 'agent-sandbox-env/Dockerfile');
        console.log("Upload complete!");
        
        console.log("Re-running Docker build with no-cache...");
        const command = `docker builder prune -a -f && cd agent-sandbox-env && docker build --no-cache -t classgrid-ai-sandbox .`;
        
        const result = await ssh.execCommand(command, {
            onStdout(chunk) {
                process.stdout.write(chunk.toString('utf8'));
            },
            onStderr(chunk) {
                process.stderr.write(chunk.toString('utf8'));
            }
        });
        
        console.log("\n--- Build Complete ---");
        console.log("Exit Code:", result.code);
        
        ssh.dispose();
    } catch (e) {
        console.error("SSH Error:", e);
    }
}

cleanupAndBuild();
