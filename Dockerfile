FROM denoland/deno:2.3.6

WORKDIR /app

# 依存定義を先にコピーしてキャッシュを活用
COPY deno.json* deno.lock* ./

# npm 依存も含めてキャッシュ & node_modules 作成
RUN deno install --node-modules-dir --lock=deno.lock --frozen=false

# 残りのソース
COPY . .

# --env-file を含めるとイメージ内に .env が含まれてしまうので、compose.yaml を使ってコンテナ起動時に .env を指定するようにした
ENTRYPOINT ["deno", "run", "--allow-net=generativelanguage.googleapis.com", "--allow-read", "--allow-env", "index.ts"]