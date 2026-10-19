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
const fs = require('fs');

const sdkPath = 'c:/classgrid-ai-sdk/src/core/llm-client.ts';
let sdkCode = fs.readFileSync(sdkPath, 'utf8');

const targetBlock = `      const call = result.toolCalls[0];
      const toolName = call.function.name;

      if (verbose) {
        console.log(\`dY>,?  [llm:\${provider.name}] Tool: \${toolName} (Depth: \${depth + 1}/\${maxDepth})\`);
      }`;

if (sdkCode.includes(targetBlock)) {
  const replacement = `      // [PARALLEL TOOLS FIX] Loop over all tool calls in parallel (up to 100)
      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "assistant", content: result.content || "", tool_calls: result.toolCalls },
      ];

      let hasThought = false;
      const toolPromises = result.toolCalls.map(async (call) => {
        const toolName = call.function.name;
        
        if (verbose) {
          console.log(\`dY>,?  [llm:\${provider.name}] Tool: \${toolName} (Depth: \${depth + 1}/\${maxDepth})\`);
        }

        // Handle internal thinking tool
        if (toolName === "internal_thought_process") {
          hasThought = true;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments);
          } catch {
            return { role: "tool" as const, tool_call_id: call.id, content: "Error: Invalid JSON arguments." };
          }
          if (verbose) console.log(\`dY  [thinking via tool] \${provider.name}: \${(args.thought as string).slice(0, 200)}...\`);
          const lines = (args.thought as string).split("\\n").slice(0, 4).join("\\n");
          onThought?.(lines);
          onStatus?.("analyzing");
          return { role: "tool" as const, tool_call_id: call.id, content: "Thought logged. Provide your final answer now." };
        }

        const handler = config.toolHandlers?.[toolName];
        if (!handler) {
          return { role: "tool" as const, tool_call_id: call.id, content: "Error: Tool not found." };
        }

        let args: Record<string, unknown>;
        try {
          args = JSON.parse(call.function.arguments);
        } catch {
          return { role: "tool" as const, tool_call_id: call.id, content: "Error: Invalid JSON arguments." };
        }

        onStatus?.(toolName.replace(/_/g, " "));
        onToolCall?.(toolName, args);

        let toolResult: string;
        try {
          toolResult = await handler(args);
        } catch (e) {
          toolResult = \`Tool error: \${e instanceof Error ? e.message : String(e)}\`;
        }

        onToolResult?.(toolName, toolResult.slice(0, 2000));
        
        return { role: "tool" as const, tool_call_id: call.id, content: toolResult.slice(0, 6000) };
      });

      const resolvedResults = await Promise.all(toolPromises);
      nextMessages.push(...resolvedResults);

      clearTimeout(timeout);
      return tryProvider(provider, nextMessages, config, temperature, maxTokens, timeoutMs, onStatus, onThought, onToken, onToolCall, onToolResult, hasThought ? depth : depth + 1, toolFailures);
`;

  // We need to replace the entire block from `const call = result.toolCalls[0];` to the recursive tryProvider return.
  const regex = /const call = result\.toolCalls\[0\];[\s\S]*?return tryProvider\(provider, nextMessages, config, temperature, maxTokens, timeoutMs, onStatus, onThought, onToken, onToolCall, onToolResult, depth \+ 1, toolFailures\);\s*\}/g;
  
  sdkCode = sdkCode.replace(regex, replacement);
  fs.writeFileSync(sdkPath, sdkCode);
  console.log("Successfully replaced sequential logic with Promise.all parallel logic!");
} else {
  console.log("Could not find target block.");
}
