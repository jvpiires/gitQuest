import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@gitquest/database";
import { getProgression } from "../../src/lib/game/progression";

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

export async function GET(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

    const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("total_xp")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);

    const totalXp = profile?.total_xp || 0;
    await ensureLuckboxesForUser(user.id, totalXp);

    const [{ count: totalCount, error: totalError }, { count: openedCount, error: openedError }] = await Promise.all([
      admin.from("luckboxes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin
        .from("luckboxes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("opened_at", "is", null),
    ]);

    if (totalError) throw new Error(totalError.message);
    if (openedError) throw new Error(openedError.message);

    const total = totalCount || 0;
    const opened = openedCount || 0;

    return NextResponse.json({
      total,
      opened,
      available: Math.max(0, total - opened),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
