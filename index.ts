#!/usr/bin/env node

// ヘルスチェックエンドポイント: GET / でサーバーの稼働状況を確認
// MCPエンドポイント: POST /mcp でMCPプロトコルのリクエストを処理
// Node.js/Deno両対応: 環境変数の取得方法を両環境で対応
// fetch-to-nodeを使用: StreamableHTTPServerTransportとの互換性確保
// 毎リクエストでのMCPサーバー作成: 状態管理が不要でスケーラブル

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpServer } from "./mcp/server.ts";

async function startServer() {
  const app = new Hono();

  app.get("/", (c) => c.text("Hello, MCP Server is available at /mcp"));

  app.all("/mcp", async (c) => {
    // Hono の Request → Node.js req/res
    const { req, res } = toReqRes(c.req.raw);

    // MCP サーバーインスタンス
    const mcpServer: McpServer = createMcpServer();

    // Transport の生成
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // ステートレスモードを指定
    });
    await mcpServer.connect(transport);

    try {
      if (c.req.method === "POST") {
        // JSON-RPC モード: クライアントが送ってきた Accept ヘッダーを尊重しつつ
        // application/json と text/event-stream の両方を必ず含める。
        const originalAccept = req.headers["accept"] ?? "";
        const acceptTypes = new Set(
          originalAccept
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v.length > 0),
        );
        acceptTypes.add("application/json");
        acceptTypes.add("text/event-stream");
        req.headers["accept"] = Array.from(acceptTypes).join(", ");

        const body = await c.req.json();
        console.log("🔍 POST /mcp  Body:", body);

        // ボディ付きで呼び出し
        await transport.handleRequest(req, res, body);

      } else {
        // SSE モード: イベントストリームを返せるよう Accept を上書き
        req.headers["accept"] = "text/event-stream";

        console.log("🔍 GET  /mcp  SSE start");
        // ボディなしで呼び出し (SSE セッション開始)
        await transport.handleRequest(req, res);
      }

      // クローズ時に必ずクリーンアップ
      res.on("close", () => {
        console.log("🔒 Connection closed");
        transport.close();
        mcpServer.close();
      });

      console.log("✅ Response generated successfully");
      return toFetchResponse(res);

    } catch (err) {
      console.error("❌ MCP processing error:", err);
      // エラー時にも必ずクリーンアップ
      transport.close();
      mcpServer.close();
      return c.json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null
      }, 500);
    }
  });

  const port = parseInt(process.env.PORT || "3876", 10);
  console.log(`🚀 Listening on http://localhost:${port}`);
  
  const server = serve({ fetch: app.fetch, port });

  // グレースフルシャットダウンのためのシグナルハンドリング
  const shutdown = () => {
    console.log("🛑 Shutting down gracefully...");
    
    // タイムアウトを設定して確実に終了させる
    const forceExitTimer = setTimeout(() => {
      console.log("⚠️ Forced shutdown due to timeout");
      process.exit(0);
    }, 3000); // 3秒後に強制終了
    
    try {
      server.close(() => {
        console.log("✅ Server closed successfully");
        clearTimeout(forceExitTimer);
        process.exit(0);
      });
    } catch (error) {
      console.log("⚠️ Error during server close, forcing exit");
      clearTimeout(forceExitTimer);
      process.exit(0);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((e) => {
  console.error("Failed to start:", e);
  process.exit(1);
});