import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  rollItemForClass,
  ITEMS_BY_ID,
  type GameItem,
} from "@gitquest/database";

// Cliente admin (service role) para gravar o item ignorando o RLS.
const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(
        "🚨 SUPABASE_SERVICE_ROLE_KEY ausente — configure no .env.local e reinicie o dev server.",
      );
      return NextResponse.json(
        { error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { userId?: string };
    const userId = body.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório." },
        { status: 400 },
      );
    }

    // Busca o jogador e valida saldo de caixas.
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError || !user) {
      console.error(
        `🚨 Luckbox: jogador ${userId} não encontrado.`,
        fetchError,
      );
      return NextResponse.json(
        { error: "Jogador não encontrado." },
        { status: 404 },
      );
    }

    if ((user.available_boxes ?? 0) <= 0) {
      return NextResponse.json(
        { error: "Nenhuma luckbox disponível." },
        { status: 400 },
      );
    }

    // Sorteia um item da classe do jogador. Evita repetir item já possuído:
    // tenta algumas vezes e, se todos repetirem, entrega o sorteado mesmo assim.
    const { data: owned } = await supabaseAdmin
      .from("user_items")
      .select("item_id")
      .eq("user_id", userId);

    const ownedIds = new Set((owned ?? []).map((r) => r.item_id as string));

    let item: GameItem = rollItemForClass(user.class_type);
    for (let attempt = 0; attempt < 8 && ownedIds.has(item.id); attempt++) {
      item = rollItemForClass(user.class_type);
    }
    const isDuplicate = ownedIds.has(item.id);

    // Debita a caixa (sempre) e registra o item (se for novo).
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        available_boxes: (user.available_boxes ?? 0) - 1,
        boxes_opened: (user.boxes_opened ?? 0) + 1,
      })
      .eq("id", userId);

    if (updateError) {
      throw new Error("Falha ao debitar a luckbox.");
    }

    if (!isDuplicate) {
      const { error: insertError } = await supabaseAdmin
        .from("user_items")
        .insert({
          user_id: userId,
          item_id: item.id,
          slot: item.slot,
          equipped: false,
        });

      if (insertError) {
        throw new Error("Falha ao registrar o item.");
      }
    }

    // Retorna o item completo (do catálogo) para a animação da luckbox.
    return NextResponse.json({
      item: ITEMS_BY_ID[item.id],
      duplicate: isDuplicate,
      available_boxes: (user.available_boxes ?? 0) - 1,
    });
  } catch (error) {
    console.error("Erro ao abrir luckbox:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
