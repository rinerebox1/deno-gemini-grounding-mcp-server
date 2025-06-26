# MCPサーバーテストガイド

このディレクトリには、GenAI MCP Serverの機能をテストするためのテストファイルが含まれています。

## テストファイル一覧

### 1. `tokyo_attraction_test.ts`
**目的**: 基本的なGemini API呼び出し機能のテスト  
**対象ツール**: `call_gemini_or_vertex_ai`  
**内容**: 東京の魅力について質問し、適切なレスポンスが返されることを確認

```bash
# 実行方法
deno run --allow-run --allow-env --env-file=../.env tokyo_attraction_test.ts
```

### 2. `google_search_test.ts`
**目的**: Google検索機能付きAI応答の包括的テスト  
**対象ツール**: `call_google_search`  
**内容**: 
- 最新技術動向の検索と分析
- 日本のニュース情報の検索
- Grounding機能（検索ソース参照）の確認

```bash
# 実行方法
deno run --allow-run --allow-env --env-file=../.env google_search_test.ts
```

### 3. `google_search_simple_test.ts`
**目的**: Google検索機能の基本動作確認  
**対象ツール**: `call_google_search`  
**内容**: 天気情報の検索による簡潔な動作テスト

```bash
# 実行方法
deno run --allow-run --allow-env --env-file=../.env google_search_simple_test.ts
```

## 前提条件

### 環境変数の設定
プロジェクトルートに `.env` ファイルを作成し、以下の環境変数を設定してください：

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 必要な権限
テストファイルは以下の権限で実行されます：
- `--allow-run`: 子プロセス（MCPサーバー）の起動
- `--allow-env`: 環境変数の読み取り
- `--env-file=../.env`: .envファイルの読み込み

### Denoのインストール
テストはDeno環境で実行されるため、Denoがインストールされている必要があります：

```bash
# Denoのインストール（macOS/Linux）
curl -fsSL https://deno.land/install.sh | sh

# Windows（PowerShell）
irm https://deno.land/install.ps1 | iex
```

## テストの実行順序（推奨）

1. **基本機能のテスト**: `tokyo_attraction_test.ts`
   - Gemini APIの基本的な動作確認
   
2. **簡潔な検索テスト**: `google_search_simple_test.ts`
   - Google検索機能の基本動作確認
   
3. **包括的な検索テスト**: `google_search_test.ts`
   - Google検索機能の詳細な動作確認

## テスト結果の解釈

### 成功パターン
- ✅ 適切なキーワードが検出される
- ✅ レスポンス内容が空でない
- ✅ 検索ソースの参照が確認される（Google検索テストの場合）

### 注意が必要なパターン
- ⚠️ キーワード検出数が期待値を下回る
- ⚠️ レスポンス内容が短すぎる
- ⚠️ 検索ソースの参照がない（Google検索テストの場合）

### エラーパターン
- ❌ APIキーが無効または設定されていない
- ❌ ネットワーク接続の問題
- ❌ タイムアウト（処理時間が長すぎる）

## トラブルシューティング

### よくある問題

1. **APIキーエラー**
   ```
   Error: GEMINI_API_KEY is required for Developer API mode.
   ```
   → `.env`ファイルに正しいAPIキーが設定されているか確認

2. **タイムアウトエラー**
   ```
   Error: テストがタイムアウトしました
   ```
   → ネットワーク接続を確認、またはタイムアウト時間を延長

3. **プロセス起動エラー**
   ```
   Error: MCPサーバープロセスの起動に失敗
   ```
   → Denoが正しくインストールされているか確認
   → プロジェクトルートディレクトリから実行しているか確認

### デバッグ方法

テストファイルは詳細なログ出力を提供します：
- 📤 送信メッセージ
- 📥 サーバーレスポンス
- 📋 サーバーログ
- 🔍 検証結果

ログを確認して、どの段階で問題が発生しているかを特定してください。

## カスタマイズ

### タイムアウト時間の調整
```typescript
const client = new MCPTestClient({
  verbose: true,
  timeout: 60000  // 60秒に設定
});
```

### テストプロンプトの変更
各テストファイルの `userMessage` を編集することで、異なる内容をテストできます。

### 検証キーワードの追加
テストファイル内の `keywords` 配列に、期待されるキーワードを追加できます。 