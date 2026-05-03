import React from 'react';
import { Sparkles } from 'lucide-react';
import { CharacterInfo } from '../../types';

interface CharacterCardMediaProps {
  info: CharacterInfo;
  videoUrl: string | null;
  showFullArt: boolean;
  isLiveActive: boolean;
  isLongPressing: boolean;
  hasRarityBreathing: boolean;
}

const CharacterCardMedia: React.FC<CharacterCardMediaProps> = ({
  info,
  videoUrl,
  showFullArt,
  isLiveActive,
  isLongPressing,
  hasRarityBreathing
}) => (
  <div className="absolute inset-0 z-0 bg-[#0b1630]">
    {info.imageUrl ? (
      <img
        src={info.imageUrl}
        alt={info.name}
        className={`w-full h-full object-cover transition-transform duration-300 ${
          hasRarityBreathing && !showFullArt ? 'rarity-breathing' : ''
        }`}
      />
    ) : (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(96,165,250,0.32),rgba(7,16,31,1)_62%)] text-slate-300 p-8 text-center">
        <Sparkles size={54} className="text-amber-200 mb-4 drop-shadow-[0_0_18px_rgba(251,191,36,0.65)]" />
        <div className="text-lg font-black tracking-widest text-white">立绘未生成</div>
        <div className="mt-2 text-xs leading-relaxed text-slate-300/80">配置 RunningHub API Key 后，后续契约会生成角色立绘。</div>
      </div>
    )}

    {videoUrl && (
      <video
        src={videoUrl}
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          (!showFullArt && isLiveActive) || (showFullArt && isLongPressing)
            ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
    )}

    <div className={`absolute inset-0 bg-gradient-to-t from-[#080c16]/95 via-[#0b1630]/46 via-25% to-transparent pointer-events-none transition-opacity duration-300 ${showFullArt ? 'opacity-0' : 'opacity-100'}`} />
    <div className={`absolute inset-0 bg-gradient-to-b from-[#0b1630]/75 to-transparent h-36 pointer-events-none transition-opacity duration-300 ${showFullArt ? 'opacity-0' : 'opacity-100'}`} />
  </div>
);

export default CharacterCardMedia;
