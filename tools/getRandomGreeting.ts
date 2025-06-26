/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const greetings = [
  "こんにちは！★今日も素晴らしい一日をお過ごしください！",
  "おはようございます！★新しい一日の始まりですね！",
  "こんばんは！★お疲れさまでした！",
  "はじめまして！★よろしくお願いします！",
  "お元気ですか？★今日はどんな一日でしたか？",
  "いらっしゃいませ！★何かお手伝いできることはありますか？",
  "素晴らしい日ですね！★何か楽しいことはありましたか？",
  "今日もお疲れさまです！★頑張っていますね！",
  "こんにちは！★笑顔で素敵な時間をお過ごしください！",
  "お会いできて嬉しいです！★今日はいかがお過ごしですか？",
  "素敵な一日をお過ごしください！★応援しています！",
  "今日も一日、お疲れさまでした！★ゆっくり休んでくださいね！"
];

/**
 * ユーザーのプロンプトを受け取り、ランダムな挨拶を返す
 */
export const getRandomGreeting = async (userPrompt: string) => {
  try {
    // ランダムなインデックスを生成
    const randomIndex = Math.floor(Math.random() * greetings.length);
    const randomGreeting = greetings[randomIndex];
    
    return {
      content: [
        {
          type: "text" as const,
          text: `${randomGreeting}\n\n（あなたのメッセージ: "${userPrompt}"）\n生成時刻: ${new Date().toISOString()}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\n（あなたのメッセージ: "${userPrompt}"）\n生成時刻: ${new Date().toISOString()}`,
        },
      ],
      isError: true,
    };
  }
}; 