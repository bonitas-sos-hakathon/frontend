
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

    if (!quiz_id) {
      return response({ error: "quiz_id obligatoire." }, 400);
    }

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id")
      .eq("id", quiz_id)
      .eq("is_active", true)
      .single();

    if (!quiz) {
      return response({ error: "Quiz introuvable." }, 404);
    }

    const { data: existing } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("child_id", child.id)
      .eq("quiz_id", quiz_id)
      .eq("status", "in_progress")
      .maybeSingle();

    if (existing) {
      return response({
        message: "Reprise de la tentative existante.",
        attempt: existing,
      });
    }

    const { data: attempt, error } = await supabase
      .from("quiz_attempts")
      .insert({
        child_id: child.id,
        quiz_id,
        status: "in_progress",
        current_question: 1,
        score: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return response({
      message: "Quiz démarré.",
      attempt,
    }, 201);

  } catch (error) {
    return handleError(error);
  }
});
