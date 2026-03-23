import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

/**
 * PROJECT CRICKET PULSE - AI MODERATION & SENTIMENT ENGINE
 * 
 * Moderates chat content and detects high-sentiment 'Expert Analysis' 
 * messages in background/batch-friendly manner.
 */

export interface AnalysisResult {
  sentiment_score: number;
  is_hype_insight: boolean;
  moderated_content: string;
}

export async function analyzeHypeChat(content: string, matchContext: string): Promise<AnalysisResult> {
  try {
    const prompt = `
      Perform real-time sentiment analysis and moderation for a high-adrenaline cricket match chat.
      Match Context: ${matchContext}
      User Message: "${content}"

      Criteria:
      - sentiment_score: 0.0 to 1.0 (1.0 is highest hype/positivity).
      - is_hype_insight: true if the message contains genuine tactical insight or prediction (>0.8 sentiment required).
      - moderated_content: Cleaned version of the message if needed.

      Return ONLY a JSON object:
      {
        "sentiment_score": number,
        "is_hype_insight": boolean,
        "moderated_content": string
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{.*\}/s);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Extra logic: Pin if sentiment is extremely high as per contract
      const isExpert = parsed.sentiment_score > 0.8;
      
      return {
        sentiment_score: parsed.sentiment_score,
        is_hype_insight: isExpert,
        moderated_content: parsed.moderated_content || content,
      };
    }

    return {
      sentiment_score: 0.5,
      is_hype_insight: false,
      moderated_content: content
    };
  } catch (error) {
    console.error("Gemini AI Analysis Failed:", error);
    return {
      sentiment_score: 0.5,
      is_hype_insight: false,
      moderated_content: content
    };
  }
}

// Batch processor helper for background execution
export async function analyzeBatch(messages: { content: string; context: string }[]) {
  return Promise.all(messages.map(m => analyzeHypeChat(m.content, m.context)));
}
