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
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the server folder
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(express.json());

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;

// The HTML UI
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voice AI Tester</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); }
        h1 { margin-top: 0; color: #38bdf8; }
        label { display: block; margin-bottom: 8px; font-weight: bold; color: #94a3b8; }
        select, textarea, button { width: 100%; box-sizing: border-box; padding: 12px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #334155; background-color: #0f172a; color: white; font-size: 16px; }
        textarea { resize: vertical; height: 100px; }
        button { background-color: #0ea5e9; color: white; font-weight: bold; cursor: pointer; border: none; transition: background-color 0.2s; }
        button:hover { background-color: #0284c7; }
        button:disabled { background-color: #475569; cursor: not-allowed; }
        .audio-container { margin-top: 20px; text-align: center; display: none; }
        audio { width: 100%; }
        .status { text-align: center; color: #94a3b8; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎙️ Test Voice AI Models</h1>
        
        <label for="model">Select Voice Model:</label>
        <select id="model">
            <option value="@cf/deepgram/aura-2-en">Aura 2 (English) - Deepgram</option>
            <option value="@cf/deepgram/aura-1">Aura 1 (English) - Deepgram</option>
            <option value="@cf/deepgram/aura-2-es">Aura 2 (Spanish) - Deepgram</option>
            <option value="@cf/myshell-ai/melotts">MeloTTS (Multi-language)</option>
        </select>

        <label for="text">Text to speak:</label>
        <textarea id="text">Hello students! Welcome to Classgrid. I am your new AI tutor, and I can help you with anything you need.</textarea>

        <button id="generateBtn">Generate Speech</button>

        <div id="status" class="status"></div>

        <div id="audioContainer" class="audio-container">
            <label>Generated Audio:</label>
            <audio id="audioPlayer" controls autoplay></audio>
        </div>
    </div>

    <script>
        document.getElementById('generateBtn').addEventListener('click', async () => {
            const model = document.getElementById('model').value;
            const text = document.getElementById('text').value;
            const btn = document.getElementById('generateBtn');
            const status = document.getElementById('status');
            const audioContainer = document.getElementById('audioContainer');
            const audioPlayer = document.getElementById('audioPlayer');

            if (!text.trim()) { alert("Please enter some text!"); return; }

            btn.disabled = true;
            status.innerText = "Generating audio... this might take a few seconds.";
            audioContainer.style.display = 'none';

            try {
                const response = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, text })
                });

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(err);
                }

                // Convert audio buffer to Blob URL
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                
                audioPlayer.src = url;
                audioContainer.style.display = 'block';
                status.innerText = "Audio generated successfully!";
            } catch (error) {
                status.innerText = "Error: " + error.message;
                console.error(error);
            } finally {
                btn.disabled = false;
            }
        });
    </script>
</body>
</html>
`;

// Route to serve the HTML UI
app.get('/', (req, res) => {
    res.send(HTML_CONTENT);
});

// Proxy route to Cloudflare API
app.post('/api/tts', async (req, res) => {
    const { model, text } = req.body;
    
    if (!ACCOUNT_ID || !API_TOKEN) {
        return res.status(500).send("Missing Cloudflare API credentials in .env file");
    }

    try {
        const payload = model.includes('aura') ? { text: text } : { prompt: text };

        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).send(err);
        }

        // Send the raw audio buffer back to the browser
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.set('Content-Type', 'audio/wav');
        res.send(buffer);
        
    } catch (error) {
        res.status(500).send(error.message);
    }
});

const PORT = 3005;
app.listen(PORT, () => {
    console.log(`✅ Voice AI Tester is running! `);
    console.log(`👉 Open your browser and go to: http://localhost:${PORT}`);
});
