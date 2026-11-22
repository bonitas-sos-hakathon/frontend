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

    const { data: children, error: childrenError } = await supabase
      .from("children")
      .select("id, parent_id, display_name, age, is_active, created_at")
      .eq("parent_id", parent.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (childrenError) throw childrenError;


    const { data: themes, error: themesError } = await supabase
      .from("themes").select("id, name, description, image_url").eq("is_active", true).order("created_at");
    if (themesError) throw themesError;

    const { data: quizzes, error: quizzesError } = await supabase
      .from("quizzes").select("id, theme_id, title, description, themes(id, name)").eq("is_active", true).order("created_at");
    if (quizzesError) throw quizzesError;

    const childIds = (children ?? []).map((child) => child.id);
    let attempts: unknown[] = [];

    if (childIds.length) {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select(`
          id, child_id, quiz_id, status, score, started_at,
          completed_at, updated_at,
          child_answers (is_correct, answered_at),
          quizzes (
            id, title, theme_id,
            themes (id, name)
          )
        `)
        .in("child_id", childIds)
        .order("started_at", { ascending: false });

      if (error) throw error;
      const quizIds = [...new Set((data ?? []).map((item) => item.quiz_id))];
      let questionRows: { quiz_id: string }[] = [];
      if (quizIds.length) {
        const { data: qRows, error: qError } = await supabase.from("questions").select("quiz_id").in("quiz_id", quizIds);
        if (qError) throw qError;
        questionRows = qRows ?? [];
      }
      const totals = new Map<string, number>();
      for (const row of questionRows) totals.set(row.quiz_id, (totals.get(row.quiz_id) ?? 0) + 1);
      attempts = (data ?? []).map((item) => ({ ...item, total_questions: totals.get(item.quiz_id) ?? 0 }));
    }

    return response({
      parent: {
        id: parent.id,
        cin: parent.cin,
        full_name: parent.full_name,
      },
      children: children ?? [],
      themes: themes ?? [],
      quizzes: quizzes ?? [],
      attempts,
    });
  } catch (error) {
    return handleError(error);
  }
});
