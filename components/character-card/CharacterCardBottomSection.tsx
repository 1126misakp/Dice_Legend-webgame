import React from 'react';
import { CharacterInfo } from '../../types';
import { ApiCapabilities } from '../../utils/apiKeyStore';
import VoiceSlots from '../VoiceSlots';
import { getProfessionStyles, splitCharacterName } from './cardStyles';
import ProfessionIconBadge from './ProfessionIconBadge';

interface CharacterCardBottomSectionProps {
  info: CharacterInfo;
  capabilities: ApiCapabilities;
  isUR: boolean;
  isSSR: boolean;
  isSR: boolean;
}

const CharacterCardBottomSection: React.FC<CharacterCardBottomSectionProps> = ({ info, capabilities, isUR, isSSR, isSR }) => {
  const professionStyles = getProfessionStyles(info.profession);
  const { firstName, titlePart } = splitCharacterName(info.name);
  const primaryProfession = professionStyles[0];

  return (
    <div className="relative z-10 mt-auto p-3.5 sm:p-5 pb-4 sm:pb-6 animate-fade-in-up">
      <div className="flex items-start gap-3 mb-3 sm:mb-4 rounded-xl bg-white/[0.10] p-2.5 backdrop-blur-md min-w-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-18px_28px_rgba(0,0,0,0.16),0_14px_36px_rgba(0,0,0,0.24)]">
        <div className="flex gap-2 mt-3 sm:mt-4 shrink-0">
          {professionStyles.map((style, idx) => (
            <ProfessionIconBadge key={idx} style={style} />
          ))}
        </div>

        <div className="flex flex-col pb-1 min-w-0">
          <div
            className={`text-[10px] font-bold uppercase tracking-wider text-white/80 w-fit max-w-full px-1.5 rounded-sm mb-0.5 truncate ${primaryProfession.isRainbow ? '' : primaryProfession.bg}`}
            style={primaryProfession.isRainbow ? { background: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6)' } : {}}
          >
            {info.profession}
          </div>
          <div className="flex flex-col leading-none min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-amber-50 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] font-serif tracking-wide truncate">
              {firstName}
            </h1>
            {titlePart && (
              <span className="text-xs sm:text-sm text-amber-100/90 font-serif italic tracking-wider mt-0.5 drop-shadow-md truncate">
                {titlePart}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 min-w-0 overflow-hidden">
        <VoiceSlots info={info} isUR={isUR} isSSR={isSSR} isSR={isSR} />
      </div>

      {!capabilities.miniMax && (
        <div className="mb-3 rounded-lg bg-black/30 px-3 py-2 text-[10px] text-amber-100/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
          未配置 MiniMax API Key，角色语音未生成。
        </div>
      )}

      <div className="mt-2">
        <p className="text-xs text-amber-50/92 italic leading-relaxed text-justify drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-medium max-h-24 overflow-y-auto pr-1 rounded-lg bg-black/30 p-2 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-14px_24px_rgba(0,0,0,0.18)]">
          “{info.description}”
        </p>
      </div>
    </div>
  );
};

export default CharacterCardBottomSection;
