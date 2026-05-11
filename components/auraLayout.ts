export type ButtonAuraFrameVariant = 'bottomMain';

export const isOverflowAuraRarity = (rarity?: string) => rarity === 'SSR' || rarity === 'UR';

export const getButtonAuraFrameClass = (
  rarity: string | undefined,
  variant: ButtonAuraFrameVariant
) => {
  const overflowAura = isOverflowAuraRarity(rarity);
  const sizeClass = overflowAura
    ? 'h-36 md:h-40 w-[calc(100%+2.5rem)] opacity-90'
    : 'h-28 md:h-32 w-[calc(100%+1.5rem)] opacity-45 blur-[1px]';

  return `absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 ${sizeClass}`;
};

export const getContainedButtonAuraClass = (rarity: string | undefined) => {
  const opacityClass = isOverflowAuraRarity(rarity) ? 'opacity-80' : 'opacity-70';

  return `absolute inset-0 z-0 mix-blend-screen pointer-events-none ${opacityClass}`;
};
