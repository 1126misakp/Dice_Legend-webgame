export type ButtonAuraFrameVariant = 'rewardChoice' | 'bottomMain';

export const isOverflowAuraRarity = (rarity?: string) => rarity === 'SSR' || rarity === 'UR';

export const getButtonAuraFrameClass = (
  rarity: string | undefined,
  variant: ButtonAuraFrameVariant
) => {
  const overflowAura = isOverflowAuraRarity(rarity);
  const sizeClass = variant === 'rewardChoice'
    ? overflowAura
      ? 'h-44 md:h-52 w-[calc(100%+8rem)] opacity-90'
      : 'h-32 md:h-40 w-[calc(100%+4rem)] opacity-50 blur-[1px]'
    : overflowAura
      ? 'h-56 md:h-64 w-[calc(100%+14rem)] opacity-90'
      : 'h-40 md:h-48 w-[calc(100%+6rem)] opacity-45 blur-[1px]';

  return `absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 ${sizeClass}`;
};
