import React from 'react';
import { Eye, Loader2, Star } from 'lucide-react';
import { ApiCapabilities } from '../../utils/apiKeyStore';
import { CharacterInfo } from '../../types';
import { getAttrStyle, getRaceStyle, rarityThemes } from './cardStyles';

interface CharacterCardTopSectionProps {
  info: CharacterInfo;
  theme: typeof rarityThemes.R;
  capabilities: ApiCapabilities;
  videoUrl: string | null;
  isLiveActive: boolean;
  isLiveGenerating: boolean;
  queuePosition: number;
  isR: boolean;
  onShowFullArt: () => void;
  onLiveClick: (event: React.MouseEvent) => void;
}

const CharacterCardTopSection: React.FC<CharacterCardTopSectionProps> = ({
  info,
  theme,
  capabilities,
  videoUrl,
  isLiveActive,
  isLiveGenerating,
  queuePosition,
  isR,
  onShowFullArt,
  onLiveClick
}) => {
  const attrStyle = getAttrStyle(info.attribute);
  const AttrIcon = attrStyle.icon;

  return (
    <div className="relative z-10 p-3.5 sm:p-5 flex flex-col items-start gap-1 animate-fade-in">
      <div className="flex items-start justify-between w-full gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className={`text-4xl sm:text-5xl font-black italic tracking-tighter pr-2 pb-1 ${theme.textColor} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}>
            {info.rarity}
          </h2>
          <div className="flex flex-col gap-0.5 pt-2">
            <div className="flex">
              {Array.from({ length: theme.stars }).map((_, i) => (
                <Star key={i} size={12} className="fill-current text-yellow-400 drop-shadow-md" />
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-end gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onShowFullArt}
            className="w-9 h-9 rounded-full bg-blue-950/55 text-amber-100 flex items-center justify-center border border-amber-200/30 hover:bg-amber-200 hover:text-slate-950 transition-colors backdrop-blur-sm"
            title="查看原图"
          >
            <Eye size={16} />
          </button>

          {!isR && (
            <button
              onClick={onLiveClick}
              disabled={isLiveGenerating || !capabilities.runningHub || !info.imageUrl}
              className={`h-8 min-w-14 px-2 rounded flex items-center justify-center border backdrop-blur-sm transition-all duration-300 ${capabilities.runningHub && info.imageUrl ? 'bg-blue-950/55 border-amber-200/30 text-amber-100 hover:bg-blue-900/75 hover:border-amber-100/60' : 'bg-slate-900/55 border-slate-500/50 text-slate-400 cursor-not-allowed'}`}
              title={!capabilities.runningHub ? '未配置 RunningHub API Key' : !info.imageUrl ? '没有立绘，无法生成动态' : videoUrl ? (isLiveActive ? '切换静态立绘' : '切换动态视频') : '生成动态'}
            >
              {isLiveGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <span className="text-[10px] font-bold tracking-tight flex items-center gap-1 whitespace-nowrap">
                  <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    videoUrl && isLiveActive
                      ? 'bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]'
                      : 'bg-red-500'
                  }`} />
                  LIVE
                </span>
              )}
            </button>
          )}

          {!isR && isLiveGenerating && (
            <div className="absolute top-[4.6rem] right-0 max-w-[9.5rem] text-right whitespace-normal text-[10px] leading-tight bg-indigo-500/90 text-white px-2 py-1 rounded-lg shadow-lg">
              {queuePosition > 0 ? `契约编撰中，前方 ${queuePosition} 个任务` : '灵魂连接中...'}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-full text-base sm:text-lg font-black text-amber-50 tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)] border-l-4 border-amber-200/70 pl-2 mb-1 truncate font-serif">
        {info.title}
      </div>

      <div className="flex gap-2 mt-1 max-w-full overflow-hidden">
        <div className={`px-2.5 py-1 rounded-md border text-[10px] text-white font-bold shadow-md flex items-center gap-1 min-w-0 truncate ${getRaceStyle(info.race)}`}>
          {info.race}
        </div>
        <div className={`px-2.5 py-1 rounded-md border text-[10px] text-white font-bold shadow-md flex items-center gap-1 min-w-0 truncate ${attrStyle.color}`}>
          <AttrIcon size={10} className="shrink-0" />
          {info.attribute}
        </div>
      </div>
    </div>
  );
};

export default CharacterCardTopSection;
