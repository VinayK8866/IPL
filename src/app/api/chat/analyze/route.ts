import { analyzeHypeChat } from "@/lib/gemini/moderator";
import { supabase } from "@/lib/supabaseClient";

/**
 * Chat Analysis API Route
 * 
 * background service to analyze chat messages using Gemini Pro.
 * Updates the Supabase record with sentiment score and expert status.
 */

export async function POST(req: Request) {
  try {
    const { messageId, content, matchContext } = await req.json();

    if (!messageId || !content) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Call Gemini Moderator Utility
    const result = await analyzeHypeChat(content, matchContext);

    // Update in Supabase (Assumes RLS allows this or using service role)
    // For this prototype, we update the existing message record.
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({
        sentiment_score: result.sentiment_score,
        is_hype_insight: result.is_hype_insight,
        content: result.moderated_content
      })
      .eq('id', messageId);

    if (updateError) throw updateError;

    return Response.json({ 
      success: true, 
      is_expert: result.is_hype_insight,
      score: result.sentiment_score 
    });

  } catch (error) {
    console.error("Chat Analysis Error:", error);
    return Response.json({ error: "Analysis failed" }, { status: 500 });
  }
}
