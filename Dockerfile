FROM denoland/deno:2.3.6

WORKDIR /app

# 依存定義を先にコピーしてキャッシュを活用
COPY deno.json* deno.lock* ./

# npm 依存も含めてキャッシュ & node_modules 作成
RUN deno install --node-modules-dir --lock=deno.lock --frozen=false

# 残りのソース
COPY . .

# Honoサーバーのポートを公開
EXPOSE 3876

# Honoサーバー + MCP用の権限設定（最小限）
# --allow-net=generativelanguage.googleapis.com: Gemini APIへのアクセス
# --allow-net=:3876: Honoサーバーのポート3876でのバインド
# --allow-read: 設定ファイルの読み込み
# --allow-env: 環境変数の読み込み
# --env-file を含めるとイメージ内に .env が含まれてしまうので、compose.yaml を使ってコンテナ起動時に .env を指定するようにした
ENTRYPOINT ["deno", "run", "--allow-net=generativelanguage.googleapis.com,localhost:3876,127.0.0.1:3876", "--allow-read", "--allow-env", "index.ts"]