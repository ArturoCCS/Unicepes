export const W = 12, H = 5, EYE = 1.65, BAY = 8, RX = 2.6;
export const FONT = '"Bodoni Moda", Georgia, serif';
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export type Quality = {
  tier: 'high' | 'mid' | 'low';
  dpr: number; aa: boolean; shadow: number; aniso: number; floorTex: number;
  areaLights: number; treeVariants: number; treeCount: number; cards: number; bushCards: number; bushCount: number;
};

const TIERS: Record<Quality['tier'], Quality> = {
  high: { tier: 'high', dpr: 1.75, aa: true, shadow: 2048, aniso: 8, floorTex: 2048, areaLights: 0, treeVariants: 3, treeCount: 16, cards: 150, bushCards: 80, bushCount: 23 },
  mid: { tier: 'mid', dpr: 1.5, aa: true, shadow: 1024, aniso: 4, floorTex: 2048, areaLights: 2, treeVariants: 2, treeCount: 14, cards: 110, bushCards: 60, bushCount: 18 },
  low: { tier: 'low', dpr: 1.25, aa: false, shadow: 512, aniso: 2, floorTex: 1024, areaLights: 1, treeVariants: 1, treeCount: 12, cards: 70, bushCards: 40, bushCount: 12 },
};

export const isTouch = () => matchMedia('(pointer:coarse)').matches;

export function pickQuality(): Quality {
  if (!isTouch()) return TIERS.high;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return mem <= 3 || (navigator.hardwareConcurrency ?? 4) <= 4 ? TIERS.low : TIERS.mid;
}