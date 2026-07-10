import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@gitquest/database";

const VALID_HERO_CLASSES = ["ASSASSIN", "MAGE", "CLERIC", "ARCHER"] as const;

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

export async function GET(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

    const url = new URL(request.url);
    const heroClassFilter = url.searchParams.get("heroClass")?.toUpperCase();

    const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

    let query = admin
      .from("player_inventory")
      .select("id, acquired_at, item_catalog:item_id(id, name, hero_class, slot, rarity, icon_url)")
      .eq("user_id", user.id)
      .order("acquired_at", { ascending: false });

    if (heroClassFilter && VALID_HERO_CLASSES.includes(heroClassFilter as (typeof VALID_HERO_CLASSES)[number])) {
      query = query.eq("item_catalog.hero_class", heroClassFilter);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const items = (data || [])
      .map((row) => {
        const catalog = Array.isArray(row.item_catalog) ? row.item_catalog[0] : row.item_catalog;
        if (!catalog) return null;
        return {
          inventoryId: row.id,
          acquiredAt: row.acquired_at,
          id: String(catalog.id),
          name: String(catalog.name),
          heroClass: String(catalog.hero_class),
          slot: String(catalog.slot),
          rarity: String(catalog.rarity),
          iconUrl: catalog.icon_url ? String(catalog.icon_url) : null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
