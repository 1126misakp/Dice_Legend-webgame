import React from 'react';
import RarityParticles from '../RarityParticles';

interface RarityFlags {
  isUR: boolean;
  isSSR: boolean;
}

export const CharacterCardStyleSheet: React.FC = () => (
  <style>{`
    @keyframes rgb-flow {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .animate-rgb-flow {
      background-size: 300% 300%;
      animation: rgb-flow 3s ease infinite;
    }
    @keyframes breathing {
      0%, 100% { transform: scale(1.0); }
      50% { transform: scale(1.02); }
    }
    .rarity-breathing {
      animation: breathing 2.5s ease-in-out infinite;
    }
    @keyframes ssr-shine-move {
      0% { left: -100%; }
      100% { left: 200%; }
    }
    .ssr-shine-bar {
      position: absolute;
      top: 0;
      left: -100%;
      width: 50%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 215, 0, 0.1) 20%,
        rgba(255, 255, 255, 0.4) 50%,
        rgba(255, 215, 0, 0.1) 80%,
        transparent 100%
      );
      transform: skewX(-20deg);
      animation: ssr-shine-move 2.5s ease-in-out infinite;
      pointer-events: none;
      opacity: 0.42;
    }
    .ssr-shine-bar-2 {
      animation-delay: 1.25s;
      opacity: 0.6;
    }
    @keyframes holographic-shimmer {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes sparkle {
      0%, 100% { opacity: 0; transform: scale(0.5); }
      50% { opacity: 1; transform: scale(1); }
    }
    .ur-holographic-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        135deg,
        rgba(255, 0, 0, 0.1) 0%,
        rgba(255, 165, 0, 0.1) 14%,
        rgba(255, 255, 0, 0.1) 28%,
        rgba(0, 255, 0, 0.1) 42%,
        rgba(0, 255, 255, 0.1) 57%,
        rgba(0, 0, 255, 0.1) 71%,
        rgba(128, 0, 128, 0.1) 85%,
        rgba(255, 0, 0, 0.1) 100%
      );
      background-size: 400% 400%;
      animation: holographic-shimmer 3s ease infinite;
      mix-blend-mode: soft-light;
      opacity: 0.38;
    }
    .ur-sparkle {
      position: absolute;
      width: 8px;
      height: 8px;
      background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%);
      border-radius: 50%;
      animation: sparkle 1.5s ease-in-out infinite;
    }
    @keyframes ur-shine-move {
      0% { left: -100%; }
      100% { left: 200%; }
    }
    .ur-shine-bar {
      position: absolute;
      top: 0;
      left: -100%;
      width: 60%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 100, 100, 0.15) 10%,
        rgba(255, 200, 100, 0.2) 25%,
        rgba(255, 255, 255, 0.5) 50%,
        rgba(100, 200, 255, 0.2) 75%,
        rgba(200, 100, 255, 0.15) 90%,
        transparent 100%
      );
      transform: skewX(-20deg);
      animation: ur-shine-move 2s ease-in-out infinite;
      pointer-events: none;
      opacity: 0.5;
    }
    .card-rarity-glint-mask {
      -webkit-mask-image: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.95) 0%,
        rgba(0, 0, 0, 0.36) 18%,
        rgba(0, 0, 0, 0.08) 34%,
        rgba(0, 0, 0, 0.05) 62%,
        rgba(0, 0, 0, 0.5) 100%
      );
      mask-image: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.95) 0%,
        rgba(0, 0, 0, 0.36) 18%,
        rgba(0, 0, 0, 0.08) 34%,
        rgba(0, 0, 0, 0.05) 62%,
        rgba(0, 0, 0, 0.5) 100%
      );
    }
  `}</style>
);

export const OuterRarityParticles: React.FC<{ rarity: string } & RarityFlags & { showFullArt: boolean }> = ({ rarity, isSSR, isUR, showFullArt }) => {
  if (!(isSSR || isUR) || showFullArt) return null;

  return (
    <div className="absolute -inset-12 z-[-1] pointer-events-none">
      <RarityParticles rarity={rarity} />
    </div>
  );
};

export const UrBorderEffect: React.FC<{ showFullArt: boolean; isUR: boolean }> = ({ showFullArt, isUR }) => {
  if (!isUR || showFullArt) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none border-[3px] border-transparent rounded-xl" style={{
      background: 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
      backgroundSize: '400% 100%',
      animation: 'rgb-flow 3s linear infinite',
      mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      maskComposite: 'exclude',
      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      WebkitMaskComposite: 'xor',
      padding: '3px'
    }} />
  );
};

export const InnerRarityEffects: React.FC<{ showFullArt: boolean } & RarityFlags> = ({ showFullArt, isSSR, isUR }) => {
  if (showFullArt) return null;

  if (isSSR) {
    return (
      <div className="absolute inset-0 z-[4] pointer-events-none overflow-hidden rounded-xl card-rarity-glint-mask">
        <div className="ssr-shine-bar" />
        <div className="ssr-shine-bar ssr-shine-bar-2" />
      </div>
    );
  }

  if (isUR) {
    return (
      <div className="absolute inset-0 z-[4] pointer-events-none overflow-hidden rounded-xl card-rarity-glint-mask">
        <div className="ur-holographic-overlay" />
        <div className="ur-shine-bar" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="ur-sparkle"
            style={{
              left: `${10 + (i % 4) * 25 + Math.random() * 10}%`,
              top: `${10 + Math.floor(i / 4) * 30 + Math.random() * 10}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${1.2 + Math.random() * 0.8}s`
            }}
          />
        ))}
      </div>
    );
  }

  return null;
};
