#!/usr/bin/env -S deno run --allow-run --allow-net --allow-env --env-file=../.env

/**
 * 東京の魅力についてのプロンプトテスト（Hono HTTP MCP サーバー版）
 * index.ts の新しい実装に対応：
 * - MCPサーバーは起動時に一度だけ初期化
 * - /mcp/* パターンでMCPリクエストを処理
 * - StreamableHTTPTransportを使用
 */

import { spawn } from "node:child_process";

// サーバが許可する MCP プロトコル日付
const MCP_PROTOCOL_VERSION = '2024-05-10';   // ← ここをサーバ実装に合わせる

class MCPHTTPTestClient {
  constructor(options: { verbose?: boolean; timeout?: number; serverUrl?: string } = {}) {
    this.verbose = options.verbose !== false;
    this.timeout = options.timeout || 30000;
    this.serverUrl = options.serverUrl || 'http://localhost:3876';
  }

  private verbose: boolean;
  private timeout: number;
  private serverUrl: string;
  private serverProcess: any = null;

  async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.verbose) {
        console.log('🚀 Hono MCPサーバーを起動中...');
      }

      let resolved = false;

      // Honoサーバープロセスを起動
      this.serverProcess = spawn('deno', ['task', 'start'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      this.serverProcess.stdout?.on('data', (data: Uint8Array) => {
        const output = new TextDecoder().decode(data);
        if (this.verbose) {
          console.log('📋 サーバーログ:', output.trim());
        }
        // サーバー起動完了の検出（実際のログメッセージに合わせて修正）
        if (output.includes('Listening on http://localhost:3876') && !resolved) {
          resolved = true;
          // ヘルスチェックで実際にサーバーが応答するまで待機
          this.waitForServerReady().then(() => {
            resolve();
          }).catch((error) => {
            reject(error);
          });
        }
      });

      this.serverProcess.stderr?.on('data', (data: Uint8Array) => {
        const output = new TextDecoder().decode(data);
        if (this.verbose) {
          console.log('📋 サーバーエラー:', output.trim());
        }
      });

      this.serverProcess.on('close', (code: number | null) => {
        if (this.verbose) {
          console.log(`✅ サーバープロセス終了 (コード: ${code})`);
        }
        if (!resolved) {
          reject(new Error(`サーバープロセスが異常終了しました (コード: ${code})`));
        }
      });

      // タイムアウト設定
      setTimeout(() => {
        if (!resolved) {
          reject(new Error('サーバー起動がタイムアウトしました'));
        }
      }, 15000); // タイムアウトを15秒に延長
    });
  }

  private async waitForServerReady(): Promise<void> {
    const maxRetries = 10;
    const retryInterval = 500; // 500ms間隔

    for (let i = 0; i < maxRetries; i++) {
      try {
        const isReady = await this.healthCheck();
        if (isReady) {
          if (this.verbose) {
            console.log('✅ サーバーがヘルスチェックに応答しました');
          }
          return;
        }
      } catch (error) {
        // ヘルスチェック失敗は正常（サーバーがまだ起動中の可能性）
      }

      // 少し待ってリトライ
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }

    throw new Error('サーバーがヘルスチェックに応答しませんでした');
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      // グレースフルシャットダウンのためSIGTERMを送信
      this.serverProcess.kill('SIGTERM');
      
      // プロセスが終了するまで少し待つ
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          // タイムアウトした場合は強制終了
          if (this.serverProcess) {
            this.serverProcess.kill('SIGKILL');
          }
          resolve(undefined);
        }, 5000);
        
        this.serverProcess.on('exit', () => {
          clearTimeout(timeout);
          resolve(undefined);
        });
      });
      
      this.serverProcess = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/`);
      const text = await response.text();
      return text.includes('Hello, MCP Server is available at /mcp');
    } catch (error) {
      return false;
    }
  }

  async callTool(toolName: string, toolArguments: any): Promise<any> {
    if (this.verbose) {
      console.log(`🚀 MCPツール "${toolName}" のHTTPテストを開始...`);
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept':       'application/json'
    };

    try {
      // 初期化リクエスト
      if (this.verbose) {
        console.log('📤 初期化メッセージ送信中...');
      }
      const initResponse = await fetch(`${this.serverUrl}/mcp`, {
        method:  'POST',
        headers,
        body:    JSON.stringify({
          jsonrpc: "2.0",
          id:      1,
          method:  "initialize",
          params: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities:    { tools: {} },
            clientInfo:      { name: "mcp-http-test-client", version: "1.0.0" }
          }
        })
      });

      if (!initResponse.ok) {
        throw new Error(`初期化失敗: ${initResponse.status} ${initResponse.statusText}`);
      }
      let initResult: any;
      if ((initResponse.headers.get('content-type') || '').startsWith('text/event-stream')) {
        initResult = await this.parseSSEtoJSON(initResponse);
      } else {
        initResult = await initResponse.json();
      }
      if (this.verbose) {
        console.log('📥 初期化レスポンス:', JSON.stringify(initResult, null, 2));
      }
  
      // ツール呼び出しリクエスト
      const toolCallMessage = {
        jsonrpc: "2.0",
        id:      2,
        method:  "tools/call",
        params: {
          name:      toolName,
          arguments: toolArguments
        }
      };
      if (this.verbose) {
        console.log(`📤 ツール "${toolName}" 呼び出し中...`);
      }
      const toolResponse = await fetch(`${this.serverUrl}/mcp`, {
        method:  'POST',
        headers,
        body:    JSON.stringify(toolCallMessage)
      });
      if (!toolResponse.ok) {
        throw new Error(`ツール呼び出し失敗: ${toolResponse.status} ${toolResponse.statusText}`);
      }

      let toolResult: any;
      if ((toolResponse.headers.get('content-type') || '').startsWith('text/event-stream')) {
        toolResult = await this.parseSSEtoJSON(toolResponse);
      } else {
        toolResult = await toolResponse.json();
      }
      if (this.verbose) {
        console.log('📥 ツールレスポンス:', JSON.stringify(toolResult, null, 2));
      }
      if (toolResult.error) {
        throw new Error(`MCP Error: ${JSON.stringify(toolResult.error)}`);
      }
  
      return toolResult.result;
  
    } catch (error) {
      throw new Error(`HTTP MCP呼び出しエラー: ${(error as Error).message}`);
    }
  }

  extractText(result: any): string {
    if (!result || !result.content) {
      return '';
    }

    return result.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');
  }

  /**
   * text/event-stream 形式のレスポンスを JSON に変換するヘルパ。
   * 単純化のため、最初の `data: ` 行を取り出して JSON.parse する。
   */
  private async parseSSEtoJSON(response: Response): Promise<any> {
    const raw = await response.text();
    // 行単位で解析し、最初に出現する "data: " プレフィックスの行を探す
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data:")) {
        const jsonPart = trimmed.slice("data:".length).trim();
        try {
          return JSON.parse(jsonPart);
        } catch (_) {
          // JSON でなければ無視して続行
        }
      }
    }
    throw new Error("SSE から JSON を抽出できませんでした");
  }
}

/**
 * 東京の魅力プロンプトテストを実行
 */
async function testTokyoAttraction() {
  const client = new MCPHTTPTestClient({
    verbose: true,
    timeout: 30000
  });

  try {
    console.log('🗾 === 東京の魅力プロンプトテスト開始（Hono HTTP版） ===\n');

    // サーバー起動
    await client.startServer();

    // ヘルスチェック
    console.log('🏥 ヘルスチェック実行中...');
    const isHealthy = await client.healthCheck();
    if (!isHealthy) {
      throw new Error('サーバーのヘルスチェックに失敗しました');
    }
    console.log('✅ サーバーは正常に動作しています\n');

    // MCPツール呼び出し
    const result = await client.callTool('call_gemini_or_vertex_ai', {
      userMessage: "東京の魅力について饒舌に語ってください。",
      options: {
        useVertexAI: false,
        model: "gemini-2.5-flash"
      }
    });

    console.log('\n🗾 === Geminiによる東京の魅力レスポンス ===');
    const responseText = client.extractText(result);
    console.log(responseText);
    console.log('=== レスポンス終了 ===\n');

    // 簡単な検証
    console.log('🔍 === レスポンス検証 ===');
    const keywords = ['東京', '魅力', '多様性', '文化', '食'];
    const foundKeywords = keywords.filter(keyword => responseText.includes(keyword));
    
    console.log(`✅ キーワード検出: ${foundKeywords.length}/${keywords.length}`);
    foundKeywords.forEach(keyword => {
      console.log(`  - "${keyword}" ✓`);
    });

    if (foundKeywords.length >= 3) {
      console.log('\n🎉 テスト成功: 東京の魅力について適切にレスポンスしました！');
    } else {
      console.log('\n⚠️  テスト警告: 期待されるキーワードが不足しています');
    }

    console.log(`\n📊 レスポンス統計:`);
    console.log(`  - 文字数: ${responseText.length}`);
    console.log(`  - 行数: ${responseText.split('\n').length}`);

  } catch (error) {
    console.error('❌ テストエラー:', (error as Error).message);
  } finally {
    // サーバー停止
    await client.stopServer();
    console.log('\n🛑 サーバーを停止しました');
  }
}

// メイン実行
if ((import.meta as any).main) {
  await testTokyoAttraction();
} 