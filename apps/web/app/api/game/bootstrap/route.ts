import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@gitquest/database";
import { syncGithubXpForUser } from "../../_lib/github-sync";

const githubAvatarFromUsername = (username?: string | null) => {
  if (!username) return null;
  return `https://avatars.githubusercontent.com/${encodeURIComponent(username)}?size=128`;
};

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseFromCookies = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // noop
            }
          },
        },
      }
    );

    let {
      data: { user },
      error: authError,
    } = await supabaseFromCookies.auth.getUser();

    if (authError || !user) {
      const authHeader = request.headers.get("authorization");
      const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

      if (!bearer) {
        return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
      }

      const { data, error } = await supabaseFromCookies.auth.getUser(bearer);
      user = data.user;
      authError = error;
    }

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    try {
      await syncGithubXpForUser(user.id);
    } catch (syncError) {
      console.error("Sync automático falhou no bootstrap:", syncError);
    }

    const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const [{ data: currentProfile }, { data: worldProfiles }, { data: worldGuilds }, { data: currentMembership }] = await Promise.all([
      admin
        .from("profiles")
        .select("id, github_username, total_xp, avatar_url, class_type, tech_stack, avatar_style")
        .eq("id", user.id)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("id, github_username, total_xp, class_type, avatar_style, avatar_url")
        .order("total_xp", { ascending: false })
        .limit(16),
      admin.from("guilds").select("id, name, icon_url").order("name"),
      admin.from("guild_members").select("guild_id").eq("user_id", user.id).limit(1),
    ]);

    const profile: {
      id: string;
      github_username: string;
      total_xp: number;
      class_type?: string | null;
      tech_stack?: string[] | null;
      avatar_style?: string | null;
      avatar_url?: string | null;
    } =
      currentProfile ||
      {
        id: user.id,
        github_username: user.user_metadata?.user_name || user.email?.split("@")[0] || "aventureiro",
        total_xp: 0,
        class_type: "MAGE",
        avatar_style: "classic",
        avatar_url: null,
      };

    profile.avatar_url = profile.avatar_url || githubAvatarFromUsername(profile.github_username);

    const world = (worldProfiles || []).map((item) => ({
      ...item,
      avatar_url: item.avatar_url || githubAvatarFromUsername(item.github_username),
      isCurrentPlayer: item.id === user.id,
    }));

    return NextResponse.json(
      {
        ok: true,
        profile,
        world,
        guilds: worldGuilds || [],
        currentGuildId: currentMembership?.[0]?.guild_id || null,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
