#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSearchMcpServers } from "./tools/searchMcpServers.js";
import { registerGetDetails } from "./tools/getDetails.js";

const server = new McpServer({
  name: "mcp-creation-helper",
  version: "0.1.0",
});

registerSearchMcpServers(server);
registerGetDetails(server);

const transport = new StdioServerTransport();
await server.connect(transport);
