#!/usr/bin/env -S deno run --allow-run --allow-env --env-file=../.env

/**
 * Google検索機能の簡潔なテスト（Deno版）
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

class MCPTestClient {
  constructor(options: { verbose?: boolean; timeout?: number } = {}) {
    this.verbose = options.verbose !== false;
    this.timeout = options.timeout || 45000;
  }

  private verbose: boolean;
  private timeout: number;

  async callTool(toolName: string, toolArguments: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.verbose) {
        console.log(`🚀 MCPツール "${toolName}" のテストを開始...`);
      }

      // MCPサーバープロセスを起動
      const mcpServer = spawn('deno', ['run', '--env-file=.env', '--allow-net=generativelanguage.googleapis.com', '--allow-env', '--allow-read', 'index.ts'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // サーバーからのレスポンスを処理
      const rl = createInterface({
        input: mcpServer.stdout,
        crlfDelay: Infinity
      });

      let toolResult: any = null;

      rl.on('line', (line: string) => {
        if (this.verbose) {
          console.log('📥 サーバーレスポンス:', line);
        }

        try {
          const response = JSON.parse(line);
          
          // 初期化完了の確認
          if (response.id === 1 && response.result) {
            return;
          }

          // ツール実行結果の取得
          if (response.id === 2 && response.result) {
            toolResult = response.result;
            mcpServer.kill();
            resolve(toolResult);
          }

          // エラーハンドリング
          if (response.error) {
            mcpServer.kill();
            reject(new Error(`MCP Error: ${JSON.stringify(response.error)}`));
          }
        } catch (e) {
          // JSONパースエラーは無視
        }
      });

      mcpServer.stderr?.on('data', (data: Uint8Array) => {
        if (this.verbose) {
          console.log('📋 サーバーログ:', new TextDecoder().decode(data));
        }
      });

      mcpServer.on('close', (code: number | null) => {
        if (this.verbose) {
          console.log(`✅ MCPサーバープロセス終了 (コード: ${code})`);
        }
        if (!toolResult) {
          reject(new Error('ツール実行が完了しませんでした'));
        }
      });

      // 初期化メッセージを送信
      const initMessage = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          clientInfo: { name: "mcp-test-client", version: "1.0.0" }
        }
      };

      if (this.verbose) {
        console.log('📤 初期化メッセージ送信中...');
      }
      mcpServer.stdin?.write(JSON.stringify(initMessage) + '\n');

      // ツール呼び出しメッセージを送信
      setTimeout(() => {
        const toolCallMessage = {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: toolName,
            arguments: toolArguments
          }
        };

        if (this.verbose) {
          console.log(`📤 ツール "${toolName}" 呼び出し中...`);
        }
        mcpServer.stdin?.write(JSON.stringify(toolCallMessage) + '\n');
      }, 1000);

      // タイムアウト設定
      setTimeout(() => {
        if (this.verbose) {
          console.log('⏰ タイムアウト: プロセスを終了します');
        }
        mcpServer.kill();
        reject(new Error('テストがタイムアウトしました'));
      }, this.timeout);
    });
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
}

/**
 * Google検索機能の簡潔なテストを実行
 */
async function testSimpleGoogleSearch() {
  const client = new MCPTestClient({
    verbose: true,
    timeout: 45000
  });

  try {
    console.log('🔍 === Google検索機能 簡潔テスト開始 ===\n');

    const result = await client.callTool('call_google_search', {
      userMessage: "今の日本の総理大臣は誰ですか？最新の情報を教えてください。",
      options: {
        useVertexAI: false,
        model: "gemini-2.5-flash"
      }
    });

    console.log('\n🌤️ === Google検索付きAI応答 ===');
    const responseText = client.extractText(result);
    console.log(responseText);
    console.log('=== レスポンス終了 ===\n');

    // 簡単な検証
    console.log('🔍 === レスポンス検証 ===');
    const keywords = ['総理大臣', '日本', '最新'];
    const foundKeywords = keywords.filter(keyword => responseText.includes(keyword));
    
    console.log(`✅ キーワード検出: ${foundKeywords.length}/${keywords.length}`);
    foundKeywords.forEach(keyword => {
      console.log(`  - "${keyword}" ✓`);
    });

    // レスポンスが空でないことを確認
    const hasContent = responseText.trim().length > 0;
    console.log(`📝 レスポンス内容確認: ${hasContent ? '✅ あり' : '❌ なし'}`);

    if (foundKeywords.length >= 1 && hasContent) {
      console.log('\n🎉 テスト成功: Google検索機能が正常に動作しました！');
    } else {
      console.log('\n⚠️  テスト警告: 期待される結果が得られませんでした');
    }

    console.log(`\n📊 レスポンス統計:`);
    console.log(`  - 文字数: ${responseText.length}`);
    console.log(`  - 行数: ${responseText.split('\n').length}`);

  } catch (error) {
    console.error('❌ テストエラー:', (error as Error).message);
    globalThis.Deno?.exit(1);
  }
}

// メイン実行
if ((import.meta as any).main) {
  await testSimpleGoogleSearch();
} 