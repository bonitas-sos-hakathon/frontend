
import {
  supabase,
  response,
  corsHeaders,
  getChild,
  handleError,
} from "../_shared/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { child } = await getChild(req);
    const { attempt_id } = await req.json();

    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, status")
      .eq("id", attempt_id)
      .eq("child_id", child.id)
      .eq("status", "in_progress")
      .single();

    if (!attempt) {
      return response({ error: "Tentative introuvable." }, 404);
    }

    const { count: totalQuestions, error: countError } =
      await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("quiz_id", attempt.quiz_id);

    if (countError) throw countError;

    const { data: answers, error: answerError } = await supabase
      .from("child_answers")
      .select("is_correct")
      .eq("attempt_id", attempt_id);

    if (answerError) throw answerError;

    const answered = answers?.length ?? 0;

    if (answered < (totalQuestions ?? 0)) {
      return response({
        error: "Toutes les questions ne sont pas encore répondues.",
        answered,
        total: totalQuestions,
      }, 400);
    }

    const score = (answers ?? []).filter(a => a.is_correct).length;

    const { data: completed, error } = await supabase
      .from("quiz_attempts")
      .update({
        status: "completed",
        score,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt_id)
      .eq("child_id", child.id)
      .select()
      .single();

    if (error) throw error;

    return response({
      message: "Quiz terminé.",
      attempt: completed,
      score,
      total: totalQuestions,
      percentage: totalQuestions
        ? Math.round((score / totalQuestions) * 100)
        : 0,
    });

  } catch (error) {
    return handleError(error);
  }
});
