/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, handleAPIError, formatResponse, formatGroundedResponse } from './helpers/index.ts';

interface GetGenAIOptions {
  useVertexAI: boolean;
  model: string;
  project?: string;
  location?: string;
  apiVersion?: string;  // デフォルトは 'v1'。必要に応じて、呼び出し時に opts.apiVersion で別のバージョン（例：v1beta や v1alpha）を指定できます。
}

/**
 * Generate text with Gemini (Developer API) or Vertex AI, defaulting to API v1.
 */
export const getGenAIResponse = async (
  userMessage: string,
  opts: GetGenAIOptions,
) => {
  if (!userMessage?.trim()) {
    return handleAPIError(new Error('User message cannot be empty.'));
  }

  // ---- Build constructor options ----------------------------------------
  const ctorOpts = opts.useVertexAI
    ? {
        vertexai: true,
        project: opts.project,
        location: opts.location,
        apiVersion: opts.apiVersion ?? 'v1',     // デフォルトを 'v1' に変更
      }
    : {
        apiKey: GEMINI_API_KEY,
        apiVersion: opts.apiVersion ?? 'v1',     // デフォルトを 'v1' に変更
      };

  // ---- Parameter validation ---------------------------------------------
  if (opts.useVertexAI && (!opts.project || !opts.location)) {
    return handleAPIError(
      new Error('Project and location are required for Vertex AI mode.'),
    );
  }
  if (!opts.useVertexAI && !GEMINI_API_KEY) {
    return handleAPIError(
      new Error('GEMINI_API_KEY is required for Developer API mode.'),
    );
  }

  try {
    // ---- Initialize SDK --------------------------------------------------
    const ai = new GoogleGenAI(ctorOpts);

    // ---- Generate content ------------------------------------------------
    const response = await ai.models.generateContent({
      model: opts.model,
      contents: userMessage,
    });

    // ---- Extract text ----------------------------------------------------
    const text =
      typeof response.text === 'string'
        ? response.text
        : response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text) {
      throw new Error('Empty response from model.');
    }
    return formatResponse(text);
  } catch (err) {
    return handleAPIError(err);
  }
};


/**
 * ユーザープロンプトを受け取り、Google 検索を行って応答を生成します。
 */
export const getGoogleSearchResponse = async (
  userMessage: string,
  opts: GetGenAIOptions,
) => {
  if (!userMessage?.trim()) {
    return handleAPIError(new Error('User message cannot be empty.'));
  }

  // ---- SDK 初期化オプションの構築 ----------------------------------------
  const ctorOpts = opts.useVertexAI
    ? {
        vertexai: true,
        project: opts.project,
        location: opts.location,
        apiVersion: opts.apiVersion ?? 'v1',
      }
    : {
        apiKey: GEMINI_API_KEY,
        apiVersion: opts.apiVersion ?? 'v1',
      };

  // ---- パラメータ検証 --------------------------------------------------
  if (opts.useVertexAI && (!opts.project || !opts.location)) {
    return handleAPIError(
      new Error('Project and location are required for Vertex AI mode.'),
    );
  }
  if (!opts.useVertexAI && !GEMINI_API_KEY) {
    return handleAPIError(
      new Error('GEMINI_API_KEY is required for Developer API mode.'),
    );
  }

  try {
    // ---- クライアント初期化 -----------------------------------------------
    const ai = new GoogleGenAI(ctorOpts);

    // ---- Google 検索ツールの定義 -------------------------------------------
    const groundingTool = { googleSearch: {} };  // Grounding with Google Search を有効化

    // ---- 生成設定 --------------------------------------------------------
    const config = {
      tools: [groundingTool],
      temperature: 0.7,  // ランダム性を少し加える設定（0.0 〜 2.0 が指定可能）
    };

    // ---- コンテンツ生成 --------------------------------------------------
    const response = await ai.models.generateContent({
      model: opts.model,
      contents: userMessage,
      config,
    });

    // ---- 応答テキスト抽出 -----------------------------------------------
    return formatGroundedResponse(response);
  } catch (err) {
    return handleAPIError(err);
  }
};