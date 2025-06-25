#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getUserAttendedEvents,
  getUserGroupList,
  getUserList,
  getUserPresenterEvents,
  getGenAIResponse,
} from "./tools/index.ts";
import process from "node:process";

// MCPサーバーの初期化
const server = new McpServer({
  name: "Connpass User MCP Server",
  version: "0.1.1",
  capabilities: {
    resource: {},
    tools: {},
  },
});

server.tool(
  "get_connpass_user_list",
  "Fetch Connpass user information",
  {
    nickname: z.array(z.string()).describe("Connpass user ID/nickname"),
  },
  async ({ nickname }: { nickname: string[] }) => {
    return await getUserList(nickname);
  },
);

server.tool(
  "get_connpass_user_group_list",
  "Fetch Connpass user group information",
  {
    nickname: z.string().describe("Connpass user ID/nickname"),
  },
  async ({ nickname }: { nickname: string }) => {
    return await getUserGroupList(nickname);
  },
);

server.tool(
  "get_connpass_user_events",
  "Fetch events for a specific Connpass user",
  {
    nickname: z.string().describe("Connpass user ID/nickname"),
  },
  async ({ nickname }: { nickname: string }) => {
    return await getUserAttendedEvents(nickname);
  },
);

server.tool(
  "get_connpass_user_presenter_events",
  "Fetch presenter events for a specific Connpass user",
  {
    nickname: z.string().describe("Connpass user ID/nickname"),
  },
  async ({ nickname }: { nickname: string }) => {
    return await getUserPresenterEvents(nickname);
  },
);

// New tool definition for getGenAIResponse
server.tool(
  "call_generative_ai", // Renamed tool
  "Calls either the Gemini Developer API or Vertex AI with a user prompt and options.",
  {
    userMessage: z.string().describe("The message/prompt to send to the Generative AI."),
    options: z.object({
      useVertexAI: z.boolean().describe("Set to true to use Vertex AI, false for Gemini Developer API."),
      model: z.string().describe("The model name (e.g., 'gemini-1.5-flash-001') or full model path for Vertex AI."),
      project: z.string().optional().describe("Google Cloud Project ID (required if useVertexAI is true)."),
      location: z.string().optional().describe("Google Cloud Project Location (required if useVertexAI is true)."),
    }).describe("Options for configuring the AI call."),
  },
  async ({ userMessage, options }: { userMessage: string; options: { useVertexAI: boolean; model: string; project?: string; location?: string; } }) => {
    return await getGenAIResponse(userMessage, options);
  },
);

// 起動
async function setMCPServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Connpass MCP Server running on stdio");
}

setMCPServer().catch((error) => {
  console.error("Fatal error in setMCPServer():", error);
  process.exit(1);
});
