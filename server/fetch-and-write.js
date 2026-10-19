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
import fs from 'fs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const bedrockContent = `# Eligible AI Models List

## 🟢 AWS Bedrock Models (Verified Eligible)

### Anthropic
- us.anthropic.claude-opus-4-6-v1
- us.anthropic.claude-opus-4-5-v1
- us.anthropic.claude-opus-4-1-v1
- us.anthropic.claude-sonnet-4-6-v1
- us.anthropic.claude-haiku-4-5-v1

### OpenAI
- openai.gpt-oss-120b-1:0
- openai.gpt-oss-20b-1:0
- openai.gpt-oss-safeguard-120b
- openai.gpt-oss-safeguard-20b

### DeepSeek
- deepseek.v3.2
- deepseek.r1-v1:0

### Meta (Llama)
- meta.llama4-maverick-17b-instruct-v1:0
- meta.llama4-scout-17b-instruct-v1:0
- meta.llama3-3-70b-instruct-v1:0
- meta.llama3-1-70b-instruct-v1:0
- meta.llama3-1-8b-instruct-v1:0
- meta.llama3-70b-instruct-v1:0
- meta.llama3-8b-instruct-v1:0

### Mistral
- mistral.mistral-large-3-675b-instruct
- mistral.mistral-large-2402-v1:0
- mistral.mistral-small-2402-v1:0
- mistral.devstral-2-123b
- mistral.magistral-small-2509
- mistral.ministral-3-3b-instruct
- mistral.ministral-3-8b-instruct
- mistral.ministral-3-14b-instruct
- mistral.pixtral-large-2502-v1:0
- mistral.mixtral-8x7b-instruct-v0:1
- mistral.mistral-7b-instruct-v0:2
- mistral.voxtral-mini-3b-2507
- mistral.voxtral-small-24b-2507

### Amazon
- amazon.nova-2-lite-v1:0
- amazon.nova-pro-v1:0
- amazon.nova-lite-v1:0
- amazon.nova-micro-v1:0
- amazon.nova-2-sonic-v1:0
- amazon.nova-2-5-sonic
- amazon.nova-2-multimodal-embeddings-v1:0
- amazon.titan-embed-text-v1
- amazon.titan-embed-text-v2:0
- amazon.titan-embed-image-v1

### Qwen
- qwen.qwen3-32b-v1:0
- qwen.qwen3-next-80b-a3b
- qwen.qwen3-vl-235b-a22b
- qwen.qwen3-coder-30b-a3b-v1:0
- qwen.qwen3-coder-next

### xAI (Grok)
- xai.grok-4.7
- xai.grok-4.6

### Moonshot
- moonshotai.kimi-k3
- moonshotai.kimi-k2.5
- moonshot.kimi-k2-thinking

### Z.AI
- zai.glm-5.3
- zai.glm-5
- zai.glm-4.7
- zai.glm-4.7-flash

### MiniMax
- minimax.minimax-m2.5
- minimax.minimax-m2.1
- minimax.minimax-m2

### NVIDIA
- nvidia.nemotron-super-3-120b
- nvidia.nemotron-nano-3-30b
- nvidia.nemotron-nano-12b-v2
- nvidia.nemotron-nano-9b-v2

### Google
- google.gemma-3-27b-it
- google.gemma-3-12b-it
- google.gemma-3-4b-it

### Others
- cohere.embed-english-v3
- cohere.embed-multilingual-v3
- ai21.jamba-1-5-large-v1:0
- ai21.jamba-1-5-mini-v1:0
- twelvelabs.pegasus-1.2
- twelvelabs.marengo-embed-3.0
- writer.palmyra-vision-7b

---

`;

async function fetchCloudflareModels() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
    
    let cfContent = "## 🟢 Cloudflare Workers AI Models (Self-Hosted / Eligible)\n\n";
    
    try {
        const url = "https://api.cloudflare.com/client/v4/accounts/" + accountId + "/ai/models/search";
        const res = await fetch(url, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });
        const data = await res.json();
        
        if (data.success) {
            const textModels = data.result.filter(m => m.task.name === "Text Generation");
            textModels.forEach(m => {
                cfContent += "- " + m.name + "\n";
            });
        } else {
            cfContent += "*Failed to fetch Cloudflare models.*\n";
        }
    } catch (e) {
        cfContent += "*Error fetching Cloudflare models: " + e.message + "*\n";
    }
    
    return cfContent;
}

async function main() {
    console.log("Generating markdown file...");
    const cfContent = await fetchCloudflareModels();
    
    const finalContent = bedrockContent + cfContent;
    
    const outPath = "C:/Users/nikhi/.gemini/antigravity-ide/brain/1ebdeee2-0fdd-44ef-a732-ab43c2d82d48/eligible_models_combined.md";
    fs.writeFileSync(outPath, finalContent);
    console.log("Created file at", outPath);
}
main();
