
import {
  supabase,
  response,
  corsHeaders,
  handleError,
} from "../_shared/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cin, password, full_name } = await req.json();

    if (!cin || !password || !full_name) {
      return response({ error: "Tous les champs sont obligatoires." }, 400);
    }

    if (!/^\d{8}$/.test(cin)) {
      return response({ error: "CIN invalide." }, 400);
    }

    if (password.length < 8) {
      return response({ error: "Mot de passe trop court." }, 400);
    }

    const { data: existing } = await supabase
      .from("parents")
      .select("id")
      .eq("cin", cin)
      .maybeSingle();

    if (existing) {
      return response({ error: "Ce CIN existe déjà." }, 409);
    }

    // Adresse interne aléatoire, jamais exposée au client.
    const authEmail = `${crypto.randomUUID()}@parents.internal`;

    const { data: userData, error: authError } =
      await supabase.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
      });

    if (authError || !userData.user) {
      throw authError ?? new Error("AUTH_CREATION_FAILED");
    }

    const { error: profileError } = await supabase
      .from("parents")
      .insert({
        id: userData.user.id,
        cin,
        full_name,
        auth_email: authEmail,
      });

    if (profileError) {
      await supabase.auth.admin.deleteUser(userData.user.id);
      throw profileError;
    }

    return response({
      message: "Compte parent créé avec succès.",
    }, 201);

  } catch (error) {
    return handleError(error);
  }
});
