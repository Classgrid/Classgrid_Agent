// The pictures an answer made, put on top of its text as markers the apps draw ("[IMAGE_GENERATION_COMPLETE: prompt |
// url]"); a link or marker the model wrote itself is taken out, so a picture never shows twice or as a bare link.
// Every way an answer is saved goes through this (ai-chat.controller.js streamAskAi): a stopped or failed answer was
// saved without them, so a picture that showed while the answer ran was gone when the chat was opened again (owner,
// 2026-11-18: "AI-generated images get removed by themselves").
export function withMadePictures(answerText, images) {
    if (!images?.length) return answerText;
    let text = String(answerText || "").replace(/\[IMAGE_GENERATION_(?:COMPLETE|QUEUED|ERROR):[^\]\n]*\]?/g, "");
    for (const img of images) {
        text = text.split(`](${img.url})`).join("](#)").replace(/!\[[^\]\n]*\]\(#\)/g, "").split(img.url).join("");
    }
    const markers = images.map((img) => `[IMAGE_GENERATION_COMPLETE: ${String(img.prompt || "").replace(/[\]\n|]/g, " ")} | ${img.url}]`).join("\n\n");
    return `${markers}\n\n${text.replace(/\n{3,}/g, "\n\n").trim()}`.trim();
}
