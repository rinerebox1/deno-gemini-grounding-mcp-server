import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getGenAIResponse,
} from "../tools/index.ts";

export function createMcpServer() {
  const server = new McpServer({
    name: "GenAI MCP Server",
    version: "0.1.1",
    capabilities: {
      resource: {},
      tools: {},
    },
  });

  server.tool(
    "call_gemini_or_vertex_ai",
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

  return server;
} 