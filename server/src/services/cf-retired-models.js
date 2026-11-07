// Workers AI models Cloudflare removes on 20 Nov 2026 (after that, a request to one fails with 410 Gone,
// developers.cloudflare.com/changelog/post/2026-11-05-planned-model-deprecations/). Classgrid already uses the
// replacements; this map still sends any old id (an older desktop app, a chat saved with an old model) to its
// replacement, so nothing breaks.

const DEEPSEEK_FLASH = "@cf/deepseek-ai/deepseek-v4.1-flash-1017";
const GLM = "@cf/zai-org/glm-5.3";
const QWEN = "@cf/qwen/qwen3.8-27b";
const GEMMA = "@cf/google/gemma-4-26b-a4b-it";

export const CF_REPLACEMENTS = {
    "@cf/deepseek-ai/deepseek-v4-pro-0813": DEEPSEEK_FLASH,
    "@cf/deepseek-ai/deepseek-v4-flash-0731": DEEPSEEK_FLASH,
    "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b": DEEPSEEK_FLASH,
    "@cf/moonshotai/kimi-k2.6": GLM,
    "@cf/moonshotai/kimi-k2.7-code": GLM,
    "@cf/zai-org/glm-5.2": GLM,
    "@cf/zai-org/glm-5.3-flash": GLM,
    "@cf/nvidia/nemotron-3-120b-a12b": GLM,
    "@cf/qwen/qwq-32b": QWEN,
    "@cf/qwen/qwen3-30b-a3b-fp8": QWEN,
    "@cf/meta/llama-3.1-8b-instruct-fp8": GEMMA,
    "@cf/meta/llama-3.2-1b-instruct": GEMMA,
    "@cf/meta/llama-3.2-3b-instruct": GEMMA,
    "@cf/meta-llama/llama-2-7b-chat-hf-lora": GEMMA,
    "@cf/google/gemma-2b-it-lora": GEMMA,
    "@cf/google/gemma-7b-it-lora": GEMMA,
    "@cf/myshell-ai/melotts": "@cf/deepgram/aura-2-en",
    "@cf/openai/whisper-tiny-en": "@cf/deepgram/nova-3",
    "@cf/llava-hf/llava-1.5-7b-hf": "@cf/moondream/moondream3.1-9B-A2B",
    "@cf/stabilityai/stable-diffusion-xl-base-1.0": "@cf/black-forest-labs/flux-2-klein-9b",
    "@cf/runwayml/stable-diffusion-v1-5-inpainting": "@cf/black-forest-labs/flux-2-klein-9b",
    "@cf/bytedance/stable-diffusion-xl-lightning": "@cf/black-forest-labs/flux-2-klein-9b",
    "@cf/lykon/dreamshaper-8-lcm": "@cf/black-forest-labs/flux-2-klein-9b",
};

/** The model to call: the replacement for a removed model, otherwise the same model. */
export const cfModel = (id) => CF_REPLACEMENTS[id] || id;

/** A request's model and URL (".../ai/run/<model>") with a removed model swapped for its replacement. */
export function cfSwapProvider(provider) {
    const model = cfModel(provider?.model);
    if (!provider || model === provider.model) return provider;
    return { ...provider, model, url: String(provider.url || "").replace(provider.model, model) };
}
