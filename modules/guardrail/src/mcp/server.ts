import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Rule } from '@aicq/rule-sdk';
import { loadAllBuiltinRules } from '../rules-default/index.js';
import { handleCheckSnippet, handleListRules } from './handlers.js';

export interface BuildMcpServerOptions {
  readonly rules?: readonly Rule[];
  readonly name?: string;
  readonly version?: string;
}

export async function buildMcpServer(opts: BuildMcpServerOptions = {}): Promise<Server> {
  const rules = opts.rules ?? (await loadAllBuiltinRules());

  const server = new Server(
    {
      name: opts.name ?? 'aicq-guardrail',
      version: opts.version ?? '0.0.0',
    },
    {
      capabilities: { tools: {} },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [
      {
        name: 'checkSnippet',
        description:
          'Validate a code snippet against AICQ guardrail rules. Returns diagnostics with rule id, severity, message, line, and column.',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'Source code to check' },
            language: {
              type: 'string',
              enum: ['typescript', 'javascript', 'tsx', 'python'],
            },
            filePath: { type: 'string', description: 'Optional file path for context' },
          },
          required: ['source', 'language'],
        },
      },
      {
        name: 'listRules',
        description: 'List all loaded guardrail rules with their metadata.',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name;
    const args = req.params.arguments;
    if (name === 'checkSnippet') {
      const result = handleCheckSnippet(args, rules);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    if (name === 'listRules') {
      const result = handleListRules(rules);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}
