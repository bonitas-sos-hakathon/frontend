
import {
  supabase,
  response,
  corsHeaders,
  getParent,
  handleError,
} from "../_shared/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parent = await getParent(req);
    const { child_id, attempt_id } = await req.json();

    // Vérifier que l'enfant appartient au parent.
    const { data: child } = await supabase
      .from("children")
      .select("id, display_name")
      .eq("id", child_id)
      .eq("parent_id", parent.id)
      .single();

    if (!child) {
      return response({ error: "Enfant introuvable." }, 404);
    }

    // Récupérer la tentative de cet enfant.
    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select(`
        id,
        quiz_id,
        status,
        score,
        started_at,
        completed_at,
        quizzes (
          id,
          title,
          description
        )
      `)
      .eq("id", attempt_id)
      .eq("child_id", child_id)
      .single();

    if (!attempt) {
      return response({ error: "Tentative introuvable." }, 404);
    }

    // Récupérer toutes les questions du quiz.
    const { data: questions, error: questionError } = await supabase
      .from("questions")
      .select(`
        id,
        question_text,
        position,
        question_options (
          id,
          option_text,
          position
        )
      `)
      .eq("quiz_id", attempt.quiz_id)
      .order("position");

    if (questionError) throw questionError;

    // Récupérer les réponses de l'enfant.
    const { data: answers, error: answerError } = await supabase
      .from("child_answers")
      .select("question_id, selected_option_id, is_correct, answered_at")
      .eq("attempt_id", attempt_id);

    if (answerError) throw answerError;

    const answerMap = new Map(
      (answers ?? []).map(answer => [answer.question_id, answer])
    );

    // Construire le rapport avec les bonnes réponses.
    const detailedQuestions = await Promise.all(
      (questions ?? []).map(async question => {

        const { data: answerKey, error: keyError } = await supabase
          .from("question_answer_keys")
          .select("correct_option_id")
          .eq("question_id", question.id)
          .single();

        if (keyError) throw keyError;

        const answer = answerMap.get(question.id);

        const options = [...(question.question_options ?? [])]
          .sort((a, b) => a.position - b.position);

        return {
          question_id: question.id,
          question_text: question.question_text,

          options,

          selected_option_id: answer?.selected_option_id ?? null,

          selected_answer: options.find(
            option => option.id === answer?.selected_option_id
          )?.option_text ?? null,

          correct_option_id: answerKey.correct_option_id,

          correct_answer: options.find(
            option => option.id === answerKey.correct_option_id
          )?.option_text ?? null,

          is_correct: answer?.is_correct ?? null,

          answered: Boolean(answer),

          answered_at: answer?.answered_at ?? null,
        };
      })
    );

    const total = detailedQuestions.length;
    const answered = detailedQuestions.filter(q => q.answered).length;
    const correct = detailedQuestions.filter(q => q.is_correct === true).length;
    const incorrect = detailedQuestions.filter(q => q.is_correct === false).length;

    return response({
      child,
      attempt,
      statistics: {
        total_questions: total,
        answered_questions: answered,
        unanswered_questions: total - answered,
        correct_answers: correct,
        incorrect_answers: incorrect,
        score: correct,
        percentage: total
          ? Math.round((correct / total) * 100)
          : 0,
      },
      questions: detailedQuestions,
    });

  } catch (error) {
    return handleError(error);
  }
});
