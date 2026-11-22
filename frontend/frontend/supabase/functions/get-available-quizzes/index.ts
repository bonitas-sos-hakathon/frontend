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

    const { data: themes, error: themesError } = await supabase
      .from("themes")
      .select("id, name, description, image_url")
      .eq("is_active", true)
      .order("created_at");

    if (themesError) throw themesError;

    const { data: quizzes, error: quizzesError } = await supabase
      .from("quizzes")
      .select("id, theme_id, title, description")
      .eq("is_active", true)
      .order("created_at");

    if (quizzesError) throw quizzesError;

    const result = (themes ?? []).map((theme) => ({
      ...theme,
      quizzes: (quizzes ?? []).filter((quiz) => quiz.theme_id === theme.id),
    }));

    const { data: attempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, status, score, started_at, completed_at, quizzes(title, theme_id, themes(id, name))")
      .eq("child_id", child.id)
      .order("started_at", { ascending: false });
    if (attemptsError) throw attemptsError;

    const { data: childProfile, error: childProfileError } = await supabase
      .from("children").select("id, display_name, age").eq("id", child.id).single();
    if (childProfileError) throw childProfileError;

    const quizIds = [...new Set((attempts ?? []).map((attempt) => attempt.quiz_id))];
    let questionRows: { quiz_id: string }[] = [];
    if (quizIds.length) {
      const { data: rows, error: rowsError } = await supabase.from("questions").select("quiz_id").in("quiz_id", quizIds);
      if (rowsError) throw rowsError;
      questionRows = rows ?? [];
    }
    const totals = new Map<string, number>();
    for (const row of questionRows) totals.set(row.quiz_id, (totals.get(row.quiz_id) ?? 0) + 1);
    const attemptsWithTotals = (attempts ?? []).map((attempt) => ({ ...attempt, total_questions: totals.get(attempt.quiz_id) ?? 0 }));

    return response({ child: childProfile, themes: result, attempts: attemptsWithTotals });
  } catch (error) {
    return handleError(error);
  }
});
