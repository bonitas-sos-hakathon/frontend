import { supabase, response, corsHeaders, getParent, handleError } from "../_shared/index.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
  return new Response("ok", {
    status: 200,
    headers: corsHeaders,
  });
}
  try {
    const parent = await getParent(req);
    const { child_id } = await req.json();
    if (!child_id) return response({ error: "child_id obligatoire." }, 400);
    const { data: child, error: childError } = await supabase.from("children").select("id").eq("id", child_id).eq("parent_id", parent.id).eq("is_active", true).single();
    if (childError || !child) return response({ error: "Enfant introuvable." }, 404);
    const token = crypto.randomUUID() + crypto.randomUUID();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const token_hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("child_sessions").insert({ child_id, token_hash, expires_at });
    if (error) throw error;
    return response({ token, expires_at });
  } catch (error) { return handleError(error); }
});
