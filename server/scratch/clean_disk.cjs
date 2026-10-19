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
    console.log('Connected! Checking disk space...');

    const df = await ssh.execCommand('df -h');
    console.log(df.stdout);

    console.log('\\nPruning docker to free up space (removing unused images/build cache)...');
    const prune = await ssh.execCommand('docker system prune -af --volumes');
    console.log(prune.stdout);

    const df2 = await ssh.execCommand('df -h');
    console.log('\\nDisk space after prune:');
    console.log(df2.stdout);
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    ssh.dispose();
  }
}
run();
