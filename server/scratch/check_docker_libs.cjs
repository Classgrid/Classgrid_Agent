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
    const keyPath = 'C:\\Users\\nikhi\\Downloads\\Nikhil.pem';
    if (!fs.existsSync(keyPath)) {
        console.log(`Key not found at ${keyPath}`);
        return;
    }
    const key = fs.readFileSync(keyPath, 'utf8');
    
    console.log('Connecting to sandbox server using Nikhil.pem...');
    await ssh.connect({
      host: '13.63.34.197',
      username: 'ubuntu',
      privateKey: key
    });
    console.log('Connected! Checking docker image...');

    // Wait for the build process to release the lock if it's running
    const testCmd = await ssh.execCommand('docker run --rm agent-sandbox-env pip freeze | grep -E "cairosvg|pandas|PyPDF2|Pillow|moviepy|pytesseract"');
    
    if (testCmd.stdout) {
        console.log('\n--- PROOF: LIBRARIES INSTALLED IN DOCKER ---');
        console.log(testCmd.stdout);
        console.log('--------------------------------------------\n');
    } else {
        console.log('Could not find them. The Docker build from earlier might still be running! Here is the output:');
        console.log(testCmd.stderr);
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    ssh.dispose();
  }
}
run();
