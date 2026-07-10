import type { HeroClass } from "./progression";

export interface WorldHero {
  id: string;
  name: string;
  totalXp: number;
  heroClass: HeroClass;
  isCurrentPlayer?: boolean;
}

export interface PlayerProfile {
  id: string;
  github_username: string;
  total_xp: number;
  avatar_url?: string | null;
  class_type?: string | null;
  tech_stack?: string[] | null;
}

export function normalizeHeroClass(value?: string | null): HeroClass {
  const upperValue = value?.toUpperCase();
  if (upperValue === "ASSASSIN" || upperValue === "MAGE" || upperValue === "CLERIC" || upperValue === "ARCHER") return upperValue;
  return "MAGE";
}
