import { supabase, response, corsHeaders, verifySecret } from "../_shared/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { cin, pin, child_id } = await req.json();
    if (!cin || !pin) return response({ error: "Informations manquantes." }, 400);

    const { data: parent } = await supabase.from("parents").select("id").eq("cin", String(cin).trim()).maybeSingle();
    if (!parent) return response({ error: "Identifiants incorrects." }, 401);

    let query = supabase.from("children")
      .select("id, parent_id, display_name, pin_hash, age")
      .eq("parent_id", parent.id).eq("is_active", true);
    if (child_id) query = query.eq("id", child_id);
    const { data: children, error: childrenError } = await query;
    if (childrenError) throw childrenError;

    const matches = [];
    for (const child of children ?? []) {
      if (await verifySecret(String(pin), child.pin_hash)) matches.push(child);
    }
    if (!matches.length) return response({ error: "Identifiants incorrects." }, 401);
    if (!child_id && matches.length > 1) {
      return response({ requires_child_selection: true, children: matches.map(({ id, display_name }) => ({ id, display_name })) });
    }
    const child = matches[0];

    const rawToken = crypto.randomUUID() + crypto.randomUUID();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("child_sessions").insert({ child_id: child.id, token_hash: tokenHash, expires_at: expiresAt });
    if (error) throw error;
    return response({ message: "Connexion réussie.", child: { id: child.id, display_name: child.display_name }, token: rawToken, expires_at: expiresAt });
  } catch (error) {
    console.error(error);
    return response({ error: "Erreur de connexion." }, 500);
  }
});
