import { type ClassType } from './index';

// ============================================================================
// CATÁLOGO DE ITENS (Luckbox) — 20 itens por classe (80 no total)
// Estático e compartilhado entre servidor (sorteio) e cliente (render).
// ============================================================================

// Onde o item é equipado no avatar.
export type ItemSlot = 'HEAD' | 'MAINHAND' | 'OFFHAND' | 'BACK' | 'AURA';

// Raridade define a chance no sorteio e a cor/brilho na UI.
export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface GameItem {
  id: string; // identificador estável (casa com user_items.item_id)
  name: string;
  classType: ClassType;
  slot: ItemSlot;
  rarity: Rarity;
  color: number; // cor base para desenhar no Phaser (hex)
  glow: boolean; // se true, o item brilha/pulsa no avatar
  emoji: string; // ícone para a UI/modal da luckbox
}

// Pesos de sorteio por raridade (quanto maior, mais comum).
export const RARITY_WEIGHT: Record<Rarity, number> = {
  COMMON: 60,
  RARE: 25,
  EPIC: 12,
  LEGENDARY: 3,
};

// Cores de destaque por raridade (usadas na UI da luckbox).
export const RARITY_UI: Record<Rarity, { label: string; hex: string }> = {
  COMMON: { label: 'Comum', hex: '#94a3b8' },
  RARE: { label: 'Raro', hex: '#38bdf8' },
  EPIC: { label: 'Épico', hex: '#a855f7' },
  LEGENDARY: { label: 'Lendário', hex: '#f59e0b' },
};

// ---------------------------------------------------------------------------
// ASSASSIN — adagas, capuzes e auras sombrias
// ---------------------------------------------------------------------------
const ASSASSIN_ITEMS: GameItem[] = [
  { id: 'as_dagger_rusty', name: 'Adaga Enferrujada', classType: 'ASSASSIN', slot: 'MAINHAND', rarity: 'COMMON', color: 0x9ca3af, glow: false, emoji: '🗡️' },
  { id: 'as_hood_leather', name: 'Capuz de Couro', classType: 'ASSASSIN', slot: 'HEAD', rarity: 'COMMON', color: 0x6b4423, glow: false, emoji: '🧢' },
  { id: 'as_dagger_steel', name: 'Adaga de Aço', classType: 'ASSASSIN', slot: 'MAINHAND', rarity: 'COMMON', color: 0xcbd5e1, glow: false, emoji: '🗡️' },
  { id: 'as_offhand_dirk', name: 'Punhal Secundário', classType: 'ASSASSIN', slot: 'OFFHAND', rarity: 'COMMON', color: 0xcbd5e1, glow: false, emoji: '🔪' },
  { id: 'as_hood_black', name: 'Capuz Negro', classType: 'ASSASSIN', slot: 'HEAD', rarity: 'RARE', color: 0x1f2937, glow: false, emoji: '🥷' },
  { id: 'as_dagger_serpent', name: 'Presa da Serpente', classType: 'ASSASSIN', slot: 'MAINHAND', rarity: 'RARE', color: 0x22c55e, glow: false, emoji: '🐍' },
  { id: 'as_cloak_shadow', name: 'Manto das Sombras', classType: 'ASSASSIN', slot: 'BACK', rarity: 'RARE', color: 0x334155, glow: false, emoji: '🧥' },
  { id: 'as_offhand_kunai', name: 'Kunai Gêmea', classType: 'ASSASSIN', slot: 'OFFHAND', rarity: 'RARE', color: 0x64748b, glow: false, emoji: '🔪' },
  { id: 'as_dagger_venom', name: 'Adaga Venenosa', classType: 'ASSASSIN', slot: 'MAINHAND', rarity: 'RARE', color: 0x84cc16, glow: true, emoji: '🗡️' },
  { id: 'as_mask_oni', name: 'Máscara Oni', classType: 'ASSASSIN', slot: 'HEAD', rarity: 'EPIC', color: 0xdc2626, glow: true, emoji: '👺' },
  { id: 'as_dagger_crimson', name: 'Adaga Carmesim', classType: 'ASSASSIN', slot: 'MAINHAND', rarity: 'EPIC', color: 0xef4444, glow: true, emoji: '🗡️' },
  { id: 'as_offhand_crimson', name: 'Lâmina Carmesim', classType: 'ASSASSIN', slot: 'OFFHAND', rarity: 'EPIC', color: 0xf87171, glow: true, emoji: '🔪' },
  { id: 'as_cloak_wraith', name: 'Manto Espectral', classType: 'ASSASSIN', slot: 'BACK', rarity: 'EPIC', color: 0x7c3aed, glow: true, emoji: '👻' },
  { id: 'as_aura_smoke', name: 'Aura de Fumaça', classType: 'ASSASSIN', slot: 'AURA', rarity: 'EPIC', color: 0x475569, glow: true, emoji: '💨' },
  { id: 'as_hood_phantom', name: 'Capuz Fantasma', classType: 'ASSASSIN', slot: 'HEAD', rarity: 'EPIC', color: 0x8b5cf6, glow: true, emoji: '🥷' },
  { id: 'as_dagger_void', name: 'Lâmina do Vazio', classType: 'ASSASSIN', slot: 'MAINHAND', rarity: 'LEGENDARY', color: 0x8b5cf6, glow: true, emoji: '🌌' },
  { id: 'as_offhand_void', name: 'Espelho do Vazio', classType: 'ASSASSIN', slot: 'OFFHAND', rarity: 'LEGENDARY', color: 0xa78bfa, glow: true, emoji: '🌌' },
  { id: 'as_aura_bloodmoon', name: 'Aura da Lua de Sangue', classType: 'ASSASSIN', slot: 'AURA', rarity: 'LEGENDARY', color: 0xb91c1c, glow: true, emoji: '🌑' },
  { id: 'as_crown_reaper', name: 'Coroa do Ceifador', classType: 'ASSASSIN', slot: 'HEAD', rarity: 'LEGENDARY', color: 0x111827, glow: true, emoji: '💀' },
  { id: 'as_cloak_eclipse', name: 'Manto do Eclipse', classType: 'ASSASSIN', slot: 'BACK', rarity: 'LEGENDARY', color: 0x1e1b4b, glow: true, emoji: '🌘' },
];

// ---------------------------------------------------------------------------
// MAGE — varinhas, chapéus e auras arcanas
// ---------------------------------------------------------------------------
const MAGE_ITEMS: GameItem[] = [
  { id: 'mg_wand_oak', name: 'Varinha de Carvalho', classType: 'MAGE', slot: 'MAINHAND', rarity: 'COMMON', color: 0x92400e, glow: false, emoji: '🪄' },
  { id: 'mg_hat_apprentice', name: 'Chapéu de Aprendiz', classType: 'MAGE', slot: 'HEAD', rarity: 'COMMON', color: 0x3b82f6, glow: false, emoji: '🎩' },
  { id: 'mg_wand_crystal', name: 'Varinha de Cristal', classType: 'MAGE', slot: 'MAINHAND', rarity: 'COMMON', color: 0x93c5fd, glow: false, emoji: '🪄' },
  { id: 'mg_book_spells', name: 'Grimório Simples', classType: 'MAGE', slot: 'OFFHAND', rarity: 'COMMON', color: 0x1e40af, glow: false, emoji: '📖' },
  { id: 'mg_hat_wizard', name: 'Chapéu de Mago', classType: 'MAGE', slot: 'HEAD', rarity: 'RARE', color: 0x2563eb, glow: false, emoji: '🧙' },
  { id: 'mg_wand_frost', name: 'Cajado de Gelo', classType: 'MAGE', slot: 'MAINHAND', rarity: 'RARE', color: 0x67e8f9, glow: true, emoji: '❄️' },
  { id: 'mg_orb_arcane', name: 'Orbe Arcano', classType: 'MAGE', slot: 'OFFHAND', rarity: 'RARE', color: 0x818cf8, glow: true, emoji: '🔮' },
  { id: 'mg_cape_stars', name: 'Capa Estelar', classType: 'MAGE', slot: 'BACK', rarity: 'RARE', color: 0x3730a3, glow: false, emoji: '🌟' },
  { id: 'mg_hat_stars', name: 'Chapéu Estelar', classType: 'MAGE', slot: 'HEAD', rarity: 'RARE', color: 0x4338ca, glow: true, emoji: '🌠' },
  { id: 'mg_wand_flame', name: 'Cajado das Chamas', classType: 'MAGE', slot: 'MAINHAND', rarity: 'EPIC', color: 0xf97316, glow: true, emoji: '🔥' },
  { id: 'mg_orb_storm', name: 'Orbe da Tempestade', classType: 'MAGE', slot: 'OFFHAND', rarity: 'EPIC', color: 0x38bdf8, glow: true, emoji: '⚡' },
  { id: 'mg_hat_archmage', name: 'Chapéu de Arquimago', classType: 'MAGE', slot: 'HEAD', rarity: 'EPIC', color: 0x7c3aed, glow: true, emoji: '🧙‍♂️' },
  { id: 'mg_cape_nebula', name: 'Capa Nebulosa', classType: 'MAGE', slot: 'BACK', rarity: 'EPIC', color: 0x6d28d9, glow: true, emoji: '🌌' },
  { id: 'mg_aura_arcane', name: 'Aura Arcana', classType: 'MAGE', slot: 'AURA', rarity: 'EPIC', color: 0x8b5cf6, glow: true, emoji: '✨' },
  { id: 'mg_wand_thunder', name: 'Cajado do Trovão', classType: 'MAGE', slot: 'MAINHAND', rarity: 'EPIC', color: 0xfacc15, glow: true, emoji: '⚡' },
  { id: 'mg_staff_cosmos', name: 'Cajado do Cosmos', classType: 'MAGE', slot: 'MAINHAND', rarity: 'LEGENDARY', color: 0x22d3ee, glow: true, emoji: '🌠' },
  { id: 'mg_orb_infinity', name: 'Orbe do Infinito', classType: 'MAGE', slot: 'OFFHAND', rarity: 'LEGENDARY', color: 0xe879f9, glow: true, emoji: '🔮' },
  { id: 'mg_crown_archon', name: 'Coroa do Arconte', classType: 'MAGE', slot: 'HEAD', rarity: 'LEGENDARY', color: 0xfde047, glow: true, emoji: '👑' },
  { id: 'mg_aura_galaxy', name: 'Aura Galáctica', classType: 'MAGE', slot: 'AURA', rarity: 'LEGENDARY', color: 0x6366f1, glow: true, emoji: '🌌' },
  { id: 'mg_cape_celestial', name: 'Manto Celestial', classType: 'MAGE', slot: 'BACK', rarity: 'LEGENDARY', color: 0x4f46e5, glow: true, emoji: '☄️' },
];

// ---------------------------------------------------------------------------
// CLERIC — cajados sagrados, elmos e auras de luz
// ---------------------------------------------------------------------------
const CLERIC_ITEMS: GameItem[] = [
  { id: 'cl_mace_wood', name: 'Maça de Madeira', classType: 'CLERIC', slot: 'MAINHAND', rarity: 'COMMON', color: 0x92400e, glow: false, emoji: '🔨' },
  { id: 'cl_hood_cloth', name: 'Manto de Tecido', classType: 'CLERIC', slot: 'HEAD', rarity: 'COMMON', color: 0xfef3c7, glow: false, emoji: '⛑️' },
  { id: 'cl_shield_wood', name: 'Escudo de Madeira', classType: 'CLERIC', slot: 'OFFHAND', rarity: 'COMMON', color: 0xa16207, glow: false, emoji: '🛡️' },
  { id: 'cl_staff_iron', name: 'Cajado de Ferro', classType: 'CLERIC', slot: 'MAINHAND', rarity: 'COMMON', color: 0x9ca3af, glow: false, emoji: '⚕️' },
  { id: 'cl_helm_bless', name: 'Elmo Abençoado', classType: 'CLERIC', slot: 'HEAD', rarity: 'RARE', color: 0xfbbf24, glow: false, emoji: '⛑️' },
  { id: 'cl_mace_holy', name: 'Maça Sagrada', classType: 'CLERIC', slot: 'MAINHAND', rarity: 'RARE', color: 0xfcd34d, glow: true, emoji: '✨' },
  { id: 'cl_shield_faith', name: 'Escudo da Fé', classType: 'CLERIC', slot: 'OFFHAND', rarity: 'RARE', color: 0xfde68a, glow: false, emoji: '🛡️' },
  { id: 'cl_cape_priest', name: 'Manto Sacerdotal', classType: 'CLERIC', slot: 'BACK', rarity: 'RARE', color: 0xf59e0b, glow: false, emoji: '🧥' },
  { id: 'cl_halo_minor', name: 'Auréola Menor', classType: 'CLERIC', slot: 'AURA', rarity: 'RARE', color: 0xfef08a, glow: true, emoji: '😇' },
  { id: 'cl_staff_dawn', name: 'Cajado da Aurora', classType: 'CLERIC', slot: 'MAINHAND', rarity: 'EPIC', color: 0xfbbf24, glow: true, emoji: '🌅' },
  { id: 'cl_shield_aegis', name: 'Égide Radiante', classType: 'CLERIC', slot: 'OFFHAND', rarity: 'EPIC', color: 0xfde047, glow: true, emoji: '🛡️' },
  { id: 'cl_helm_paladin', name: 'Elmo de Paladino', classType: 'CLERIC', slot: 'HEAD', rarity: 'EPIC', color: 0xeab308, glow: true, emoji: '⛑️' },
  { id: 'cl_wings_angel', name: 'Asas Angelicais', classType: 'CLERIC', slot: 'BACK', rarity: 'EPIC', color: 0xfef9c3, glow: true, emoji: '🕊️' },
  { id: 'cl_aura_holy', name: 'Aura Sagrada', classType: 'CLERIC', slot: 'AURA', rarity: 'EPIC', color: 0xfacc15, glow: true, emoji: '✨' },
  { id: 'cl_mace_sun', name: 'Martelo Solar', classType: 'CLERIC', slot: 'MAINHAND', rarity: 'EPIC', color: 0xf59e0b, glow: true, emoji: '☀️' },
  { id: 'cl_staff_seraph', name: 'Cajado do Serafim', classType: 'CLERIC', slot: 'MAINHAND', rarity: 'LEGENDARY', color: 0xfffbeb, glow: true, emoji: '🌟' },
  { id: 'cl_shield_divine', name: 'Escudo Divino', classType: 'CLERIC', slot: 'OFFHAND', rarity: 'LEGENDARY', color: 0xfef3c7, glow: true, emoji: '🛡️' },
  { id: 'cl_halo_seraph', name: 'Auréola do Serafim', classType: 'CLERIC', slot: 'AURA', rarity: 'LEGENDARY', color: 0xfffde7, glow: true, emoji: '😇' },
  { id: 'cl_crown_saint', name: 'Coroa do Santo', classType: 'CLERIC', slot: 'HEAD', rarity: 'LEGENDARY', color: 0xfacc15, glow: true, emoji: '👑' },
  { id: 'cl_wings_archangel', name: 'Asas de Arcanjo', classType: 'CLERIC', slot: 'BACK', rarity: 'LEGENDARY', color: 0xffffff, glow: true, emoji: '🕊️' },
];

// ---------------------------------------------------------------------------
// ARCHER — arcos, aljavas, capuzes e auras da natureza
// ---------------------------------------------------------------------------
const ARCHER_ITEMS: GameItem[] = [
  { id: 'ar_bow_short', name: 'Arco Curto', classType: 'ARCHER', slot: 'MAINHAND', rarity: 'COMMON', color: 0x92400e, glow: false, emoji: '🏹' },
  { id: 'ar_cap_leaf', name: 'Chapéu de Caçador', classType: 'ARCHER', slot: 'HEAD', rarity: 'COMMON', color: 0x166534, glow: false, emoji: '🧢' },
  { id: 'ar_quiver_wood', name: 'Aljava Simples', classType: 'ARCHER', slot: 'OFFHAND', rarity: 'COMMON', color: 0x854d0e, glow: false, emoji: '🎯' },
  { id: 'ar_bow_long', name: 'Arco Longo', classType: 'ARCHER', slot: 'MAINHAND', rarity: 'COMMON', color: 0xa16207, glow: false, emoji: '🏹' },
  { id: 'ar_hood_ranger', name: 'Capuz de Patrulheiro', classType: 'ARCHER', slot: 'HEAD', rarity: 'RARE', color: 0x15803d, glow: false, emoji: '🥷' },
  { id: 'ar_bow_recurve', name: 'Arco Recurvo', classType: 'ARCHER', slot: 'MAINHAND', rarity: 'RARE', color: 0x22c55e, glow: false, emoji: '🏹' },
  { id: 'ar_quiver_hawk', name: 'Aljava do Falcão', classType: 'ARCHER', slot: 'OFFHAND', rarity: 'RARE', color: 0xca8a04, glow: false, emoji: '🦅' },
  { id: 'ar_cape_forest', name: 'Manto da Floresta', classType: 'ARCHER', slot: 'BACK', rarity: 'RARE', color: 0x14532d, glow: false, emoji: '🍃' },
  { id: 'ar_bow_wind', name: 'Arco do Vento', classType: 'ARCHER', slot: 'MAINHAND', rarity: 'RARE', color: 0x86efac, glow: true, emoji: '💨' },
  { id: 'ar_bow_flame', name: 'Arco Flamejante', classType: 'ARCHER', slot: 'MAINHAND', rarity: 'EPIC', color: 0xf97316, glow: true, emoji: '🔥' },
  { id: 'ar_quiver_venom', name: 'Aljava Venenosa', classType: 'ARCHER', slot: 'OFFHAND', rarity: 'EPIC', color: 0x84cc16, glow: true, emoji: '🎯' },
  { id: 'ar_hood_shadow', name: 'Capuz Sombrio', classType: 'ARCHER', slot: 'HEAD', rarity: 'EPIC', color: 0x166534, glow: true, emoji: '🥷' },
  { id: 'ar_wings_hawk', name: 'Asas de Falcão', classType: 'ARCHER', slot: 'BACK', rarity: 'EPIC', color: 0x65a30d, glow: true, emoji: '🦅' },
  { id: 'ar_aura_nature', name: 'Aura da Natureza', classType: 'ARCHER', slot: 'AURA', rarity: 'EPIC', color: 0x22c55e, glow: true, emoji: '🌿' },
  { id: 'ar_bow_storm', name: 'Arco da Tempestade', classType: 'ARCHER', slot: 'MAINHAND', rarity: 'EPIC', color: 0x38bdf8, glow: true, emoji: '⚡' },
  { id: 'ar_bow_celestial', name: 'Arco Celestial', classType: 'ARCHER', slot: 'MAINHAND', rarity: 'LEGENDARY', color: 0x67e8f9, glow: true, emoji: '🌠' },
  { id: 'ar_quiver_infinity', name: 'Aljava Infinita', classType: 'ARCHER', slot: 'OFFHAND', rarity: 'LEGENDARY', color: 0xfacc15, glow: true, emoji: '♾️' },
  { id: 'ar_crown_windlord', name: 'Coroa do Senhor dos Ventos', classType: 'ARCHER', slot: 'HEAD', rarity: 'LEGENDARY', color: 0xa7f3d0, glow: true, emoji: '👑' },
  { id: 'ar_aura_gaia', name: 'Aura de Gaia', classType: 'ARCHER', slot: 'AURA', rarity: 'LEGENDARY', color: 0x16a34a, glow: true, emoji: '🌍' },
  { id: 'ar_wings_phoenix', name: 'Asas de Fênix', classType: 'ARCHER', slot: 'BACK', rarity: 'LEGENDARY', color: 0xfb923c, glow: true, emoji: '🔥' },
];

// Catálogo completo, indexável.
export const ALL_ITEMS: GameItem[] = [
  ...ASSASSIN_ITEMS,
  ...MAGE_ITEMS,
  ...CLERIC_ITEMS,
  ...ARCHER_ITEMS,
];

// Mapa id -> item para lookup O(1) na renderização.
export const ITEMS_BY_ID: Record<string, GameItem> = ALL_ITEMS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, GameItem>,
);

// Itens de uma classe específica (usado no sorteio da luckbox).
export function getItemsForClass(classType: ClassType): GameItem[] {
  return ALL_ITEMS.filter((item) => item.classType === classType);
}

// Sorteia um item da classe respeitando os pesos de raridade.
// NOSONAR: Math.random é adequado aqui — é sorteio cosmético de item de jogo,
// não há requisito criptográfico.
export function rollItemForClass(classType: ClassType): GameItem {
  const pool = getItemsForClass(classType);

  // Soma dos pesos e sorteio por faixa acumulada (sem replicar arrays).
  const totalWeight = pool.reduce(
    (sum, item) => sum + RARITY_WEIGHT[item.rarity],
    0,
  );
  let ticket = Math.random() * totalWeight; // NOSONAR: uso cosmético

  for (const item of pool) {
    ticket -= RARITY_WEIGHT[item.rarity];
    if (ticket <= 0) return item;
  }

  return pool.at(-1) as GameItem; // fallback teórico
}

