#!/bin/bash

# Gemini Grounding Remote MCP Server 起動スクリプト
# 既存のコンテナ・イメージを削除してからクリーンビルド・起動

set -e  # エラー時に終了

echo "🚀 Gemini Grounding Remote MCP Server を起動します..."

# .envファイルの存在確認
if [ ! -f ".env" ]; then
    echo "❌ エラー: .envファイルが見つかりません"
    echo "   以下のコマンドで.envファイルを作成してください:"
    echo "   echo 'CONNPASS_API_KEY=your_connpass_api_key_here' > .env"
    echo "   echo 'GEMINI_API_KEY=your_gemini_api_key_here' >> .env"
    exit 1
fi

echo "📋 .envファイルが確認できました"

# 既存のコンテナを停止・削除
echo "🛑 既存のコンテナを停止・削除中..."
docker compose down --remove-orphans 2>/dev/null || true

# 関連するコンテナを強制削除（念のため）
echo "🗑️  関連コンテナを強制削除中..."
docker rm -f gemini-grounding-remote-mcp-server-container 2>/dev/null || true

# 既存のイメージを削除
echo "🗑️  既存のイメージを削除中..."
docker rmi -f gemini-grounding-remote-mcp-server:latest 2>/dev/null || true

# クリーンビルド・起動
echo "🔨 イメージをビルド中..."
docker compose build --no-cache

echo "▶️  サービスを起動中..."
docker compose up

echo "✅ 起動完了！" 

docker compose down