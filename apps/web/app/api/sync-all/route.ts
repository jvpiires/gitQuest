import { NextResponse } from "next/server";
import { GITLAB_TOKEN, syncAllUsers } from "../_lib/sync";

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
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "SYNC_SECRET obrigatório em produção." },
        { status: 500 },
      );
    }

    const synced = await syncAllUsers();
    return NextResponse.json({
      synced: synced.length,
      users: synced,
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
