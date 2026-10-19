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
const { NodeSSH } = require('node-ssh');
const fs = require('fs');

const ssh = new NodeSSH();

async function run() {
  try {
    const key = fs.readFileSync('C:/Users/nikhi/Downloads/Nikhil.pem', 'utf8');
    
    await ssh.connect({
      host: '13.63.34.197',
      username: 'ubuntu',
      privateKey: key
    });
    console.log('Connected! Fixing Dockerfile typo...');

    // Read the current Dockerfile from ~/agent-sandbox-env
    const cat = await ssh.execCommand('cat ~/agent-sandbox-env/Dockerfile');
    let df = cat.stdout;
    
    // Fix the typo
    df = df.replace('statmodels', 'statsmodels');
    
    // Overwrite it
    await ssh.execCommand(`cat << 'EOF' > ~/agent-sandbox-env/Dockerfile\n${df}\nEOF`);
    console.log('Fixed! Rebuilding image and streaming logs...');

    // Run the build
    const buildResult = await ssh.execCommand('cd ~/agent-sandbox-env && docker build --no-cache -t my-agent-sandbox .');
    console.log('STDOUT:\n', buildResult.stdout);
    if (buildResult.stderr) {
        console.log('STDERR:\n', buildResult.stderr);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    ssh.dispose();
  }
}
run();
