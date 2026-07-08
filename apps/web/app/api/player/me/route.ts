import { getSupabaseAdmin } from "@gitquest/database";
import { NextResponse } from "next/server";
import { getAuthMode, readInternalSession } from "../../_lib/session";

const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: Request) {
  if (getAuthMode() !== "internal_gitlab") {
    return NextResponse.json(
      { error: "Rota disponível apenas no modo internal_gitlab." },
      { status: 400 },
    );
  }

  const session = readInternalSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select(
      "id, gitlab_username, class_type, current_level, total_xp, available_boxes, boxes_opened",
    )
    .eq("id", session.sub)
    .maybeSingle();

  const hasCharacter = Boolean(user?.class_type);
  const resolvedUsername =
    typeof user?.gitlab_username === "string" ? user.gitlab_username : session.gitlabUsername;

  return NextResponse.json({
    authenticated: true,
    hasCharacter,
    role: session.role,
    user: user ?? {
      id: session.sub,
      gitlab_username: resolvedUsername,
      class_type: null,
      current_level: 1,
      total_xp: 0,
      available_boxes: 0,
      boxes_opened: 0,
    },
  });
}
