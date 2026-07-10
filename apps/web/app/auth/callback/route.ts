import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@gitquest/database";

async function fetchTopLanguages(username: string): Promise<string[]> {
  try {
    const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=50&sort=pushed`, {
      headers: { "User-Agent": "GitQuest-App" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const repos = await res.json();
    const languageCounts: Record<string, number> = {};

    repos.forEach((repo: { language?: string | null }) => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    });

    return Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((entry) => entry[0]);
  } catch (error) {
    console.error("Erro ao buscar repositórios:", error);
    return [];
  }
}

async function fetchGithubAvatar(username: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: { "User-Agent": "GitQuest-App" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    const user = await res.json();
    return typeof user.avatar_url === "string" ? user.avatar_url : null;
  } catch (error) {
    console.error("Erro ao buscar avatar do GitHub:", error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
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
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // noop when setting cookies from server components is not available
            }
          },
        },
      }
    );

    const {
      data: { session },
    } = await supabase.auth.exchangeCodeForSession(code);

    if (session?.user) {
      const githubUsername =
        session.user.user_metadata.user_name || session.user.user_metadata.preferred_username;

      if (githubUsername) {
        const [topStack, avatarUrl] = await Promise.all([
          fetchTopLanguages(githubUsername),
          fetchGithubAvatar(githubUsername),
        ]);

        const payload: { tech_stack?: string[]; avatar_url?: string } = {};
        if (topStack.length > 0) payload.tech_stack = topStack;
        payload.avatar_url = avatarUrl || `https://avatars.githubusercontent.com/${encodeURIComponent(githubUsername)}?size=128`;

        if (Object.keys(payload).length > 0) {
          const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
          await supabaseAdmin.from("profiles").update(payload).eq("id", session.user.id);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/game`);
}
