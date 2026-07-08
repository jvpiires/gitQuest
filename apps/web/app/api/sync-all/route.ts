import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@gitquest/database";
import { GITLAB_TOKEN, syncAllUsers } from "../_lib/sync";
import { getAuthMode, readInternalSession } from "../_lib/session";

const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function isAuthorized(request: Request): Promise<boolean> {
  if (getAuthMode() === "internal_gitlab") {
    const session = readInternalSession(request);
    if (session?.role === "admin") {
      return true;
    }
  }

  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) return false;

  const secret = process.env.SYNC_SECRET;
  if (secret && token === secret) {
    return true;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return !error && Boolean(data.user);
}

// Sincroniza a XP de TODOS os jogadores com o GitLab de uma só vez.
// Ideal para rodar periodicamente (cron/agendador) ou sob demanda por um admin,
// em vez de sobrecarregar o GitLab a cada reload de página.
//
// Protegida por um segredo simples: envie o header
//   Authorization: Bearer <SYNC_SECRET>
// (defina SYNC_SECRET no .env.local). Se SYNC_SECRET não estiver configurado,
// a rota fica liberada apenas em desenvolvimento.
export async function POST(request: Request) {
  try {
    if (!GITLAB_TOKEN) {
      return NextResponse.json(
        { error: "GITLAB_TOKEN não configurado no servidor." },
        { status: 500 },
      );
    }

    const secret = process.env.SYNC_SECRET;
    if (secret) {
      const authorized = await isAuthorized(request);
      if (!authorized) {
        return NextResponse.json(
          {
            error:
              "Não autorizado. Use Authorization: Bearer <SYNC_SECRET> ou um token de sessão válido.",
          },
          { status: 401 },
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "SYNC_SECRET obrigatório em produção." },
        { status: 500 },
      );
    }

    const { syncedUsers, failedCount } = await syncAllUsers();
    return NextResponse.json({
      synced: syncedUsers.length,
      failed: failedCount,
      users: syncedUsers,
    });
  } catch (error) {
    console.error("Erro no sync-all:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Permite disparar via GET também (ex.: cron/uptime-monitor que só faz GET).
export async function GET(request: Request) {
  return POST(request);
}
