import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildMcpServer, type BuildMcpServerOptions } from './server.js';

export async function startStdio(opts: BuildMcpServerOptions = {}): Promise<void> {
  const server = await buildMcpServer(opts);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
