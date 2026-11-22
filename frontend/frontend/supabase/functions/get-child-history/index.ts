
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
    const { child_id } = await req.json();

    const { data: child } = await supabase
      .from("children")
      .select("id, display_name")
      .eq("id", child_id)
      .eq("parent_id", parent.id)
      .single();

    if (!child) {
      return response({ error: "Enfant introuvable." }, 404);
    }

    const { data: attempts, error } = await supabase
      .from("quiz_attempts")
      .select(`
        id,
        quiz_id,
        status,
        score,
        started_at,
        completed_at,
        updated_at,
        quizzes (
          id,
          title,
          themes (
            id,
            name
          )
        )
      `)
      .eq("child_id", child_id)
      .order("started_at", { ascending: false });

    if (error) throw error;

    return response({
      child,
      attempts: attempts ?? [],
    });

  } catch (error) {
    return handleError(error);
  }
});
