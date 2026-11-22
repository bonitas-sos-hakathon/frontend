
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
    const { quiz_id } = await req.json();

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id, title, description, theme_id")
      .eq("id", quiz_id)
      .eq("is_active", true)
      .single();

    if (quizError || !quiz) {
      return response({ error: "Quiz introuvable." }, 404);
    }

    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("id")
      .eq("child_id", child.id)
      .eq("quiz_id", quiz_id)
      .eq("status", "in_progress")
      .maybeSingle();

    if (!attempt) {
      return response({
        error: "Démarre d'abord une tentative de quiz."
      }, 400);
    }

    const { data: questions, error } = await supabase
      .from("questions")
      .select(`
        id,
        question_text,
        question_type,
        position,
        question_options (
          id,
          option_text,
          position
        )
      `)
      .eq("quiz_id", quiz_id)
      .order("position");

    if (error) throw error;

    const result = (questions ?? []).map((question) => ({
      ...question,
      question_options: [...(question.question_options ?? [])]
        .sort((a, b) => a.position - b.position),
    }));

    return response({ quiz, questions: result });

  } catch (error) {
    return handleError(error);
  }
});
