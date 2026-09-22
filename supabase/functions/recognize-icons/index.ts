import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SubmittedIcon = { id: string; fingerprint: string };
type CatalogueIcon = { character_id: string; perceptual_hash: string; characters: { name: string } | null };
type PersonalReference = { character_id: string; character_name: string; perceptual_hash: string };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function hammingDistance(left: string, right: string) {
  let bits = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (bits) { distance += Number(bits & 1n); bits >>= 1n; }
  return distance;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await request.json() as { action?: "recognize" | "register"; icons?: SubmittedIcon[]; reference?: { characterId: string; characterName: string; fingerprint: string; imageBase64: string } };
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { data: authData, error: authError } = token ? await client.auth.getUser(token) : { data: { user: null }, error: null };
    if (authError || !authData.user) return Response.json({ error: "Sign in is required" }, { status: 401, headers: corsHeaders });

    if (body.action === "register") {
      const reference = body.reference;
      if (!reference || !/^[0-9a-f]{16}$/i.test(reference.fingerprint) || !reference.characterId || !reference.characterName || !/^[A-Za-z0-9+/=]+$/.test(reference.imageBase64) || reference.imageBase64.length > 1_500_000) {
        return Response.json({ error: "Invalid icon reference" }, { status: 400, headers: corsHeaders });
      }
      const bytes = Uint8Array.from(atob(reference.imageBase64), (char) => char.charCodeAt(0));
      const storagePath = `${authData.user.id}/${encodeURIComponent(reference.characterId)}/${reference.fingerprint}.jpg`;
      const { error: uploadError } = await client.storage.from("personal-icon-references").upload(storagePath, bytes, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;
      const { error: insertError } = await client.from("personal_icon_references").upsert({ user_id: authData.user.id, character_id: reference.characterId, character_name: reference.characterName, storage_path: storagePath, perceptual_hash: reference.fingerprint }, { onConflict: "user_id,character_id,perceptual_hash" });
      if (insertError) throw insertError;
      return Response.json({ saved: true }, { headers: corsHeaders });
    }

    const icons = body.icons?.filter((icon) => /^[0-9a-f]{16}$/i.test(icon.fingerprint)) ?? [];
    if (!icons.length) return Response.json({ error: "icons must contain 16-character hexadecimal fingerprints" }, { status: 400, headers: corsHeaders });

    // Officially sourced, canonical references are shared by every user. Personal
    // references remain a helpful supplement for a screenshot's device-specific UI.
    const [{ data: catalogueData, error: catalogueError }, { data: personalData, error: personalError }] = await Promise.all([
      client.from("character_icons").select("character_id, perceptual_hash, characters(name)").not("perceptual_hash", "is", null),
      client.from("personal_icon_references").select("character_id, character_name, perceptual_hash").eq("user_id", authData.user.id)
    ]);
    if (catalogueError) throw catalogueError;
    if (personalError) throw personalError;
    const canonical = (catalogueData ?? []) as CatalogueIcon[];
    const personal = (personalData ?? []) as PersonalReference[];
    const references = [
      ...canonical.map((reference) => ({ characterId: reference.character_id, characterName: reference.characters?.name || reference.character_id, fingerprint: reference.perceptual_hash, source: "catalogue" })),
      ...personal.map((reference) => ({ characterId: reference.character_id, characterName: reference.character_name, fingerprint: reference.perceptual_hash, source: "personal" }))
    ];
    const matches = icons.map((icon) => ({
      id: icon.id,
      candidates: references
        .map((reference) => ({ characterId: reference.characterId, characterName: reference.characterName, distance: hammingDistance(icon.fingerprint, reference.fingerprint), source: reference.source }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
    }));
    return Response.json({ matches }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Recognition request could not be processed" }, { status: 500, headers: corsHeaders });
  }
});
