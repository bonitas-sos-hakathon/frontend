import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders as supabaseCorsHeaders } from "npm:@supabase/supabase-js@2/cors";

export const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const corsHeaders = {
  ...supabaseCorsHeaders,
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    `${supabaseCorsHeaders["Access-Control-Allow-Headers"]}, x-child-session, x-retry-count, traceparent, tracestate, baggage`,
  "Access-Control-Allow-Methods":
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

export function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export async function readBody(req: Request) {
  return await req.json();
}

// Vérifier que la requête vient d'un parent connecté.
export async function getParent(req: Request) {
  const authorization = req.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authorization.replace("Bearer ", "");

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: parent, error: parentError } = await supabase
    .from("parents")
    .select("id, cin, full_name, auth_email")
    .eq("id", data.user.id)
    .single();

  if (parentError || !parent) {
    throw new Error("PARENT_NOT_FOUND");
  }

  return parent;
}

// Générer un hash sécurisé pour le PIN.
// PBKDF2 est disponible nativement dans Deno.
export async function hashSecret(secret: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 310000,
      hash: "SHA-256",
    },
    key,
    256
  );

  const toHex = (bytes: Uint8Array) =>
    Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");

  return `${toHex(salt)}:${toHex(new Uint8Array(bits))}`;
}

export async function verifySecret(secret: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");

  if (!saltHex || !hashHex) return false;

  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
  );

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 310000,
      hash: "SHA-256",
    },
    key,
    256
  );

  const result = Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return result === hashHex;
}

// Vérifier la session d'un enfant.
export async function getChild(req: Request) {
  const token = req.headers.get("x-child-session");

  if (!token) throw new Error("UNAUTHORIZED");

  // Comparer le hash du token, jamais le token brut.
  const tokenHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  const tokenHex = Array.from(new Uint8Array(tokenHash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const { data: session, error: sessionError } = await supabase
    .from("child_sessions")
    .select("id, child_id")
    .eq("token_hash", tokenHex)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (sessionError || !session) throw new Error("UNAUTHORIZED");

  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id, parent_id, display_name, is_active")
    .eq("id", session.child_id)
    .eq("is_active", true)
    .single();

  if (childError || !child) throw new Error("CHILD_NOT_FOUND");

  return { child, session };
}

export function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : "SERVER_ERROR";

  const status = message === "UNAUTHORIZED" ? 401 :
    message === "PARENT_NOT_FOUND" || message === "CHILD_NOT_FOUND" ? 404 :
    400;

  return response({ error: message }, status);
}

