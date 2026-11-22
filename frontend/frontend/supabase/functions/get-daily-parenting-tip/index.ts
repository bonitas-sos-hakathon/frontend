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
    await getParent(req);

    const { data: tips, error } = await supabase
      .from("parenting_tips")
      .select("id, title, content, category, example")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;
    if (!tips?.length) return response({ tip: null });

    // La date est calculée dans le fuseau tunisien pour tous les parents.
    const dateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Tunis",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const part = (type: string) => dateParts.find((p) => p.type === type)?.value;
    const today = `${part("year")}-${part("month")}-${part("day")}`;
    const dayNumber = Math.floor(
      (Date.parse(`${today}T00:00:00Z`) - Date.parse("2026-01-01T00:00:00Z")) /
      86400000
    );
    const index = ((dayNumber % tips.length) + tips.length) % tips.length;

    return response({ date: today, tip: tips[index] });
  } catch (error) {
    return handleError(error);
  }
});
