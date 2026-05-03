
import React, { useState, useRef, useEffect } from 'react';
import { CharacterInfo, SkillType } from '../types';
import RarityParticles from './RarityParticles';
import VoiceSlots from './VoiceSlots';
import {
  Shield, Zap, Sword, Star, Wand2, Target, Ghost, Sparkles,
  Flame, Droplets, Wind, Mountain, Sun, Moon,
  Axe, Book, Circle, Crosshair, Feather, Hand, Swords, Gem, Flag,
  Eye, EyeOff, Download, Loader2, AlertCircle
} from 'lucide-react';
import { playAudioData } from '../services/voiceService';
import { ApiCapabilities, ApiKeys } from '../utils/apiKeyStore';
import { logger } from '../utils/logger';
import { downloadMediaFile } from '../utils/mediaDownload';
import { useLiveGeneration } from '../hooks/useLiveGeneration';

interface Props {
  info: CharacterInfo;
  onClose: () => void;
  apiKeys: ApiKeys;
  capabilities: ApiCapabilities;
}

const CharacterCard: React.FC<Props> = ({ info, onClose, apiKeys, capabilities }) => {
  const [showFullArt, setShowFullArt] = useState(false);

  const {
    videoUrl,
    isLiveActive,
    isLiveGenerating,
    showLiveConfirm,
    queuePosition,
    pendingQueueCount,
    setShowLiveConfirm,
    generateLiveVideo,
    handleLiveClick
  } = useLiveGeneration({ info, apiKeys, capabilities });

  // Full Art Interaction State
  const [isLongPressing, setIsLongPressing] = useState(false);

  // 悬停交互状态（用于稀有度特效）
  const [isHovering, setIsHovering] = useState(false);

  // 语音播放状态
  const [playingVoice, setPlayingVoice] = useState<SkillType | null>(null);
  const [hasPlayedEntrance, setHasPlayedEntrance] = useState(false);

  const isUR = info.rarity === 'UR';
  const isSSR = info.rarity === 'SSR';
  const isSR = info.rarity === 'SR';
  const isR = info.rarity === 'R';

  // 首次展示时自动播放出场语音
  useEffect(() => {
    if (hasPlayedEntrance) return;

    const entranceVoice = info.voices?.voices?.find(v => v.skillType === 'entrance');
    if (entranceVoice) {
      logger.debug('[Voice] 播放出场语音', entranceVoice.line);
      setHasPlayedEntrance(true);
      setPlayingVoice('entrance');

      // 延迟一点播放，让角色卡动画先展示
      setTimeout(async () => {
        try {
          await playAudioData(entranceVoice.audioDataHex);
        } catch (error) {
          logger.error('[Voice] 出场语音播放失败', error);
        } finally {
          setPlayingVoice(null);
        }
      }, 500);
    }
  }, [info.voices, hasPlayedEntrance]);

  // Config based on rarity
  const config = {
    UR: {
      border: 'border-transparent',
      shadow: 'shadow-[0_0_60px_rgba(255,255,255,0.5)]',
      stars: 5,
      textColor: 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-green-400 to-blue-400 animate-pulse'
    },
    SSR: {
      border: 'border-yellow-400',
      shadow: 'shadow-[0_0_50px_rgba(250,204,21,0.6)]',
      stars: 4,
      textColor: 'text-yellow-100'
    },
    SR: {
      border: 'border-purple-500',
      shadow: 'shadow-[0_0_30px_rgba(168,85,247,0.6)]',
      stars: 3,
      textColor: 'text-purple-100'
    },
    R: {
      border: 'border-blue-500',
      shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
      stars: 2,
      textColor: 'text-blue-100'
    }
  };

  const theme = config[info.rarity as keyof typeof config] || config.R;

  // --- Helper: Profession Style & Icon Mapping ---
  // 命运之子专用图标组件 - 太阳+月亮+星星组合
  const DestinyChildIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      {/* 太阳 - 左上 */}
      <circle cx="7" cy="7" r="3" fill="currentColor" opacity="0.9" />
      <g stroke="currentColor" strokeWidth="1">
        <line x1="7" y1="2" x2="7" y2="3" />
        <line x1="7" y1="11" x2="7" y2="12" />
        <line x1="2" y1="7" x2="3" y2="7" />
        <line x1="11" y1="7" x2="12" y2="7" />
        <line x1="3.5" y1="3.5" x2="4.2" y2="4.2" />
        <line x1="9.8" y1="9.8" x2="10.5" y2="10.5" />
        <line x1="3.5" y1="10.5" x2="4.2" y2="9.8" />
        <line x1="9.8" y1="4.2" x2="10.5" y2="3.5" />
      </g>
      {/* 月亮 - 右下 */}
      <path d="M19 17a4 4 0 1 1-3-6.5 3 3 0 0 0 3 6.5z" fill="currentColor" opacity="0.8" />
      {/* 星星 - 中央 */}
      <polygon points="12,8 13,11 16,11 13.5,13 14.5,16 12,14 9.5,16 10.5,13 8,11 11,11" fill="currentColor" />
    </svg>
  );

  const getProfessionStyle = (prof: string) => {
      // 命运之子 - 特殊彩虹色处理，使用自定义图标
      if (prof.includes('命运之子')) return { bg: 'rainbow', icon: DestinyChildIcon, border: 'rainbow', isRainbow: true };
      // 战士类 - 初级战士/战士/狂战士/冠军勇士
      if (prof.includes('战') || prof.includes('狂') || prof.includes('冠军')) return { bg: 'bg-red-700', icon: Axe, border: 'border-red-400' };
      // 佣兵类 - 见习佣兵/佣兵/勇者
      if (prof.includes('佣') || prof.includes('勇')) return { bg: 'bg-orange-700', icon: Sword, border: 'border-orange-400' };
      // 剑士类 - 见习剑士/剑士/剑圣
      if (prof.includes('剑')) return { bg: 'bg-red-600', icon: Sword, border: 'border-red-300' };
      // 盗贼类 - 初级盗贼/盗贼/刺客/抹杀使徒
      if (prof.includes('贼') || prof.includes('刺') || prof.includes('抹杀') || prof.includes('暗')) return { bg: 'bg-slate-700', icon: Swords, border: 'border-slate-400' };
      // 武者类 - 初级斗士/斗士/决斗士
      if (prof.includes('斗') || prof.includes('武') || prof.includes('拳') || prof.includes('决斗')) return { bg: 'bg-amber-700', icon: Hand, border: 'border-amber-400' };
      // 弓骑兵类 - 见习弓骑兵/弓骑兵/游侠将军
      if (prof.includes('弓骑') || prof.includes('游侠')) return { bg: 'bg-emerald-800', icon: Crosshair, border: 'border-emerald-500' };
      // 天马骑士类 - 见习天马骑士/天马骑士/独角兽骑士
      if (prof.includes('天马') || prof.includes('独角兽')) return { bg: 'bg-sky-500', icon: Feather, border: 'border-sky-300' };
      // 弓箭手类 - 见习弓手/弓箭手/狙击手/神射手
      if (prof.includes('弓') || prof.includes('射') || prof.includes('狙击')) return { bg: 'bg-emerald-600', icon: Target, border: 'border-emerald-300' };
      // 骑士类 - 见习骑士/骑士/圣骑士
      if (prof.includes('骑') || prof.includes('马')) return { bg: 'bg-indigo-700', icon: Flag, border: 'border-indigo-400' };
      // 重甲兵类 - 初级守卫/重甲兵/巨盾守卫/铠将军
      if (prof.includes('重') || prof.includes('甲') || prof.includes('盾') || prof.includes('守') || prof.includes('铠') || prof.includes('将军')) return { bg: 'bg-blue-800', icon: Shield, border: 'border-blue-400' };
      // 术士类 - 见习术士/术士/巫术大师
      if (prof.includes('术士') || prof.includes('巫术')) return { bg: 'bg-purple-800', icon: Book, border: 'border-purple-500' };
      // 召唤师类 - 初级召唤师/召唤师/通灵大师
      if (prof.includes('召') || prof.includes('通灵')) return { bg: 'bg-fuchsia-700', icon: Circle, border: 'border-fuchsia-400' };
      // 圣职类 - 修道士/牧师/神官
      if (prof.includes('牧') || prof.includes('神官') || prof.includes('修道')) return { bg: 'bg-yellow-600', icon: Gem, border: 'border-yellow-300' };
      // 魔导士类 - 见习魔导士/魔导士/贤者/大贤者
      if (prof.includes('魔导') || prof.includes('贤者')) return { bg: 'bg-violet-700', icon: Wand2, border: 'border-violet-400' };
      // 魔术师类 - 初级魔术师/魔术师/咒术大师
      if (prof.includes('魔术') || prof.includes('咒术')) return { bg: 'bg-pink-700', icon: Star, border: 'border-pink-400' };
      return { bg: 'bg-slate-600', icon: Sword, border: 'border-slate-400' };
  };

  // 解析职业，支持双职业（用 / 分隔）
  const professions = info.profession.split('/').map(p => p.trim());
  const profStyles = professions.map(prof => getProfessionStyle(prof));

  const getRaceStyle = (race: string) => {
      const map: Record<string, string> = {
          '人类': 'bg-blue-600 border-blue-300',
          '精灵': 'bg-green-600 border-green-300',
          '恶魔': 'bg-red-800 border-red-400',
          '神族': 'bg-amber-500 border-yellow-200',
          '龙族': 'bg-rose-700 border-rose-300',
          '亡灵': 'bg-gray-700 border-gray-400'
      };
      return map[race] || 'bg-slate-600 border-slate-300';
  };

  const getAttrStyle = (attr: string) => {
      if (attr.includes('火')) return { color: 'bg-orange-600 border-orange-300', icon: Flame };
      if (attr.includes('水') || attr.includes('冰')) return { color: 'bg-cyan-600 border-cyan-300', icon: Droplets };
      if (attr.includes('风') || attr.includes('雷')) return { color: 'bg-teal-600 border-teal-300', icon: Wind };
      if (attr.includes('木') || attr.includes('地') || attr.includes('钢')) return { color: 'bg-lime-700 border-lime-300', icon: Mountain };
      if (attr.includes('光')) return { color: 'bg-yellow-500 border-yellow-200', icon: Sun };
      if (attr.includes('暗')) return { color: 'bg-purple-800 border-purple-400', icon: Moon };
      return { color: 'bg-slate-500 border-slate-300', icon: Sparkles };
  };

  const attrStyle = getAttrStyle(info.attribute);
  const AttrIcon = attrStyle.icon;

  const [isDownloading, setIsDownloading] = useState(false);

  const downloadAll = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!info.imageUrl || isDownloading) return;

      setIsDownloading(true);
      const safeName = info.name.replace(/\s+/g, '_').replace(/·/g, '_');
      logger.debug('[Download] 开始下载角色媒体', safeName);

      try {
          // 下载图片
          await downloadMediaFile(info.imageUrl, `${safeName}.png`);

          // 如果有视频，延迟一下再下载（避免浏览器阻止多个下载）
          if (videoUrl) {
              await new Promise(r => setTimeout(r, 500));
              await downloadMediaFile(videoUrl, `${safeName}_live.mp4`);
          }
      } finally {
          setIsDownloading(false);
      }
  };

  // Full Art Long Press Handlers
  const handleMouseDown = () => showFullArt && videoUrl && setIsLongPressing(true);
  const handleMouseUp = () => setIsLongPressing(false);

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#07101f] bg-[url('/ui/academy-hall.png')] bg-cover bg-center p-2 sm:p-4 animate-fade-in select-none overflow-y-auto"
        onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/72 backdrop-blur-sm pointer-events-none" />
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

        /* SR稀有度呼吸效果 */
        @keyframes breathing {
          0%, 100% { transform: scale(1.0); }
          50% { transform: scale(1.02); }
        }
        .rarity-breathing {
          animation: breathing 2.5s ease-in-out infinite;
        }

        /* SSR稀有度镜面闪光效果 */
        @keyframes ssr-shine-move {
          0% {
            left: -100%;
          }
          100% {
            left: 200%;
          }
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
        }
        .ssr-shine-bar-2 {
          animation-delay: 1.25s;
          opacity: 0.6;
        }

        /* UR稀有度全息碎片效果 */
        @keyframes holographic-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }
        .ur-holographic-effect {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 5;
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
          mix-blend-mode: overlay;
        }
        .ur-sparkle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%);
          border-radius: 50%;
          animation: sparkle 1.5s ease-in-out infinite;
        }
        /* UR闪光条 - 彩虹色 */
        @keyframes ur-shine-move {
          0% {
            left: -100%;
          }
          100% {
            left: 200%;
          }
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
        }
      `}</style>

      {/* 动态化确认弹窗 */}
      {showLiveConfirm && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowLiveConfirm(false)}>
            <div className="bg-[#f3ddb1] bg-[url('/ui/parchment-panel.png')] bg-cover bg-center rounded-xl p-5 sm:p-6 w-full max-w-80 shadow-2xl animate-fade-in-up border border-amber-300/60 text-[#2b1a10]" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 bg-amber-900/10 text-amber-800 rounded-full flex items-center justify-center mb-2 border border-amber-800/20">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-black text-[#71410f] font-serif">启动动态化契约？</h3>
                    <p className="text-sm text-[#5b3a18]">角色动态化需要较长等待时间（约1-3分钟），请耐心等候。</p>
                    {pendingQueueCount > 0 && (
                        <p className="text-xs text-amber-900 bg-amber-950/10 px-3 py-1.5 rounded-lg border border-amber-900/15">
                            当前有 {pendingQueueCount} 个任务在队列中，您的任务将排队等待
                        </p>
                    )}
                    <div className="flex gap-3 w-full mt-2">
                        <button
                            onClick={() => setShowLiveConfirm(false)}
                            className="flex-1 py-2 rounded-lg bg-[#1b2d4f]/12 text-[#34405c] font-bold hover:bg-[#1b2d4f]/20 border border-[#1b2d4f]/15"
                        >
                            取消
                        </button>
                        <button
                            onClick={generateLiveVideo}
                            className="flex-1 py-2 rounded-lg bg-gradient-to-b from-[#2f5b9a] to-[#0b1a39] text-amber-50 font-bold hover:brightness-110 shadow-md border border-amber-200/30"
                        >
                            确定
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 主卡片容器 */}
      <div
        className={`relative aspect-[2/3] flex flex-col group transition-all duration-300 ${showFullArt ? 'scale-[1.02]' : ''}`}
        style={{ width: 'min(100%, 420px, calc((100vh - 1rem) * 0.6667))' }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setIsHovering(false); }}
        onMouseEnter={() => setIsHovering(true)}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        
        {/* 原图模式外部控制条 */}
        {showFullArt && (
            <div className="absolute top-2 right-2 md:top-0 md:-right-16 flex flex-row md:flex-col gap-2 md:gap-4 animate-fade-in z-50">
                <button 
                    onClick={() => setShowFullArt(false)}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-950/70 md:bg-blue-950/55 text-amber-100 flex items-center justify-center border border-amber-200/30 hover:bg-amber-200 hover:text-slate-950 transition-colors backdrop-blur-md shadow-lg"
                    title="显示卡面信息"
                >
                    <EyeOff size={24} />
                </button>
                
                <button
                    onClick={downloadAll}
                    disabled={isDownloading}
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-950/70 md:bg-blue-950/55 text-amber-100 flex items-center justify-center border border-amber-200/30 transition-colors backdrop-blur-md shadow-lg ${isDownloading ? 'opacity-50 cursor-wait' : 'hover:bg-emerald-600 hover:border-emerald-300 hover:text-white'}`}
                    title={isDownloading ? "下载中..." : "下载原图"}
                >
                    {isDownloading ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
                </button>
            </div>
        )}

        {/* Particles Layer */}
        {(isSSR || isUR) && !showFullArt && (
            <div className="absolute -inset-12 z-[-1] pointer-events-none">
                <RarityParticles rarity={info.rarity} />
            </div>
        )}

        {/* 卡片内容容器 */}
        <div className={`relative w-full h-full rounded-[1.1rem] overflow-hidden border-[3px] ${showFullArt ? 'border-transparent shadow-none' : `${theme.border} ${theme.shadow} bg-[#0b1630]`} flex flex-col transition-all duration-300 shadow-[0_24px_80px_rgba(0,0,0,0.58)]`}>
            {!showFullArt && (
                <>
                    <div className="absolute inset-0 z-[1] pointer-events-none bg-[url('/ui/parchment-panel.png')] bg-cover bg-center opacity-18 mix-blend-screen" />
                    <div className="absolute -right-24 -top-24 z-[2] w-72 h-72 bg-[url('/ui/astrolabe-crest.png')] bg-contain bg-center bg-no-repeat opacity-24 mix-blend-screen pointer-events-none" />
                    <div className="absolute inset-[8px] z-[3] pointer-events-none rounded-xl border border-amber-200/22" />
                </>
            )}

            {/* UR Special Border */}
            {isUR && !showFullArt && (
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
            )}

            {/* Visual Media Layer (Image + Video) */}
            <div className="absolute inset-0 z-0 bg-[#0b1630]">
                {info.imageUrl ? (
                    <img
                        src={info.imageUrl}
                        alt={info.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                            (isSR || isSSR || isUR) && !showFullArt ? 'rarity-breathing' : ''
                        }`}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(96,165,250,0.32),rgba(7,16,31,1)_62%)] text-slate-300 p-8 text-center">
                        <Sparkles size={54} className="text-amber-200 mb-4 drop-shadow-[0_0_18px_rgba(251,191,36,0.65)]" />
                        <div className="text-lg font-black tracking-widest text-white">立绘未生成</div>
                        <div className="mt-2 text-xs leading-relaxed text-slate-300/80">配置 RunningHub API Key 后，后续契约会生成角色立绘。</div>
                    </div>
                )}

                {/* Video Layer */}
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

                {/* Text Scrim Gradients */}
                <div className={`absolute inset-0 bg-gradient-to-t from-[#080c16]/95 via-[#0b1630]/46 via-25% to-transparent pointer-events-none transition-opacity duration-300 ${showFullArt ? 'opacity-0' : 'opacity-100'}`} />
                <div className={`absolute inset-0 bg-gradient-to-b from-[#0b1630]/75 to-transparent h-36 pointer-events-none transition-opacity duration-300 ${showFullArt ? 'opacity-0' : 'opacity-100'}`} />
            </div>

            {/* --- TOP SECTION --- */}
            {!showFullArt && (
            <div className="relative z-10 p-4 sm:p-5 flex flex-col items-start gap-1 animate-fade-in">
                <div className="flex items-start justify-between w-full">
                    <div className="flex items-center gap-2 min-w-0">
                        <h2 className={`text-4xl sm:text-5xl font-black italic tracking-tighter pr-2 pb-1 ${theme.textColor} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}>
                            {info.rarity}
                        </h2>
                        <div className="flex flex-col gap-0.5 pt-2">
                            <div className="flex">
                                {Array.from({length: theme.stars}).map((_, i) => (
                                    <Star key={i} size={12} className="fill-current text-yellow-400 drop-shadow-md" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Side Controls (Eye + Live) */}
                    <div className="flex flex-col gap-2 sm:gap-3 shrink-0">
                        <button 
                            onClick={() => setShowFullArt(true)}
                            className="w-9 h-9 rounded-full bg-blue-950/55 text-amber-100 flex items-center justify-center border border-amber-200/30 hover:bg-amber-200 hover:text-slate-950 transition-colors backdrop-blur-sm"
                            title="查看原图"
                        >
                            <Eye size={16} />
                        </button>

                        {/* R稀有度不显示LIVE按钮 */}
                        {!isR && (
                            <button
                                onClick={handleLiveClick}
                                disabled={isLiveGenerating || !capabilities.runningHub || !info.imageUrl}
                                className={`h-8 px-2 rounded flex items-center justify-center border backdrop-blur-sm transition-all duration-300 ${capabilities.runningHub && info.imageUrl ? 'bg-blue-950/55 border-amber-200/30 text-amber-100 hover:bg-blue-900/75 hover:border-amber-100/60' : 'bg-slate-900/55 border-slate-500/50 text-slate-400 cursor-not-allowed'}`}
                                title={!capabilities.runningHub ? "未配置 RunningHub API Key" : !info.imageUrl ? "没有立绘，无法生成动态" : videoUrl ? (isLiveActive ? "切换静态立绘" : "切换动态视频") : "生成动态"}
                            >
                                {isLiveGenerating ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <span className="text-[10px] font-bold tracking-tight flex items-center gap-1">
                                        {/* 绿点：有视频且正在显示动态 / 红点：无视频或显示静态 */}
                                        <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                                            videoUrl && isLiveActive
                                                ? 'bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]'
                                                : 'bg-red-500'
                                        }`}></span>
                                        LIVE
                                    </span>
                                )}
                            </button>
                        )}

                        {/* 队列状态提示（仅非R稀有度显示） */}
                        {!isR && isLiveGenerating && queuePosition > 0 && (
                            <div className="absolute top-16 right-4 whitespace-nowrap text-[10px] bg-amber-500/90 text-white px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                                契约编撰中，前方 {queuePosition} 个任务
                            </div>
                        )}
                        {!isR && isLiveGenerating && queuePosition === 0 && (
                            <div className="absolute top-16 right-4 whitespace-nowrap text-[10px] bg-indigo-500/90 text-white px-2 py-0.5 rounded-full shadow-lg">
                                灵魂连接中...
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-full text-base sm:text-lg font-black text-amber-50 tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)] border-l-4 border-amber-200/70 pl-2 mb-1 truncate font-serif">
                    {info.title}
                </div>

                <div className="flex gap-2 mt-1">
                    <div className={`px-2.5 py-1 rounded-md border text-[10px] text-white font-bold shadow-md flex items-center gap-1 ${getRaceStyle(info.race)}`}>
                        {info.race}
                    </div>
                    <div className={`px-2.5 py-1 rounded-md border text-[10px] text-white font-bold shadow-md flex items-center gap-1 ${attrStyle.color}`}>
                        <AttrIcon size={10} />
                        {info.attribute}
                    </div>
                </div>
            </div>
            )}

            {/* --- BOTTOM SECTION --- */}
            {!showFullArt && (
            <div className="relative z-10 mt-auto p-4 sm:p-5 pb-4 sm:pb-6 animate-fade-in-up">
                <div className="flex items-start gap-3 mb-3 sm:mb-4 rounded-xl border border-amber-200/18 bg-black/18 p-2.5 backdrop-blur-[2px]">
                    {/* 职业图标区域 - 支持双职业 */}
                    <div className="flex gap-2 mt-3 sm:mt-4 shrink-0">
                        {profStyles.map((style, idx) => {
                            const Icon = style.icon;
                            const isRainbow = (style as any).isRainbow;

                            if (isRainbow) {
                                // 命运之子特殊彩虹色图标 - 彩虹月亮
                                return (
                                    <div key={idx} className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
                                        {/* 彩虹边框 */}
                                        <div
                                            className="absolute inset-0 rounded-lg animate-[spin_3s_linear_infinite]"
                                            style={{
                                                background: 'conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                                                padding: '2px'
                                            }}
                                        />
                                        {/* 内部背景 */}
                                        <div className="absolute inset-[2px] rounded-lg bg-gradient-to-br from-slate-800 to-slate-900" />
                                        {/* 彩虹月亮图标 */}
                                        <svg
                                            className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 drop-shadow-md"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <defs>
                                                <linearGradient id="rainbowMoonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#ef4444" />
                                                    <stop offset="25%" stopColor="#eab308" />
                                                    <stop offset="50%" stopColor="#22c55e" />
                                                    <stop offset="75%" stopColor="#3b82f6" />
                                                    <stop offset="100%" stopColor="#8b5cf6" />
                                                </linearGradient>
                                            </defs>
                                            {/* 月亮 - 新月形状 */}
                                            <path
                                                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                                                fill="url(#rainbowMoonGradient)"
                                            />
                                        </svg>
                                    </div>
                                );
                            }

                            return (
                                <div key={idx} className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg ${style.bg} border-2 ${style.border} flex items-center justify-center shadow-lg`}>
                                    <Icon size={22} className="text-white drop-shadow-md" />
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-col pb-1 min-w-0">
                        <div
                            className={`text-[10px] font-bold uppercase tracking-wider text-white/80 w-fit max-w-full px-1.5 rounded-sm mb-0.5 truncate ${(profStyles[0] as any).isRainbow ? '' : profStyles[0].bg}`}
                            style={(profStyles[0] as any).isRainbow ? { background: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6)' } : {}}
                        >
                            {info.profession}
                        </div>
                        {(() => {
                            const [firstName, ...rest] = info.name.split('·');
                            const titlePart = rest.join('·');
                            return (
                                <div className="flex flex-col leading-none">
                                    <h1 className="text-2xl sm:text-3xl font-black text-amber-50 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] font-serif tracking-wide truncate">
                                        {firstName}
                                    </h1>
                                    {titlePart && (
                                        <span className="text-xs sm:text-sm text-amber-100/90 font-serif italic tracking-wider mt-0.5 drop-shadow-md truncate">
                                            {titlePart}
                                        </span>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className="mb-3 min-w-0">
                    <VoiceSlots info={info} isUR={isUR} isSSR={isSSR} isSR={isSR} />
                </div>
                {!capabilities.miniMax && (
                    <div className="mb-3 rounded-lg border border-amber-200/18 bg-black/30 px-3 py-2 text-[10px] text-amber-100/72">
                        未配置 MiniMax API Key，角色语音未生成。
                    </div>
                )}

                <div className="mt-2">
                    <p className="text-xs text-amber-50/92 italic leading-relaxed text-justify drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-medium max-h-24 overflow-y-auto pr-1 rounded-lg border border-amber-200/12 bg-black/20 p-2">
                        “{info.description}”
                    </p>
                </div>
            </div>
            )}

            {/* SSR 镜面闪光特效 - 金色闪光条 */}
            {isSSR && !showFullArt && (
                <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden rounded-xl">
                    <div className="ssr-shine-bar" />
                    <div className="ssr-shine-bar ssr-shine-bar-2" />
                </div>
            )}

            {/* UR 全息碎片特效 - 彩虹闪光 */}
            {isUR && !showFullArt && (
                <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden rounded-xl">
                    <div className="ur-holographic-overlay" />
                    <div className="ur-shine-bar" />
                    {/* 随机闪烁的星点 */}
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
            )}
        </div>
      </div>
    </div>
  );
};

export default CharacterCard;
