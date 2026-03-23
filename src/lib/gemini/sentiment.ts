import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

/**
 * PROJECT CRICKET PULSE - AI CHAT MODERATION
 * 
 * Analyzes chat messages for:
 * 1. Sentiment (0-1)
 * 2. Expert Insight (boolean)
 * 3. Hype Detection
 */

export async function analyzeChatMessage(content: string, context: string) {
  try {
    const prompt = `
      Analyze this cricket chat message: "${content}"
      Context: ${context} (current match situation)
      
      Respond only with a JSON object:
      {
        "sentiment_score": float (0 to 1, 1 is extremely positive/hype),
        "is_expert_insight": boolean (true if it contains tactical analysis or deep match knowledge),
        "clean_content": string (filtered/moderated version)
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Simple JSON extraction from response
    const jsonStr = text.match(/\{.*\}/s);
    if (jsonStr) {
      return JSON.parse(jsonStr[0]);
    }
    
    return {
      sentiment_score: 0.5,
      is_expert_insight: false,
      clean_content: content
    };
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      sentiment_score: 0.5,
      is_expert_insight: false,
      clean_content: content
    };
  }
}
