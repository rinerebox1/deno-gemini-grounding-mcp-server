import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { GEMINI_API_KEY, handleAPIError, formatResponse } from "./helpers/index.ts";

// Define basic types for Gemini API request and response
// Based on common patterns, actual types might be more complex
interface GeminiRequestPayload {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
}

interface GeminiResponsePart {
  text: string;
}

interface GeminiResponseContent {
  parts: GeminiResponsePart[];
  role: string;
}

interface GeminiResponseCandidate {
  content: GeminiResponseContent;
  // other fields like finishReason, index, safetyRatings can be here
}

interface GeminiSuccessResponse {
  candidates: GeminiResponseCandidate[];
  // other fields like promptFeedback can be here
}

interface GeminiErrorDetail {
  code: number;
  message: string;
  status: string;
}

interface GeminiErrorResponse {
  error: GeminiErrorDetail;
}

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

/**
 * Calls the Gemini API with the user's message and returns the response.
 *
 * @param userMessage - The message from the user to send to the Gemini API.
 * @returns A Promise resolving to an object containing the formatted text response or an error.
 *
 * @example
 * const result = await getGeminiCallResponse("Hello, Gemini!");
 */
export const getGeminiCallResponse = async (userMessage: string) => {
  if (!GEMINI_API_KEY) {
    return handleAPIError(new Error("GEMINI_API_KEY is not set. Please configure it in your .env file."));
  }

  if (!userMessage || userMessage.trim() === "") {
    return handleAPIError(new Error("User message cannot be empty."));
  }

  const payload: GeminiRequestPayload = {
    contents: [
      {
        parts: [
          {
            text: userMessage,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData: GeminiSuccessResponse | GeminiErrorResponse = await response.json();

    if (!response.ok) {
      const errorResponse = responseData as GeminiErrorResponse;
      let errorMessage = `Gemini API Error: ${response.status}`;
      if (errorResponse.error && errorResponse.error.message) {
        errorMessage += ` - ${errorResponse.error.message}`;
      }
      throw new Error(errorMessage);
    }

    const successResponse = responseData as GeminiSuccessResponse;

    if (
      successResponse.candidates &&
      successResponse.candidates.length > 0 &&
      successResponse.candidates[0].content &&
      successResponse.candidates[0].content.parts &&
      successResponse.candidates[0].content.parts.length > 0 &&
      successResponse.candidates[0].content.parts[0].text
    ) {
      const geminiTextResponse = successResponse.candidates[0].content.parts[0].text;
      return formatResponse(geminiTextResponse);
    } else {
      // Handle cases where the response structure is unexpected but status was ok
      throw new Error("Gemini API returned an unexpected response structure.");
    }
  } catch (error) {
    return handleAPIError(error);
  }
};
