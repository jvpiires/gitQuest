import { NextResponse } from "next/server";
import { getSupabaseAdmin, ITEMS_BY_ID } from "@gitquest/database";

const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Equipa (ou desequipa) um item do jogador. Ao equipar, desequipa o item que
// ocupava o mesmo slot, garantindo um item por slot.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      itemId?: string;
      equip?: boolean;
    };
    const { userId, itemId, equip } = body;

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: "userId e itemId são obrigatórios." },
        { status: 400 },
      );
    }

    const item = ITEMS_BY_ID[itemId];
    if (!item) {
      return NextResponse.json(
        { error: "Item inexistente no catálogo." },
        { status: 404 },
      );
    }

    // Confirma que o jogador possui o item.
    const { data: owned, error: ownedError } = await supabaseAdmin
      .from("user_items")
      .select("id")
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .single();

    if (ownedError || !owned) {
      return NextResponse.json(
        { error: "Você não possui este item." },
        { status: 403 },
      );
    }

    // Ao equipar, libera o slot: desequipa qualquer item do mesmo slot.
    if (equip) {
      await supabaseAdmin
        .from("user_items")
        .update({ equipped: false })
        .eq("user_id", userId)
        .eq("slot", item.slot);
    }

    const { error: updateError } = await supabaseAdmin
      .from("user_items")
      .update({ equipped: equip ?? false })
      .eq("user_id", userId)
      .eq("item_id", itemId);

    if (updateError) {
      throw new Error("Falha ao atualizar o equipamento.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao equipar item:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
