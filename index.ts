import { Hono } from "hono";
import { mcp } from "@hono/mcp";
import { createMcpServer } from "./mcp/server.ts";

const app = new Hono();

app.get("/", (c) => c.text("Hello, MCP Server is available at /mcp"));

// MCPエンドポイントを@hono/mcpミドルウェアで処理します。
// これにより、Node.js固有の複雑なコードを排除し、
// Cloudflare Workersなどのエッジ環境でHonoを直接実行できるようになります。
// createMcpServer関数を渡すことで、リクエストごとに新しいサーバーインスタンスが生成され、
// ステートレスなアーキテクチャを維持します。
app.use("/mcp/*", mcp({
  createServer: createMcpServer,
}));

export default app;