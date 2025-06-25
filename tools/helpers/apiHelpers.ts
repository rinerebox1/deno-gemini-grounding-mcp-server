import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { env } from "node:process";

export const GEMINI_API_KEY = env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
  console.warn("Warning: GEMINI_API_KEY is not set in .env file");
}

/**
 * エラー処理共通関数
 *
 * @param error - 発生したエラー
 * @returns エラーメッセージを含むTextContentの配列
 */
export const handleAPIError = (error: unknown): { content: TextContent[] } => {
  console.error("Error processing API request:", error);
  return {
    content: [
      {
        type: "text",
        text:
          "情報取得中にエラーが発生しました。しばらく経ってから再試行してください。",
      },
    ],
  };
};
