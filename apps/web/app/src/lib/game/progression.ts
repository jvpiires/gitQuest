export const XP_PER_COMMIT = 100;
export const XP_LEVEL_FACTOR = 50;
export const LEVELS_PER_BOX = 5;

export type HeroClass = "ASSASSIN" | "MAGE" | "CLERIC" | "ARCHER";
export type ItemRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export const HERO_CLASSES: Record<HeroClass, {
  label: string;
  icon: string;
  attribute: string;
  xpTrigger: string;
  color: string;
  accent: string;
}> = {
  ASSASSIN: { label: "Assassino", icon: "🗡️", attribute: "Agilidade", xpTrigger: "Issues de bugs resolvidas", color: "#a855f7", accent: "#e9d5ff" },
  MAGE: { label: "Mago", icon: "🧙", attribute: "Inteligência", xpTrigger: "Refatorações e testes", color: "#3b82f6", accent: "#bfdbfe" },
  CLERIC: { label: "Clérigo", icon: "🛡️", attribute: "Sabedoria", xpTrigger: "Code reviews aprovados", color: "#10b981", accent: "#bbf7d0" },
  ARCHER: { label: "Arqueiro", icon: "🏹", attribute: "Destreza", xpTrigger: "Pipelines aprovadas", color: "#f59e0b", accent: "#fde68a" },
};

export const xpForLevel = (level: number) => XP_LEVEL_FACTOR * Math.max(0, level - 1) ** 2;

export const levelFromXp = (totalXp: number) =>
  Math.floor(Math.sqrt(Math.max(0, totalXp) / XP_LEVEL_FACTOR)) + 1;

export function getProgression(totalXp: number) {
  const level = levelFromXp(totalXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpIntoLevel = Math.max(0, totalXp - currentLevelXp);
  const xpNeeded = nextLevelXp - currentLevelXp;

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeeded,
    xpRemaining: Math.max(0, nextLevelXp - totalXp),
    progressPercent: Math.min(100, (xpIntoLevel / xpNeeded) * 100),
    luckboxesEarned: Math.floor(level / LEVELS_PER_BOX),
    levelsUntilNextLuckbox: LEVELS_PER_BOX - (level % LEVELS_PER_BOX || LEVELS_PER_BOX),
  };
}

export function luckboxesFromCommits(commitCount: number) {
  return getProgression(commitCount * XP_PER_COMMIT).luckboxesEarned;
}

export function rollRarity(random = Math.random()): ItemRarity {
  if (random < 0.6) return "COMMON";
  if (random < 0.85) return "RARE";
  if (random < 0.97) return "EPIC";
  return "LEGENDARY";
}

export const RARITY_META: Record<ItemRarity, { label: string; chance: string; color: string }> = {
  COMMON: { label: "Comum", chance: "60%", color: "#94a3b8" },
  RARE: { label: "Raro", chance: "25%", color: "#38bdf8" },
  EPIC: { label: "Épico", chance: "12%", color: "#a855f7" },
  LEGENDARY: { label: "Lendário", chance: "3%", color: "#f59e0b" },
};

export interface GameItem {
  id: string;
  name: string;
  heroClass: HeroClass;
  slot: "head" | "body" | "weapon" | "accessory";
  rarity: ItemRarity;
}

const itemNames: Record<HeroClass, string[]> = {
  ASSASSIN: ["Adaga Sombria", "Capuz da Sombra", "Botas Silenciosas", "Manto Noturno", "Lâmina Veloz"],
  MAGE: ["Cajado Arcano", "Chapéu Estelar", "Túnica de Éter", "Orbe Rúnico", "Grimório Azul"],
  CLERIC: ["Cetro Solar", "Mitra Serena", "Vestes Sagradas", "Relicário Vivo", "Escudo da Aurora"],
  ARCHER: ["Arco do Vento", "Capuz da Folha", "Colete de Caça", "Aljava Rúnica", "Flecha Solar"],
};

// 20 itens por classe: cinco modelos em cada uma das quatro raridades.
export const ITEM_CATALOG: GameItem[] = (Object.keys(HERO_CLASSES) as HeroClass[]).flatMap((heroClass) =>
  (Object.keys(RARITY_META) as ItemRarity[]).flatMap((rarity) =>
    itemNames[heroClass].map((name, index) => ({
      id: `${heroClass}-${rarity}-${index + 1}`,
      name,
      heroClass,
      rarity,
      slot: (["weapon", "head", "body", "accessory", "weapon"] as GameItem["slot"][])[index],
    }))
  )
);
