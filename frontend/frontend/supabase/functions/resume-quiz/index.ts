
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
      .select("*")
      .eq("id", attempt_id)
      .eq("child_id", child.id)
      .eq("status", "in_progress")
      .single();

    if (!attempt) {
      return response({ error: "Tentative introuvable." }, 404);
    }

    const { data: questions, error: questionError } = await supabase
      .from("questions")
      .select(`
        id,
        question_text,
        question_type,
        position,
        question_options (id, option_text, position)
      `)
      .eq("quiz_id", attempt.quiz_id)
      .order("position");

    if (questionError) throw questionError;

    const { data: answers, error: answerError } = await supabase
      .from("child_answers")
      .select("question_id, selected_option_id")
      .eq("attempt_id", attempt_id);

    if (answerError) throw answerError;

    const answeredIds = new Set(
      (answers ?? []).map(a => a.question_id)
    );

    const unanswered = (questions ?? [])
      .filter(q => !answeredIds.has(q.id))
      .map(q => ({
        ...q,
        question_options: [...(q.question_options ?? [])]
          .sort((a, b) => a.position - b.position),
      }));

    const currentQuestion = unanswered[0] ?? null;

    return response({
      attempt,
      answered_questions: answers,
      unanswered_questions: unanswered,
      current_question: currentQuestion,
      progress: {
        answered: answeredIds.size,
        total: questions?.length ?? 0,
      },
    });

  } catch (error) {
    return handleError(error);
  }
});
