
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

    const { data, error } = await supabase
      .from("children")
      .update({ is_active: false })
      .eq("id", child_id)
      .eq("parent_id", parent.id)
      .select("id")
      .single();

    if (error || !data) {
      return response({ error: "Enfant introuvable." }, 404);
    }

    await supabase
      .from("child_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("child_id", child_id)
      .is("revoked_at", null);

    return response({ message: "Profil désactivé." });

  } catch (error) {
    return handleError(error);
  }
});
