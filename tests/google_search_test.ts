#!/usr/bin/env -S deno run --allow-run --allow-env --env-file=../.env

/**
 * Google検索機能付きAI応答のプロンプトテスト（Deno版）
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

class MCPTestClient {
  constructor(options: { verbose?: boolean; timeout?: number } = {}) {
    this.verbose = options.verbose !== false;
    this.timeout = options.timeout || 60000; // Google検索のため長めに設定
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

  extractGroundingMetadata(result: any): any[] {
    if (!result) {
      return [];
    }

    // デバッグ用: レスポンス全体を確認
    console.log('🔍 [extractGroundingMetadata] Full result:', JSON.stringify(result, null, 2));

    // MCPレスポンスの形式に合わせて確認
    if (result.webSearchQueries || result.groundingChunks) {
      console.log('✅ Found grounding data in MCP response');
      return result.groundingChunks || [];
    }

    // content内にGrounding情報がある場合
    if (result.content) {
      return result.content
        .filter((item: any) => item.type === 'text' && item.groundingMetadata)
        .map((item: any) => item.groundingMetadata)
        .flat();
    }

    return [];
  }
}

/**
 * Google検索機能付きAI応答のテストを実行
 */
async function testGoogleSearchResponse() {
  const client = new MCPTestClient({
    verbose: true,
    timeout: 60000  // Google検索のため60秒に設定
  });

  try {
    console.log('🔍 === Google検索機能付きAI応答テスト開始 ===\n');

    // テストケース1: 最新の技術情報を検索
    console.log('📱 テストケース1: 最新技術情報の検索...');
    const techResult = await client.callTool('call_google_search', {
      userMessage: "2024年の最新のAI技術の動向について教えてください。特にLLM（大規模言語モデル）の進展について詳しく説明してください。",
      options: {
        useVertexAI: false,
        model: "gemini-2.5-flash"
      }
    });

    console.log('\n🤖 === Google検索付きAI応答（技術動向）===');
    const techResponseText = client.extractText(techResult);
    console.log(techResponseText);
    
    // Grounding情報の確認
    const techGroundingData = client.extractGroundingMetadata(techResult);
    if (techGroundingData.length > 0) {
      console.log('\n🔗 === 検索ソース情報 ===');
      techGroundingData.forEach((grounding: any, index: number) => {
        console.log(`ソース ${index + 1}:`, grounding);
      });
    }
    console.log('=== レスポンス終了 ===\n');

    // テストケース2: 現在のニュース/イベント情報
    console.log('📰 テストケース2: 現在のニュース情報の検索...');
    const newsResult = await client.callTool('call_google_search', {
      userMessage: "日本の最新ニュースで重要な出来事を3つ教えてください。特に経済や技術分野のニュースを重視してください。",
      options: {
        useVertexAI: false,
        model: "gemini-2.5-flash"
      }
    });

    console.log('\n📰 === Google検索付きAI応答（ニュース）===');
    const newsResponseText = client.extractText(newsResult);
    console.log(newsResponseText);
    
    const newsGroundingData = client.extractGroundingMetadata(newsResult);
    if (newsGroundingData.length > 0) {
      console.log('\n🔗 === 検索ソース情報 ===');
      newsGroundingData.forEach((grounding: any, index: number) => {
        console.log(`ソース ${index + 1}:`, grounding);
      });
    }
    console.log('=== レスポンス終了 ===\n');

    // レスポンス検証
    console.log('🔍 === レスポンス検証 ===');
    
    // 技術動向レスポンスの検証
    const techKeywords = ['AI', '2024', 'LLM', '大規模言語モデル', '技術', '進展'];
    const foundTechKeywords = techKeywords.filter(keyword => 
      techResponseText.toLowerCase().includes(keyword.toLowerCase()) || 
      techResponseText.includes(keyword)
    );
    
    console.log(`✅ 技術動向キーワード検出: ${foundTechKeywords.length}/${techKeywords.length}`);
    foundTechKeywords.forEach(keyword => {
      console.log(`  - "${keyword}" ✓`);
    });

    // ニュースレスポンスの検証
    const newsKeywords = ['日本', 'ニュース', '経済', '技術', '最新'];
    const foundNewsKeywords = newsKeywords.filter(keyword => 
      newsResponseText.toLowerCase().includes(keyword.toLowerCase()) ||
      newsResponseText.includes(keyword)
    );
    
    console.log(`✅ ニュースキーワード検出: ${foundNewsKeywords.length}/${newsKeywords.length}`);
    foundNewsKeywords.forEach(keyword => {
      console.log(`  - "${keyword}" ✓`);
    });

    // Grounding機能の検証
    const totalGroundingSources = techGroundingData.length + newsGroundingData.length;
    console.log(`🔗 検索ソース参照数: ${totalGroundingSources}`);

    // 総合評価
    const techSuccess = foundTechKeywords.length >= 4;
    const newsSuccess = foundNewsKeywords.length >= 3;
    const groundingSuccess = totalGroundingSources > 0;

    if (techSuccess && newsSuccess && groundingSuccess) {
      console.log('\n🎉 テスト成功: Google検索機能付きAI応答が正常に動作しました！');
      console.log('  ✅ 技術動向の応答が適切');
      console.log('  ✅ ニュース情報の応答が適切');
      console.log('  ✅ 検索ソースの参照が確認された');
    } else {
      console.log('\n⚠️  テスト警告: 一部の機能に問題がある可能性があります');
      if (!techSuccess) console.log('  ❌ 技術動向の応答に問題');
      if (!newsSuccess) console.log('  ❌ ニュース情報の応答に問題');
      if (!groundingSuccess) console.log('  ❌ 検索ソースの参照が確認されない');
    }

    console.log(`\n📊 レスポンス統計:`);
    console.log(`  - 技術動向レスポンス文字数: ${techResponseText.length}`);
    console.log(`  - ニュースレスポンス文字数: ${newsResponseText.length}`);
    console.log(`  - 技術動向レスポンス行数: ${techResponseText.split('\n').length}`);
    console.log(`  - ニュースレスポンス行数: ${newsResponseText.split('\n').length}`);
    console.log(`  - 総検索ソース参照数: ${totalGroundingSources}`);

  } catch (error) {
    console.error('❌ テストエラー:', (error as Error).message);
    globalThis.Deno?.exit(1);
  }
}

// メイン実行
if ((import.meta as any).main) {
  await testGoogleSearchResponse();
} 