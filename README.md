## 使い方
./start.sh

終了したあと
docker compose down


簡単にMCPサーバーを起動する方法(Docker を使わない)：deno task start


## セットアップ

1. （Connpass APIキーをすでに取得済の場合はスキップ）Connpass
   APIキーの発行をしてもらいます。詳細については[connpassのAPI利用について](https://help.connpass.com/api/)を参照してください。
2. このリポジトリをクローンします。
3. 必要な環境変数を設定します。`.env.example` を `.env` にコピーして、Connpass
   APIキーを設定します。

```bash
cp .env.example .env
# .envファイルを編集してCONNPASS_API_KEYを設定
```

4. サーバーを起動します。

### Denoでの起動（推奨）

```json
{
  "mcpServers": {
    "gemini-grounding-remote-mcp-server": {
        "command": "wsl.exe",
        "args": [
          "/home/smorce/.deno/bin/deno",
          "--allow-net=generativelanguage.googleapis.com",
          "--allow-env",
          "--allow-read",
          "--env-file=/home/smorce/MCP/gemini-grounding-remote-mcp-server/.env",
          "/home/smorce/MCP/gemini-grounding-remote-mcp-server/index.ts"
        ]
    }
  }
}
```

### Node.jsでの起動

1. MCPサーバーを起動するために必要な依存関係をインストールします。

```bash
npm ci
```

2. TypeScriptをビルドします。

```bash
npm run build
```

3. MCPクライアントの設定ファイル側にビルドしたファイルを指定します。

```json
"connpass-user-mcp-server": {
  "command": "wsl.exe",
  "args": [
    "/home/user/.local/share/mise/installs/node/22.14.0/bin/node",
    "--env-file=/home/user/connpass-mcp-server/.env",
    "/home/user/connpass-mcp-server/dist/index.js"
  ]
}
```

### Dockerでの起動

#### docker-compose使用（推奨）

1. 環境変数ファイルを作成します。

```bash
# .envファイルを作成し、以下の内容を設定
echo "GEMINI_API_KEY=your_gemini_api_key_here" >> .env
```

2. 用途に応じてサービスを起動します。

docker compose run vs docker compose up の違い

🔍 重要な違い

docker compose up：
- サービス全体を起動し、フォアグラウンドで継続実行
- ログが表示され続け、Ctrl+Cで停止するまで動作
- 開発・テスト時のサーバー起動に適している

docker compose run：
- 一回限りのコマンド実行に使用
- コンテナを起動してコマンドを実行し、完了後に自動終了
- MCPクライアントからの呼び出しに適している

**🔧 開発・テスト用（継続実行）:**
```bash
# 起動スクリプトを実行（クリーンアップ→ビルド→起動を自動実行）
./start.sh
```

または、手動でdocker composeコマンドを実行します。

```bash
docker compose up --build
```

**⚡ MCP用（一回限りの実行）:**
MCPクライアント経由で自動実行されます。手動テストする場合：

```bash
docker compose run --rm gemini-grounding-remote-mcp-server
```

MCPクライアントの設定ファイルでは、`docker compose run`コマンドを指定します。
MCPサーバーはstdin/stdoutでの対話的通信が必要なため、設定は以下のようになります(先にビルドが必要)：

```json
{
  "mcpServers": {
    "gemini-grounding-remote-mcp-server": {
      "command": "docker",
      "args": [
        "run",
        "-e",
        "CONNPASS_API_KEY=XXXXXXXXXXXXXXXX",
        "-e",
        "GEMINI_API_KEY=XXXXXXXXXXXXXXXX",
        "gemini-grounding-remote-mcp-server"
      ]
    }
  }
}
```

#### 直接Docker使用

Dockerfileを使用してサーバーを起動することもできます。

1. Dockerイメージをビルドします。

```bash
docker build -t connpass-user-mcp-server .
```

2. コンテナを起動します。APIキーは環境変数として渡します。

```bash
docker run -e CONNPASS_API_KEY=XXXXXXXXXXXXXXXX -e GEMINI_API_KEY=YYYYYYYYYYYYYYYY connpass-user-mcp-server
```

MCPクライアントの設定ファイルでは、`docker`コマンドを指定します。

```json
"connpass-user-mcp-server": {
  "command": "docker",
  "args": [
    "run",
    "-e",
    "CONNPASS_API_KEY=XXXXXXXXXXXXXXXX",
    "-e",
    "GEMINI_API_KEY=YYYYYYYYYYYYYYYY",
    "connpass-user-mcp-server"
  ]
}
```

### `npx`での起動（非推奨）

[@yamanoku/connpass-user-mcp-server](https://www.npmjs.com/package/@yamanoku/connpass-user-mcp-server)にてパッケージを提供しているため、リポジトリをクローンせずに`npx`でMCPサーバーの起動が可能です。

```json
"connpass-user-mcp-server": {
  "command": "wsl.exe",
  "args": [
    "bash",
    "-c",
    "CONNPASS_API_KEY=XXXXXXXXXXXXXXXX /home/user/.local/share/mise/installs/node/22.14.0/bin/npx -y @yamanoku/connpass-user-mcp-server",
  ]
},
```

**ただし`npx`でMCPサーバーを起動するのはサプライチェーン攻撃などのセキュリティ的な懸念があるため非推奨としています。**

## 機能

以下のMCPサーバーのToolsを提供しています：

### Tools

- **get_connpass_user_list** - Connpassユーザーの基本情報を取得します
  - パラメータ: `nickname` (Connpassユーザー名/ニックネームの配列)
  - 取得情報:
    参加イベント数、管理イベント数、発表イベント数、ブックマークイベント数

- **get_connpass_user_group_list** -
  Connpassユーザーが所属するグループ一覧を取得します
  - パラメータ: `nickname` (Connpassユーザー名/ニックネーム)
  - 取得情報: グループ名、URL、説明、参加者数など

- **get_connpass_user_events** -
  Connpassユーザーが参加したイベント情報を取得します
  - パラメータ: `nickname` (Connpassユーザー名/ニックネーム)
  - 取得情報: イベント名、日時、場所、URL、説明

- **get_connpass_user_presenter_events** -
  Connpassユーザーが発表者として参加したイベント情報を取得します
  - パラメータ: `nickname` (Connpassユーザー名/ニックネーム)
  - 取得情報: イベント名、日時、場所、URL、説明

## プロンプト例

次のようなプロンプトをLLMへ渡すことが可能です：

- 「yamanoku, okuto_oyamaさんのConnpassユーザー情報を教えて」
- 「yamanokuさんの参加するConnpassイベント情報を教えて」
- 「yamanokuさんの発表したConnpassイベント一覧を表示して」
- 「yamanokuさんのConnpass所属グループを一覧表示して」

## テスト

### Denoでのテスト

MCP サーバー起動コマンド:
```bash
deno task start
```

MCP サーバー起動後に東京の魅力プロンプトなど、Gemini API を使用したテストを実行します：

```bash
deno task test:tokyo
```

以下のようなアウトプットになっていれば成功。30秒の安全タイムアウトが作動しているのは正常な動作。
```
🔍 === レスポンス検証 ===
✅ キーワード検出: 5/5
  - "東京" ✓
  - "魅力" ✓
  - "多様性" ✓
  - "文化" ✓
  - "食" ✓

🎉 テスト成功: 東京の魅力について適切にレスポンスしました！

📊 レスポンス統計:
  - 文字数: 1541
  - 行数: 15
✅ MCPサーバープロセス終了 (コード: 143)
⏰ タイムアウト: プロセスを終了します
```

テストの詳細については `tests/README.md` を参照してください。

Deno と Node.js	はともに実行環境のこと。

## 謝辞

このOSSはGPT-4o Image Generationによってロゴを製作、Claude 3.7
Sonnetによって実装、ドキュメントのサンプルを提案いただきました。感謝申し上げます。

## ライセンス

[MIT License](./LICENSE)
