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
require('dotenv').config();

const ssh = new NodeSSH();

async function run() {
  try {
    const key = process.env.AGENT_SSH_KEY.replace(/\\n/g, '\n');
    console.log('Connecting to sandbox server...');
    
    await ssh.connect({
      host: '13.63.34.197',
      username: 'ubuntu',
      privateKey: key
    });
    console.log('Connected!');

    // First check if the directory exists
    const checkDir = await ssh.execCommand('ls /var/www/classgrid_platform/server/agent-sandbox-env');
    if (checkDir.stderr) {
        console.log('Directory not found. Attempting to locate agent-sandbox-env...');
        const findDir = await ssh.execCommand('find /home/ubuntu -type d -name "agent-sandbox-env" 2>/dev/null');
        console.log('Found at:', findDir.stdout);
        // If they don't have the repo there, we can just create the Dockerfile directly
        if (!findDir.stdout) {
            console.log('Creating Dockerfile manually on remote server...');
            const dockerfileContent = `FROM python:3.13-slim
WORKDIR /data
ENV NODE_PATH=/usr/lib/node_modules
RUN apt-get update && apt-get install -y curl wget gnupg unzip zip ffmpeg ghostscript poppler-utils imagemagick tesseract-ocr libreoffice chromium && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs && npm install -g typescript playwright googleapis && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir pandas numpy matplotlib seaborn openpyxl reportlab pymupdf pdfplumber pytest fpdf playwright cairosvg Pillow beautifulsoup4 requests pytz python-dateutil networkx scipy sympy xlrd xlwt PyPDF2 python-docx python-pptx pytesseract pydub moviepy jinja2 lxml qrcode fpdf2 pycryptodome boto3 sqlalchemy tabulate rich opencv-python-headless pdf2image html5lib markdown textblob spacy nltk scikit-learn statmodels yfinance apscheduler
RUN useradd -m agent && chown -R agent:agent /data
USER agent
CMD ["/bin/bash"]
`;
            await ssh.execCommand('mkdir -p ~/agent-sandbox-env');
            await ssh.execCommand(`cat << 'EOF' > ~/agent-sandbox-env/Dockerfile\n${dockerfileContent}\nEOF`);
            console.log('Building Docker image... (This will take a few minutes)');
            const buildResult = await ssh.execCommand('cd ~/agent-sandbox-env && docker build -t agent-sandbox-env .');
            console.log('STDOUT:', buildResult.stdout);
            console.log('STDERR:', buildResult.stderr);
        } else {
            console.log('Building Docker image from found path...');
            const path = findDir.stdout.trim();
            const buildResult = await ssh.execCommand(`cd ${path} && git pull && docker build -t agent-sandbox-env .`);
            console.log('STDOUT:', buildResult.stdout);
            console.log('STDERR:', buildResult.stderr);
        }
    } else {
        console.log('Building Docker image from /var/www/...');
        const buildResult = await ssh.execCommand('cd /var/www/classgrid_platform/server/agent-sandbox-env && git pull && docker build -t agent-sandbox-env .');
        console.log('STDOUT:', buildResult.stdout);
        console.log('STDERR:', buildResult.stderr);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    ssh.dispose();
  }
}
run();
