import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

/**
 * PROJECT CRICKET PULSE - AI LIVE NARRATOR
 * 
 * Transforms raw match data into high-intensity, "Cyber-Sport" style narration.
 */

export async function generateLiveNarration(score: any, recentBalls: any[]) {
  if (!process.env.GEMINI_API_KEY) {
    return `MATCH PULSE: ${score.team_a} vs ${score.team_b} at ${score.overs} ov. Intensity remains steady.`;
  }

  try {
    const prompt = `
      You are the "Cyber-Sport Narrator" for Cricket Pulse, an high-intensity, neon-lit, high-stakes cricket dashboard.
      Your style: Punchy, uppercase, technical but adrenaline-fueled. Use terms like "DATA UPLINK", "MOMENTUM SHIFT", "PROTOCOL", "IMPACT".
      
      Current Score: ${score.team_a} ${score.score} against ${score.team_b} (${score.overs} overs)
      Recent Ball Sequence: ${recentBalls.map(b => b.ball).join(' | ')}
      Win Probability: ${score.team_a} (${(score.win_prob_a * 100).toFixed(0)}%)
      
      TASK: Generate a single sentence (max 25 words) update that summarizes the vibe.
      Respond only with the text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error("Gemini Narration Failed:", error);
    return `TELEMETRY SYNCED: ${score.score} at ${score.overs}. PULSE DETECTED.`;
  }
}
