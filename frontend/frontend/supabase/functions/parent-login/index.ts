
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
    const { cin, password } = await req.json();

    if (!cin || !password) {
      return response({ error: "CIN et mot de passe obligatoires." }, 400);
    }

    const { data: parent, error: parentError } = await supabase
      .from("parents")
      .select("id, cin, full_name, auth_email")
      .eq("cin", cin)
      .maybeSingle();

    if (parentError || !parent) {
      return response({ error: "Identifiants incorrects." }, 401);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parent.auth_email,
      password,
    });

    if (error || !data.session) {
      return response({ error: "Identifiants incorrects." }, 401);
    }

    return response({
      message: "Connexion réussie.",
      parent: {
        id: parent.id,
        full_name: parent.full_name,
        cin: parent.cin,
      },
      session: data.session,
    });

  } catch (error) {
    return handleError(error);
  }
});
