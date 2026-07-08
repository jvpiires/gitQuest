import { getSupabaseAdmin } from "@gitquest/database";
import { NextResponse } from "next/server";
import { getAuthMode, readInternalSession } from "../../../_lib/session";

const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: Request) {
  if (getAuthMode() !== "internal_gitlab") {
    return NextResponse.json(
      {
        authenticated: false,
        mode: "supabase",
      },
      { status: 200 },
    );
  }

  const session = readInternalSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, gitlab_username, class_type, current_level, total_xp")
    .eq("id", session.sub)
    .maybeSingle();

  return NextResponse.json({
    authenticated: true,
    user: user ?? {
      id: session.sub,
      gitlab_username: session.gitlabUsername,
    },
    role: session.role,
    mode: "internal_gitlab",
  });
}
