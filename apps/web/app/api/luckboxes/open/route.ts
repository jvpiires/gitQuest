import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@gitquest/database";
import { getProgression, ITEM_CATALOG, rollRarity } from "../../../src/lib/game/progression";

const VALID_HERO_CLASSES = ["ASSASSIN", "MAGE", "CLERIC", "ARCHER"] as const;

const ensureLuckboxesForUser = async (userId: string, totalXp: number) => {
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const earned = getProgression(totalXp).luckboxesEarned;

  const { count, error: countError } = await admin
    .from("luckboxes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) throw new Error(countError.message);

  const existingCount = count || 0;
  if (existingCount >= earned) return;

  const missing = earned - existingCount;
  const rows = Array.from({ length: missing }).map((_, index) => ({
    user_id: userId,
    source_level: (existingCount + index + 1) * 5,
  }));

  const { error: insertError } = await admin.from("luckboxes").insert(rows);
  if (insertError) throw new Error(insertError.message);
};

const authenticateUser = async (request: Request) => {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // noop
          }
        },
      },
    }
  );

  let {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (bearer) {
      const { data, error: bearerError } = await supabase.auth.getUser(bearer);
      user = data.user;
      error = bearerError;
    }
  }

  if (error || !user) return null;
  return user;
};

export async function POST(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { heroClass?: string };
    const heroClass = body.heroClass?.toUpperCase();
    if (!heroClass || !VALID_HERO_CLASSES.includes(heroClass as (typeof VALID_HERO_CLASSES)[number])) {
      return NextResponse.json({ error: "Classe invalida." }, { status: 400 });
    }

    const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("total_xp")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);

    await ensureLuckboxesForUser(user.id, profile?.total_xp || 0);

    const { data: luckbox, error: luckboxError } = await admin
      .from("luckboxes")
      .select("id")
      .eq("user_id", user.id)
      .is("opened_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (luckboxError) throw new Error(luckboxError.message);
    if (!luckbox) {
      return NextResponse.json({ error: "Sem caixas disponiveis." }, { status: 400 });
    }

    const rarity = rollRarity();
    const options = ITEM_CATALOG.filter((item) => item.heroClass === heroClass && item.rarity === rarity);
    const drop = options[Math.floor(Math.random() * options.length)] || ITEM_CATALOG.find((item) => item.heroClass === heroClass);

    if (!drop) {
      return NextResponse.json({ error: "Nao foi possivel gerar item." }, { status: 400 });
    }

    const { error: catalogError } = await admin.from("item_catalog").upsert(
      {
        id: drop.id,
        name: drop.name,
        hero_class: drop.heroClass,
        slot: drop.slot,
        rarity: drop.rarity,
      },
      { onConflict: "id" }
    );

    if (catalogError) throw new Error(catalogError.message);

    const { error: inventoryError } = await admin.from("player_inventory").insert({
      user_id: user.id,
      item_id: drop.id,
      equipped_slot: null,
    });

    if (inventoryError) throw new Error(inventoryError.message);

    const { error: openError } = await admin.from("luckboxes").update({ opened_at: new Date().toISOString() }).eq("id", luckbox.id);
    if (openError) throw new Error(openError.message);

    const { count: availableCount, error: availableError } = await admin
      .from("luckboxes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("opened_at", null);

    if (availableError) throw new Error(availableError.message);

    return NextResponse.json({
      drop: {
        id: drop.id,
        name: drop.name,
        heroClass: drop.heroClass,
        rarity: drop.rarity,
        slot: drop.slot,
      },
      available: availableCount || 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
