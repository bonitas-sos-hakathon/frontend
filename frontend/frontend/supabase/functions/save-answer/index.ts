
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

    const { attempt_id, question_id, selected_option_id } =
      await req.json();

    if (!attempt_id || !question_id || !selected_option_id) {
      return response({ error: "Données manquantes." }, 400);
    }

    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, status")
      .eq("id", attempt_id)
      .eq("child_id", child.id)
      .eq("status", "in_progress")
      .single();

    if (!attempt) {
      return response({ error: "Tentative introuvable ou terminée." }, 404);
    }

    const { data: question } = await supabase
      .from("questions")
      .select("id")
      .eq("id", question_id)
      .eq("quiz_id", attempt.quiz_id)
      .single();

    if (!question) {
      return response({ error: "Question invalide." }, 400);
    }

    const { data: option } = await supabase
      .from("question_options")
      .select("id")
      .eq("id", selected_option_id)
      .eq("question_id", question_id)
      .single();

    if (!option) {
      return response({ error: "Option invalide." }, 400);
    }

    const { data: answerKey, error: keyError } = await supabase
      .from("question_answer_keys")
      .select("correct_option_id")
      .eq("question_id", question_id)
      .single();

    if (keyError || !answerKey) {
      return response({ error: "Correction indisponible." }, 500);
    }

    const isCorrect =
      answerKey.correct_option_id === selected_option_id;

    const { error: saveError } = await supabase
      .from("child_answers")
      .upsert({
        attempt_id,
        question_id,
        selected_option_id,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "attempt_id,question_id",
      });

    if (saveError) throw saveError;

    // Recalculer le score à partir des réponses enregistrées.
    const { data: answers, error: answersError } = await supabase
      .from("child_answers")
      .select("is_correct")
      .eq("attempt_id", attempt_id);

    if (answersError) throw answersError;

    const score = (answers ?? []).filter(a => a.is_correct).length;

    const { error: updateError } = await supabase
      .from("quiz_attempts")
      .update({
        score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt_id);

    if (updateError) throw updateError;

    // Ne jamais révéler la correction ou le score pendant le quiz.
   return response({
  saved: true,
  is_correct: isCorrect,
});

  } catch (error) {
    return handleError(error);
  }
});
