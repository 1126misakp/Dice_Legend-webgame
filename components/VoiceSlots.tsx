import React, { useState } from 'react';
import { Ban, Lock, Volume2 } from 'lucide-react';
import { CharacterInfo, SkillType } from '../types';
import { getSkillTypesByRarity, playAudioData } from '../services/voiceService';
import { logger } from '../utils/logger';

interface VoiceSlotsProps {
  info: CharacterInfo;
  isUR: boolean;
  isSSR: boolean;
  isSR: boolean;
}

const VoiceSlots: React.FC<VoiceSlotsProps> = ({ info, isUR, isSSR, isSR }) => {
  const [playingVoice, setPlayingVoice] = useState<SkillType | null>(null);
  const availableSkillTypes = getSkillTypesByRarity(info.rarity);

  const playSkillVoice = async (skillType: SkillType) => {
    if (!info.voices?.voices) return;

    const voiceData = info.voices.voices.find(v => v.skillType === skillType);
    if (!voiceData) {
      logger.debug('[Voice] 未找到语音数据', skillType);
      return;
    }

    try {
      setPlayingVoice(skillType);
      logger.debug('[Voice] 播放语音', skillType, voiceData.line);
      await playAudioData(voiceData.audioDataHex);
    } catch (error) {
      logger.error('[Voice] 播放失败', error);
    } finally {
      setPlayingVoice(null);
    }
  };

  const renderActiveSlots = () => {
    const slots = [];
    const skillTypes: SkillType[] = ['skill1', 'skill2', 'skill3'];

    for (let i = 0; i < 3; i++) {
      const skillType = skillTypes[i];
      const hasVoice = availableSkillTypes.includes(skillType) && info.voices?.voices?.some(v => v.skillType === skillType);
      const isDisabled = !availableSkillTypes.includes(skillType);
      const isPlaying = playingVoice === skillType;

      slots.push(
        <div key={`active-${i}`} className="relative pb-3">
          <div
            onClick={(event) => {
              event.stopPropagation();
              if (hasVoice && !isPlaying) playSkillVoice(skillType);
            }}
            className={`w-10 h-10 rounded-lg flex items-center justify-center border rotate-45 m-2 shadow-sm transition-all
              ${isDisabled
                ? 'border-slate-500/50 bg-slate-900/45 cursor-not-allowed'
                : hasVoice
                  ? `border-blue-200/70 bg-blue-950/55 cursor-pointer hover:scale-110 hover:border-amber-200 hover:shadow-[0_0_16px_rgba(251,191,36,0.45)] ${isPlaying ? 'animate-pulse scale-110 border-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.72)]' : ''}`
                  : 'border-blue-200/55 bg-blue-950/45'
              } backdrop-blur-sm`}
          >
            <div className="-rotate-45">
              {isDisabled
                ? <Ban size={16} className="text-slate-400" />
                : hasVoice
                  ? <Volume2 size={16} className={`${isPlaying ? 'text-amber-100 animate-pulse' : 'text-blue-100'}`} />
                  : <Lock size={16} className="text-blue-100" />
              }
            </div>
          </div>
          {hasVoice && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <span className="block rounded-full bg-black/35 px-1 text-[6px] leading-3 text-amber-200/90 shadow-[0_1px_4px_rgba(0,0,0,0.5)] whitespace-nowrap">技能{i + 1}</span>
            </div>
          )}
        </div>
      );
    }
    return slots;
  };

  const renderPassiveSlots = () => {
    const slots = [];
    const passiveCount = isUR ? 2 : 1;
    for (let i = 0; i < passiveCount; i++) {
      const unavailable = !isUR && !isSSR && !isSR;
      slots.push(
        <div key={`passive-${i}`} className="relative group">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${unavailable ? 'border-slate-500/50 bg-slate-900/45' : 'border-amber-200/70 bg-amber-950/45'} backdrop-blur-sm shadow-sm`}>
            {unavailable ? <Ban size={12} className="text-slate-400" /> : <Lock size={12} className="text-amber-200" />}
          </div>
        </div>
      );
    }
    return slots;
  };

  const hasUltimateVoice = info.voices?.voices?.some(v => v.skillType === 'ultimate');
  const isUltimatePlaying = playingVoice === 'ultimate';

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 scale-[0.94] min-[390px]:scale-100 origin-center">
      <div className="flex gap-0.5 sm:gap-1">
        {renderActiveSlots()}
      </div>
      <div className="relative group mx-0.5 sm:mx-1 pb-3">
        <div
          onClick={(event) => {
            event.stopPropagation();
            if (hasUltimateVoice && !isUltimatePlaying) playSkillVoice('ultimate');
          }}
          className={`w-14 h-14 rounded-full flex items-center justify-center border-2 backdrop-blur-md transition-all
            ${hasUltimateVoice
              ? `border-amber-200/80 bg-purple-950/50 cursor-pointer hover:scale-105 hover:border-amber-100 hover:shadow-[0_0_25px_rgba(251,191,36,0.7)] ${isUltimatePlaying ? 'animate-pulse scale-105 border-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.95)]' : 'shadow-[0_0_15px_rgba(168,85,247,0.5)]'}`
              : 'border-amber-200/65 bg-purple-950/50 shadow-[0_0_15px_rgba(168,85,247,0.45)]'
            }`}
        >
          {hasUltimateVoice
            ? <Volume2 size={20} className={`${isUltimatePlaying ? 'text-amber-100 animate-pulse' : 'text-purple-100'}`} />
            : <Lock size={20} className="text-purple-100" />
          }
        </div>
        <div className="absolute bottom-0 w-full text-center">
          <span className="text-[8px] leading-3 bg-[#27113f]/90 px-1.5 py-0.5 rounded-full text-amber-100 border border-amber-300/40 shadow-sm">奥义</span>
        </div>
      </div>
      <div className="flex gap-0.5 sm:gap-1 ml-0.5 sm:ml-1">
        {renderPassiveSlots()}
      </div>
    </div>
  );
};

export default VoiceSlots;
