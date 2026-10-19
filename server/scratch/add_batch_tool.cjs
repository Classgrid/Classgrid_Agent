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

const toolsPath = 'server/src/mcp/tools.js';
let toolsCode = fs.readFileSync(toolsPath, 'utf8');

if (!toolsCode.includes('manage_multiple_rag_documents')) {
  const schemaReplacement = `    },
    {
      name: 'manage_multiple_rag_documents',
      description: 'Manage multiple RAG documents simultaneously in a single operation. Use this to update both platform and marketing databases at the exact same time.',
      inputSchema: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            description: 'List of operations to perform.',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['create', 'read', 'update', 'delete'] },
                id: { type: 'string' },
                documentType: { type: 'string' },
                chunkText: { type: 'string' },
                sourceUrl: { type: 'string' },
                collectionName: { type: 'string' }
              },
              required: ['action']
            }
          }
        },
        required: ['operations']
      }
    }`;
  toolsCode = toolsCode.replace('      required: [\'query\']\n    }', '      required: [\'query\']\n    }' + schemaReplacement);

  const logicReplacement = `      } catch (e) {
        return { content: [{ type: 'text', text: \`Failed to manage RAG document: \${e.message}\` }] };
      }
    }

    if (name === 'manage_multiple_rag_documents') {
      try {
        const results = [];
        for (const op of args.operations) {
          // Recursively call the single tool handler
          const res = await module.exports.executeMcpTool('manage_rag_document', op);
          results.push({ operation: op, result: res.content[0].text });
        }
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: \`Batch operation failed: \${e.message}\` }] };
      }
    }`;
  toolsCode = toolsCode.replace(`      } catch (e) {
        return { content: [{ type: 'text', text: \`Failed to manage RAG document: \${e.message}\` }] };
      }
    }`, logicReplacement);

  fs.writeFileSync(toolsPath, toolsCode);
  console.log('Added manage_multiple_rag_documents to tools.js');
}

const aiControllerPath = 'server/src/controllers/ai-chat.controller.js';
let aiCode = fs.readFileSync(aiControllerPath, 'utf8');

if (!aiCode.includes('manage_multiple_rag_documents')) {
  const schemaReplacement2 = `                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "manage_multiple_rag_documents",
                            description: "Manage multiple RAG documents simultaneously in a single operation. Use this to update both platform and marketing databases at the exact same time.",
                            parameters: {
                                type: "object",
                                properties: {
                                    operations: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                action: { type: "string" },
                                                id: { type: "string" },
                                                documentType: { type: "string" },
                                                chunkText: { type: "string" },
                                                sourceUrl: { type: "string" },
                                                collectionName: { type: "string" }
                                            }
                                        }
                                    }
                                },
                                required: ["operations"]
                            }
                        }
                    },`;
  aiCode = aiCode.replace('                        }\n                    },', schemaReplacement2);

  const logicReplacement2 = `                        case "manage_rag_document":
                        case "manage_multiple_rag_documents":
                            // These all route to MCP tools internally`;
  aiCode = aiCode.replace('                        case "manage_rag_document":\n                            // These all route to MCP tools internally', logicReplacement2);

  fs.writeFileSync(aiControllerPath, aiCode);
  console.log('Added manage_multiple_rag_documents to ai-chat.controller.js');
}
