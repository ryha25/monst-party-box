import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SubmittedIcon = { id: string; fingerprint: string };
type CatalogueIcon = { character_id: string; perceptual_hash: string | null };

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
    const body = await request.json() as { icons?: SubmittedIcon[] };
    const icons = body.icons?.filter((icon) => /^[0-9a-f]{16}$/i.test(icon.fingerprint)) ?? [];
    if (!icons.length) return Response.json({ error: "icons must contain 16-character hexadecimal fingerprints" }, { status: 400, headers: corsHeaders });

    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await client.from("character_icons").select("character_id, perceptual_hash").not("perceptual_hash", "is", null);
    if (error) throw error;

    const catalogue = (data ?? []) as CatalogueIcon[];
    const matches = icons.map((icon) => ({
      id: icon.id,
      candidates: catalogue
        .filter((reference) => reference.perceptual_hash)
        .map((reference) => ({ characterId: reference.character_id, distance: hammingDistance(icon.fingerprint, reference.perceptual_hash!) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
    }));
    return Response.json({ matches }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Recognition request could not be processed" }, { status: 500, headers: corsHeaders });
  }
});
