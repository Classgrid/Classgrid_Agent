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
    console.log('Connected! Creating the split Dockerfile...');

    const dockerfileContent = `FROM python:3.11-slim

WORKDIR /data
ENV NODE_PATH=/usr/lib/node_modules

RUN apt-get update && apt-get install -y --no-install-recommends \\
    curl wget gnupg unzip zip pkg-config build-essential \\
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y --no-install-recommends \\
    libcairo2 libcairo2-dev libjpeg-dev libpng-dev zlib1g-dev libffi-dev libfreetype6-dev \\
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y --no-install-recommends \\
    ffmpeg ghostscript poppler-utils imagemagick tesseract-ocr tesseract-ocr-eng \\
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \\
    && apt-get install -y nodejs \\
    && npm install -g typescript playwright googleapis \\
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \\
    pandas numpy matplotlib seaborn openpyxl reportlab pymupdf pdfplumber pytest fpdf \\
    playwright cairosvg Pillow beautifulsoup4 requests pytz python-dateutil networkx \\
    scipy sympy xlrd xlwt PyPDF2 python-docx python-pptx pytesseract pydub

RUN pip install --no-cache-dir \\
    moviepy jinja2 lxml qrcode fpdf2 pycryptodome boto3 sqlalchemy tabulate \\
    rich opencv-python-headless pdf2image html5lib markdown \\
    textblob spacy nltk scikit-learn statsmodels yfinance apscheduler

RUN useradd -m agent && chown -R agent:agent /data
USER agent
ENV PATH="/home/agent/.local/bin:\${PATH}"

CMD ["/bin/bash"]
`;

    // Write it directly to the remote server
    await ssh.execCommand('mkdir -p ~/agent-sandbox-env');
    await ssh.execCommand(`cat << 'EOF' > ~/agent-sandbox-env/Dockerfile\n${dockerfileContent}\nEOF`);
    
    console.log('Rebuilding image in chunks...');

    // Run the build
    const buildResult = await ssh.execCommand('cd ~/agent-sandbox-env && docker build -t my-agent-sandbox .');
    console.log('Build finished! Status:', buildResult.code === 0 ? 'SUCCESS' : 'FAILED');
    if (buildResult.stderr) console.log('STDERR:', buildResult.stderr);
    
    if (buildResult.code === 0) {
        console.log('\\n--- FINAL VERIFICATION PIP LIST ---');
        const testResult = await ssh.execCommand('docker run --rm my-agent-sandbox pip list');
        console.log(testResult.stdout);
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    ssh.dispose();
  }
}
run();
