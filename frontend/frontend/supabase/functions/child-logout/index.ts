
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
    const { session } = await getChild(req);

    const { error } = await supabase
      .from("child_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", session.id);

    if (error) throw error;

    return response({ message: "Déconnexion réussie." });

  } catch (error) {
    return handleError(error);
  }
});
