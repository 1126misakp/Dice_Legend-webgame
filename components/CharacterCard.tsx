
import React, { useState, useRef, useEffect } from 'react';
import { CharacterInfo, SkillType } from '../types';
import RarityParticles from './RarityParticles';
import {
  Shield, Zap, Sword, Lock, Star, Ban, Wand2, Target, Ghost, Sparkles,
  Flame, Droplets, Wind, Mountain, Sun, Moon,
  Axe, Book, Circle, Crosshair, Feather, Hand, Swords, Gem, Flag,
  Eye, EyeOff, Download, Loader2, AlertCircle, Volume2
} from 'lucide-react';
import { runningHubQueue, getQueueStatus } from '../utils/runningHubQueue';
import { playAudioData, getSkillTypesByRarity } from '../services/voiceService';
import { OPENROUTER_API_KEY, RUNNINGHUB_API_KEY } from '../utils/env';

interface Props {
  info: CharacterInfo;
  onClose: () => void;
}

const CharacterCard: React.FC<Props> = ({ info, onClose }) => {
  const [showFullArt, setShowFullArt] = useState(false);

  // Live Video State
  const [videoUrl, setVideoUrl] = useState<string | null>(info.videoUrl || null);
  const [isLiveActive, setIsLiveActive] = useState(false); // Controls if video plays on card
  const [isLiveGenerating, setIsLiveGenerating] = useState(false);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number>(0); // 0 = not queued, 1+ = position in queue
  const [queueTaskId, setQueueTaskId] = useState<string | null>(null);

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

  // 获取当前稀有度可用的技能类型
  const availableSkillTypes = getSkillTypesByRarity(info.rarity);

  // 首次展示时自动播放出场语音
  useEffect(() => {
    if (hasPlayedEntrance) return;

    const entranceVoice = info.voices?.voices?.find(v => v.skillType === 'entrance');
    if (entranceVoice) {
      console.log('[Voice] 播放出场语音:', entranceVoice.line);
      setHasPlayedEntrance(true);
      setPlayingVoice('entrance');

      // 延迟一点播放，让角色卡动画先展示
      setTimeout(async () => {
        try {
          await playAudioData(entranceVoice.audioDataHex);
        } catch (error) {
          console.error('[Voice] 出场语音播放失败:', error);
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

  // 播放技能语音
  const playSkillVoice = async (skillType: SkillType) => {
    if (!info.voices?.voices) return;

    const voiceData = info.voices.voices.find(v => v.skillType === skillType);
    if (!voiceData) {
      console.log('[Voice] 未找到语音数据:', skillType);
      return;
    }

    try {
      setPlayingVoice(skillType);
      console.log('[Voice] 播放语音:', skillType, voiceData.line);
      await playAudioData(voiceData.audioDataHex);
    } catch (error) {
      console.error('[Voice] 播放失败:', error);
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
            <div key={`active-${i}`} className="relative">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasVoice && !isPlaying) playSkillVoice(skillType);
                  }}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border rotate-45 m-2 shadow-sm transition-all
                    ${isDisabled
                      ? 'border-slate-500/50 bg-slate-900/40 cursor-not-allowed'
                      : hasVoice
                        ? `border-cyan-300/60 bg-cyan-900/40 cursor-pointer hover:scale-110 hover:border-cyan-200 hover:shadow-[0_0_10px_rgba(34,211,238,0.5)] ${isPlaying ? 'animate-pulse scale-110 border-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.8)]' : ''}`
                        : 'border-cyan-300/60 bg-cyan-900/40'
                    } backdrop-blur-sm`}
                >
                    <div className="-rotate-45">
                         {isDisabled
                           ? <Ban size={16} className="text-slate-400" />
                           : hasVoice
                             ? <Volume2 size={16} className={`${isPlaying ? 'text-cyan-100 animate-pulse' : 'text-cyan-200'}`} />
                             : <Lock size={16} className="text-cyan-200" />
                         }
                    </div>
                </div>
                {hasVoice && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <span className="text-[6px] text-cyan-300/80 whitespace-nowrap">技能{i+1}</span>
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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${unavailable ? 'border-slate-500/50 bg-slate-900/40' : 'border-amber-300/60 bg-amber-900/40'} backdrop-blur-sm shadow-sm`}>
                    {unavailable ? <Ban size={12} className="text-slate-400" /> : <Lock size={12} className="text-amber-200" />}
                </div>
            </div>
        );
    }
    return slots;
  };

  const renderUltimateSlot = () => {
    const hasVoice = info.voices?.voices?.some(v => v.skillType === 'ultimate');
    const isPlaying = playingVoice === 'ultimate';

    return (
      <div className="relative group mx-1">
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (hasVoice && !isPlaying) playSkillVoice('ultimate');
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center border-2 backdrop-blur-md transition-all
              ${hasVoice
                ? `border-purple-400/80 bg-purple-900/50 cursor-pointer hover:scale-105 hover:border-purple-300 hover:shadow-[0_0_25px_rgba(168,85,247,0.8)] ${isPlaying ? 'animate-pulse scale-105 border-purple-300 shadow-[0_0_30px_rgba(168,85,247,1)]' : 'shadow-[0_0_15px_rgba(168,85,247,0.5)]'}`
                : 'border-purple-400/80 bg-purple-900/50 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
              }`}
          >
              {hasVoice
                ? <Volume2 size={20} className={`${isPlaying ? 'text-purple-100 animate-pulse' : 'text-purple-200'}`} />
                : <Lock size={20} className="text-purple-200" />
              }
          </div>
          <div className="absolute -bottom-1 w-full text-center">
               <span className="text-[8px] bg-purple-900/90 px-1.5 py-0.5 rounded-full text-purple-100 border border-purple-500/50 shadow-sm">奥义</span>
          </div>
      </div>
    );
  };

  // --- API / LIVE Logic ---
  const generateLiveVideo = async () => {
      setShowLiveConfirm(false);
      setIsLiveGenerating(true);

      const EXECUTE_URL = "https://www.runninghub.cn/task/openapi/ai-app/run";
      const QUERY_URL = "https://www.runninghub.cn/task/openapi/outputs";

      // 生成唯一的队列任务ID
      const localQueueId = `live-${info.name}-${Date.now()}`;
      setQueueTaskId(localQueueId);

      // 检查队列状态
      const status = getQueueStatus();
      if (status.isProcessing || status.queueLength > 0) {
          setQueuePosition(status.queueLength + 1);
          console.log(`[Live] Task queued at position ${status.queueLength + 1}`);
      }

      // 将任务加入队列
      try {
          await runningHubQueue.enqueue(localQueueId, async () => {
              // 当轮到这个任务执行时
              setQueuePosition(0);
              console.log(`[Live] Task ${localQueueId} now executing`);

              // 实际的 API 调用逻辑
              await executeVideoGeneration();
          });
      } catch (e: any) {
          console.error("Live Gen Error", e);
          alert(`动态化生成失败: ${e.message || '请稍后重试'}`);
      } finally {
          setIsLiveGenerating(false);
          setQueueTaskId(null);
          setQueuePosition(0);
      }
  };

  // 实际执行视频生成的内部函数
  const executeVideoGeneration = async () => {
      const EXECUTE_URL = "https://www.runninghub.cn/task/openapi/ai-app/run";
      const QUERY_URL = "https://www.runninghub.cn/task/openapi/outputs";

      const namePart = info.name.split('·')[0];

      // Step 1: 使用 grok-4.1-fast 生成 LIVE 动画提示词（多模态图片理解）
      console.log("[Live] Step 1: Generating LIVE animation prompt with grok-4.1-fast...");

      const liveSystemPrompt = `# Role: 成人向手游动态视效导演 (Adult Gacha Motion Director)

## Profile
你是一名精通 AI 视频生成（Runway/Pika/SVD）的提示词专家，同时也是一名深谙二次元游戏视觉表现和性暗示的动作导演。你的核心能力是**"视觉势能推演"**——通过分析一张静态立绘的姿势、肌肉紧张度和特效走向，推导出"下一秒会发生什么"，并根据**稀有度分级原则**，生成对应的动态描述和带有性暗示的视频生成提示词。

## Goals
接收用户提供的静态立绘（或描述）及稀有度设定，输出两部分内容：
1. **动态脚本设计 (Action Storyboard)**：用中文描述一段符合稀有度的动作演出脚本。
2. **AI Video Prompt**：用于驱动 AI 视频生成工具的英文提示词。

## Rarity & Action Scaling Logic (稀有度与动作分级逻辑)

*必须严格遵守：稀有度越高，动作幅度越大，性暗示的姿势越多，运镜越剧烈，特效越夸张。*

### 1. R (Rare) - 静态呼吸 (Living Portrait)
* **动作逻辑**：保持原姿势不动，仅做生理性微动。
* **动作幅度**：**极小 (Minimal)**。呼吸起伏、眨眼、头发随微风飘动。
* **物理效果**：轻微的身体起伏。
* **运镜**：固定机位 (Static Camera) 或 极慢的呼吸感缩放。
* **适用场景**：角色站立对话、待机界面。

### 2. SR (Super Rare) - 循环动作 (Looping Action)
* **动作逻辑**：在原位进行的简单、中等幅度的循环动作。
* **动作幅度**：**中等 (Moderate)**。
  * *若站立*：原地踏步、整理衣服、伸手招呼。
  * *若持武器*：轻轻挥舞武器、擦拭枪支。
  * *若诱惑姿态*：做出性暗示动作（如弯腰后挺身、脱下外套）。
* **物理效果**：明显的乳摇（Bounce）、衣摆大幅摆动。
* **运镜**：缓慢的平移 (Pan)。

### 3. SSR (Specially Super Rare) - 动作释放 (Action Release)
* **动作逻辑**：**"势能释放"**。将立绘中"蓄势待发"的动作做出来。
* **动作幅度**：**大 (High)**。
  * *若战斗姿态*：完成劈砍、射击后坐力、冲刺（Running/Dashing）。
  * *若施法姿态*：魔法释放出去，手势剧烈变化。
  * *若诱惑姿态*：做出明显的性暗示动作（如弯腰后挺身、脱下外套）。
* **物理效果**：剧烈的乳摇，腰部、屁股明显的摆动、喘息。
* **运镜**：跟随动作的运镜 (Tracking Shot)，背景视差明显。

### 4. UR (Ultra Rare) - 终极演出 (Cinematic Ultimate)
* **动作逻辑**：依据静态时的姿势产生连贯且富度较大的动作。
* **动作幅度**：饱含性暗示动作、表情与战斗、或符合静态立绘意境的动作相结合。
* **物理效果**：夸张的物理反馈（Exaggerated Physics），爆衣、破碎，同时有明显剧烈的乳摇、腰部和屁股的摆动、喘息。
* **特效**：强烈的光影特效。
* **运镜**：极具张力的运镜（但禁止镜头拉远）。

## Workflow
1. **姿态分析 (Pose Analysis)**：
   - 观察静态图：肢体是紧绷还是放松？重心在哪里？武器指向哪里？
   - 推演：如果是SSR/UR，这个姿势的"下一帧"应该是什么？
2. **分级映射 (Mapping)**：
   - 根据用户指定的稀有度，选择上述对应的动作逻辑。
3. **生成输出 (Output)**：
   - **[动态脚本]**：详细描述动作流程、物理反馈和运镜。
   - **[Video Prompt]**：英文提示词，格式为 \`(Subject Action), (Camera Movement), (VFX & Atmosphere), (Quality Tags)\`。
4. **重要限制：运镜提示词中不要出现zoomout**

## Initialization
请发送你的立绘图片（或描述），并告诉我该角色的稀有度和职业以及属性。我将立即为你生成动态化方案，需要注意请直接发送提示词，不要有多余的解释性文字。角色信息如下`;

      // 构建角色信息
      const characterInfoText = `
角色姓名: ${info.name}
稀有度: ${info.rarity}
职业: ${info.profession}
种族: ${info.race}
属性: ${info.attribute}
性别: ${info.gender}
年龄: ${info.age}
头衔: ${info.title}
人物描述: ${info.description.substring(0, 200)}`;

      let liveAnimationPrompt = "";

      try {
          // 使用 grok-4.1-fast 进行多模态图片理解
          const grokResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${OPENROUTER_API_KEY}`
              },
              body: JSON.stringify({
                  model: "x-ai/grok-4.1-fast",
                  messages: [
                      { role: "system", content: liveSystemPrompt },
                      {
                          role: "user",
                          content: [
                              {
                                  type: "image_url",
                                  image_url: { url: info.imageUrl }
                              },
                              {
                                  type: "text",
                                  text: characterInfoText
                              }
                          ]
                      }
                  ],
                  max_tokens: 10000,
                  temperature: 0.8
              })
          });

          if (!grokResponse.ok) {
              const errorText = await grokResponse.text();
              console.warn("[Live] Grok API failed:", grokResponse.status, errorText);
              throw new Error(`Grok API failed: ${grokResponse.status}`);
          }

          const grokData = await grokResponse.json();
          const rawContent = grokData.choices?.[0]?.message?.content || "";

          // 清理提示词
          let cleanedContent = rawContent.replace(/```[\s\S]*?```/g, '').replace(/`/g, '').trim();

          console.log("[Live] Raw Grok Response (length:", cleanedContent.length, "):");
          console.log(cleanedContent);

          // 提取中文动态脚本部分（去掉标题和英文Video Prompt部分）
          // 尝试多种提取方式

          // 方式1: 查找 "### 动态脚本设计" 或 "[动态脚本]" 后面的中文内容
          let chineseScript = "";

          // 尝试匹配 "### 动态脚本设计" 或 "(Action Storyboard)" 后的内容
          const storyboardMatch = cleanedContent.match(/(?:###\s*动态脚本设计[^\n]*\n?(?:\(Action Storyboard\)\n?)?|【动态脚本】|\[动态脚本\])\s*([\s\S]*?)(?=###\s*AI Video Prompt|【Video Prompt】|\[Video Prompt\]|$)/i);

          if (storyboardMatch && storyboardMatch[1]) {
              chineseScript = storyboardMatch[1].trim();
          } else {
              // 方式2: 提取所有包含中文的连续段落（排除纯英文行）
              const lines = cleanedContent.split('\n');
              const chineseLines: string[] = [];
              let foundChinese = false;

              for (const line of lines) {
                  // 检查是否包含中文字符
                  const hasChinese = /[\u4e00-\u9fa5]/.test(line);
                  // 检查是否是标题行（以#或[开头）
                  const isTitle = /^[#\[【]/.test(line.trim());
                  // 检查是否是英文Video Prompt开始
                  const isEnglishPrompt = /^[\(\[]?[a-zA-Z]/.test(line.trim()) && !hasChinese;

                  if (hasChinese && !isTitle) {
                      foundChinese = true;
                      chineseLines.push(line.trim());
                  } else if (foundChinese && isEnglishPrompt) {
                      // 遇到英文提示词，停止提取
                      break;
                  }
              }

              chineseScript = chineseLines.join('');
          }

          // 如果提取失败，使用原始内容
          if (!chineseScript || chineseScript.length < 20) {
              console.warn("[Live] Failed to extract Chinese script, using full content");
              liveAnimationPrompt = cleanedContent;
          } else {
              liveAnimationPrompt = chineseScript;
          }

          console.log("[Live] Extracted Chinese Script (length:", liveAnimationPrompt.length, "):");
          console.log(liveAnimationPrompt);

      } catch (grokError) {
          console.warn("[Live] Grok API failed, using fallback prompt:", grokError);
          // 备用提示词（中文）
          const rarityActions: Record<string, string> = {
              'R': '角色保持静止姿态，仅有轻微的呼吸起伏，头发随微风轻轻飘动，眨眼。运镜固定，画面静谧。',
              'SR': '角色在原位进行循环动作，身体微微摇摆，衣物和头发大幅飘动。运镜缓慢水平平移。',
              'SSR': '角色释放蓄势已久的动作，武器挥舞或魔法释放。剧烈的乳摇，腰部、屁股明显的摆动、喘息。运镜跟随动作，背景视差明显。',
              'UR': '依据静态姿势产生连贯且幅度较大的动作，饱含性暗示动作与表情。夸张的物理反馈，爆衣、破碎，剧烈的乳摇、腰部和屁股的摆动、喘息。强烈的光影特效，极具张力的运镜但禁止镜头拉远。'
          };
          liveAnimationPrompt = rarityActions[info.rarity] || rarityActions['SR'];
      }

      // Step 2: 调用新的 RunningHub API
      console.log("[Live] Step 2: Submitting to RunningHub with new API format...");

      const res = await fetch(EXECUTE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              "webappId": "2004562821612535810",
              "apiKey": RUNNINGHUB_API_KEY,
              "nodeInfoList": [
                  {
                      "nodeId": "45",
                      "fieldName": "text",
                      "fieldValue": liveAnimationPrompt,
                      "description": "LIVE动画完整提示词"
                  },
                  {
                      "nodeId": "46",
                      "fieldName": "text",
                      "fieldValue": namePart,
                      "description": "角色姓名"
                  },
                  {
                      "nodeId": "39",
                      "fieldName": "url",
                      "fieldValue": info.imageUrl,
                      "description": "角色立绘"
                  }
              ]
          })
      });

      if (!res.ok) throw new Error("API Launch Failed");
      const data = await res.json();
      if (data.code !== 0) throw new Error(data.msg || "API Error");

      let taskId = data.data?.taskId;
      if (!taskId && typeof data.data === 'string') taskId = data.data;
      if (!taskId) throw new Error("No Task ID returned");

      console.log("Live Task Started:", taskId);

      // Helper functions for URL detection
      const isVideoExt = (u: string) => /\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i.test(u);
      const isImageExt = (u: string) => /\.(png|jpg|jpeg|webp|gif|svg|bmp)(\?.*)?$/i.test(u);

      // Helper to find video URL from response data - 增强版
      const findVideoUrl = (respData: any): string | null => {
          const allUrls: string[] = [];
          const visitedKeys = new Set<string>(); // 防止循环引用

          const collectUrls = (obj: any, path: string = '') => {
              if (!obj) return;
              if (visitedKeys.has(path) && path.length > 100) return;
              visitedKeys.add(path);

              if (typeof obj === 'string') {
                  if (obj.startsWith('http')) {
                      allUrls.push(obj);
                      console.log(`[findVideoUrl] Found URL at ${path}: ${obj.substring(0, 100)}...`);
                  }
              } else if (Array.isArray(obj)) {
                  obj.forEach((item, idx) => collectUrls(item, `${path}[${idx}]`));
              } else if (typeof obj === 'object') {
                  // 优先检查常见的视频URL字段名
                  const priorityKeys = ['fileUrl', 'videoUrl', 'url', 'output', 'result', 'video', 'file'];
                  for (const key of priorityKeys) {
                      if (obj[key]) collectUrls(obj[key], `${path}.${key}`);
                  }
                  // 然后检查其他字段
                  for (const [key, value] of Object.entries(obj)) {
                      if (!priorityKeys.includes(key)) {
                          collectUrls(value, `${path}.${key}`);
                      }
                  }
              }
          };
          collectUrls(respData, 'root');

          // Filter out the input image URL to avoid false positive
          const candidates = allUrls.filter(u => {
              // 排除原始图片URL
              if (u === info.imageUrl) return false;
              // 排除包含input或原始图片路径的URL
              if (u.includes('/input/')) return false;
              return true;
          });
          console.log("[findVideoUrl] Candidate URLs after filtering:", candidates);

          // Priority 1: Contains /output/ AND has video extension
          let match = candidates.find(u => u.includes('/output/') && isVideoExt(u));

          // Priority 2: Any URL with video extension
          if (!match) match = candidates.find(u => isVideoExt(u));

          // Priority 3: Contains /output/ and has video-like patterns (even without extension)
          if (!match) match = candidates.find(u =>
              u.includes('/output/') &&
              !isImageExt(u) &&
              (u.includes('video') || u.includes('mp4') || u.includes('live'))
          );

          // Priority 4: Contains /output/ and is not an image
          if (!match) match = candidates.find(u => u.includes('/output/') && !isImageExt(u));

          // Priority 5: Any non-image URL
          if (!match) match = candidates.find(u => !isImageExt(u));

          console.log("[findVideoUrl] Selected video URL:", match);
          return match || null;
      };

      // Polling Loop - wait for task completion and result
      let videoResultUrl = "";
      let attempts = 0;
      let consecutiveErrors = 0;
      let lastStatus = "";

      // 增加轮询次数和间隔适应性调整
      const MAX_ATTEMPTS = 200; // 增加到200次
      const POLL_INTERVAL_INITIAL = 3000; // 初始3秒
      const POLL_INTERVAL_LONG = 5000;    // 长时间后5秒

      console.log(`[Live] Starting polling for task ${taskId}, max ${MAX_ATTEMPTS} attempts`);

      while (!videoResultUrl && attempts < MAX_ATTEMPTS) {
          // 动态调整轮询间隔：前50次3秒，之后5秒
          const pollInterval = attempts < 50 ? POLL_INTERVAL_INITIAL : POLL_INTERVAL_LONG;
          await new Promise(r => setTimeout(r, pollInterval));

          try {
              const qRes = await fetch(QUERY_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ "taskId": taskId, "apiKey": RUNNINGHUB_API_KEY })
              });

              if (!qRes.ok) {
                  console.warn(`[Live] Poll #${attempts + 1}: HTTP ${qRes.status} ${qRes.statusText}`);
                  consecutiveErrors++;
                  if (consecutiveErrors >= 15) {
                      throw new Error(`Network error after ${consecutiveErrors} consecutive failures`);
                  }
                  attempts++;
                  continue;
              }

              const qData = await qRes.json();
              consecutiveErrors = 0; // 重置错误计数

              // 记录每10次或状态变化时的日志
              const currentStatus = `code:${qData.code},status:${qData.data?.status || 'N/A'}`;
              if (attempts % 10 === 0 || currentStatus !== lastStatus) {
                  console.log(`[Live] Poll #${attempts + 1}: ${currentStatus}`);
                  if (qData.code !== 804) {
                      console.log(`[Live] Full response:`, JSON.stringify(qData, null, 2).substring(0, 1000));
                  }
                  lastStatus = currentStatus;
              }

              // code 804: 任务正在运行中
              if (qData.code === 804) {
                  attempts++;
                  continue;
              }

              // code 805: 任务状态错误（可能是失败）
              if (qData.code === 805) {
                  const exceptionMsg = qData.data?.exception_message || '';
                  console.warn(`[Live] Task status error:`, exceptionMsg);
                  // 检查是否是安审失败
                  if (exceptionMsg.toLowerCase().includes('porn') || exceptionMsg.includes('色情')) {
                      throw new Error(`内容审核失败: ${exceptionMsg}`);
                  }
                  throw new Error(`任务状态错误: ${exceptionMsg || qData.msg || '未知错误'}`);
              }

              // code 0: 任务完成或有结果
              if (qData.code === 0 && qData.data) {
                  const dataObj = qData.data;
                  const statusRaw = dataObj.status || dataObj.taskStatus || '';
                  const status = String(statusRaw).toUpperCase();

                  // 检查失败状态
                  if (['FAILED', 'FAILURE', 'ERROR', 'CANCELLED'].includes(status)) {
                      throw new Error(`生成失败 (${status}): ${dataObj.errorMsg || dataObj.error || qData.msg || '未知错误'}`);
                  }

                  // 优先检查 output 数组（RunningHub 常见格式）
                  if (dataObj.output && Array.isArray(dataObj.output) && dataObj.output.length > 0) {
                      console.log(`[Live] Found output array with ${dataObj.output.length} items`);
                      for (const item of dataObj.output) {
                          const url = item?.fileUrl || item?.url || item?.videoUrl || item;
                          if (typeof url === 'string' && url.startsWith('http')) {
                              if (isVideoExt(url) || (!isImageExt(url) && url.includes('/output/'))) {
                                  videoResultUrl = url;
                                  console.log(`[Live] Video URL found in output array:`, videoResultUrl);
                                  break;
                              }
                          }
                      }
                  }

                  // 如果 output 数组没找到，尝试通用搜索
                  if (!videoResultUrl) {
                      const foundVideo = findVideoUrl(qData);
                      if (foundVideo) {
                          videoResultUrl = foundVideo;
                          console.log(`[Live] Video URL found via general search:`, videoResultUrl);
                      }
                  }

                  // 如果状态是成功但没找到URL，继续轮询（可能结果还在处理）
                  if (!videoResultUrl && ['SUCCESS', 'COMPLETED', 'SUCCEED'].includes(status)) {
                      console.log(`[Live] Status is ${status} but no video URL found yet, continuing...`);
                      // 不立即报错，再等几次
                      if (attempts > MAX_ATTEMPTS - 10) {
                          console.warn(`[Live] Near max attempts, status is SUCCESS but no video URL`);
                      }
                  }
              }

              // 其他未知 code
              if (qData.code !== 0 && qData.code !== 804) {
                  console.warn(`[Live] Unknown API code ${qData.code}: ${qData.msg}`);
              }

          } catch (fetchError: any) {
              if (fetchError.message?.includes('生成失败') || fetchError.message?.includes('内容审核')) {
                  throw fetchError; // 直接抛出明确的失败
              }
              console.warn(`[Live] Poll #${attempts + 1} error:`, fetchError.message);
              consecutiveErrors++;
              if (consecutiveErrors >= 15) {
                  throw fetchError;
              }
          }

          attempts++;
      }

      // 轮询结束后的处理
      if (videoResultUrl) {
          console.log(`[Live] Success! Video URL:`, videoResultUrl);
          setVideoUrl(videoResultUrl);
          setIsLiveActive(true);
          info.videoUrl = videoResultUrl;
      } else {
          // 最终尝试
          console.log(`[Live] Polling ended without result. Final attempt...`);
          await new Promise(r => setTimeout(r, 5000));

          const finalRes = await fetch(QUERY_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ "taskId": taskId, "apiKey": RUNNINGHUB_API_KEY })
          });

          if (finalRes.ok) {
              const finalData = await finalRes.json();
              console.log(`[Live] Final response:`, JSON.stringify(finalData, null, 2));

              // 检查 output 数组
              if (finalData.data?.output && Array.isArray(finalData.data.output)) {
                  for (const item of finalData.data.output) {
                      const url = item?.fileUrl || item?.url || item;
                      if (typeof url === 'string' && url.startsWith('http') && !isImageExt(url)) {
                          setVideoUrl(url);
                          setIsLiveActive(true);
                          info.videoUrl = url;
                          console.log(`[Live] Final attempt success:`, url);
                          return;
                      }
                  }
              }

              const finalVideo = findVideoUrl(finalData);
              if (finalVideo) {
                  setVideoUrl(finalVideo);
                  setIsLiveActive(true);
                  info.videoUrl = finalVideo;
                  return;
              }
          }

          throw new Error(`动态化生成超时（${attempts}次轮询）。任务可能仍在服务器处理中。\n任务ID: ${taskId}`);
      }
  };

  const handleLiveClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLiveGenerating) return;

      if (!videoUrl) {
          // Case 1: No video yet -> Ask to generate
          setShowLiveConfirm(true);
      } else {
          // Case 2: Has video -> Toggle playback
          setIsLiveActive(!isLiveActive);
      }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const downloadFile = async (url: string, filename: string): Promise<boolean> => {
      console.log('[Download] Attempting to download:', url, 'as', filename);

      // 确保URL正确编码（处理中文路径）
      let encodedUrl = url;
      try {
          if (/[\u4e00-\u9fa5]/.test(url)) {
              const urlObj = new URL(url);
              urlObj.pathname = urlObj.pathname.split('/').map(segment =>
                  /[\u4e00-\u9fa5]/.test(segment) ? encodeURIComponent(segment) : segment
              ).join('/');
              encodedUrl = urlObj.toString();
              console.log('[Download] Encoded URL:', encodedUrl);
          }
      } catch (e) {
          console.log('[Download] URL encoding failed, using original:', e);
      }

      // 根据文件名确定MIME类型
      const getMimeType = (fname: string): string => {
          const ext = fname.split('.').pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'gif': 'image/gif',
              'webp': 'image/webp',
              'mp4': 'video/mp4',
              'webm': 'video/webm'
          };
          return mimeTypes[ext || ''] || 'application/octet-stream';
      };

      // 辅助函数：将ArrayBuffer转换为Base64
      const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
          }
          return btoa(binary);
      };

      // 辅助函数：使用Data URL触发下载（完全内联，无跨域问题）
      const triggerDownloadWithFile = (arrayBuffer: ArrayBuffer, fname: string, mimeType: string) => {
          // 转换为base64 data URL
          const base64 = arrayBufferToBase64(arrayBuffer);
          const dataUrl = `data:${mimeType};base64,${base64}`;

          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = fname;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
              document.body.removeChild(link);
          }, 3000);

          console.log('[Download] Triggered with Data URL, filename:', fname);
      };

      // 方法1: 通过 fetch + File对象 下载
      try {
          const response = await fetch(encodedUrl, {
              mode: 'cors',
              credentials: 'omit'
          });
          if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              console.log('[Download] ArrayBuffer size:', arrayBuffer.byteLength);

              if (arrayBuffer.byteLength > 0) {
                  const mimeType = getMimeType(filename);
                  console.log('[Download] Using File object with name:', filename, 'type:', mimeType);
                  triggerDownloadWithFile(arrayBuffer, filename, mimeType);
                  console.log('[Download] Success via fetch + File');
                  return true;
              } else {
                  console.log('[Download] ArrayBuffer is empty');
              }
          } else {
              console.log('[Download] Fetch response not ok:', response.status);
          }
      } catch (e) {
          console.log('[Download] Fetch failed:', e);
      }

      // 方法2: 对于图片，尝试使用 canvas 方法
      const isImage = /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url) || /\/output\//i.test(url);
      if (isImage) {
          console.log('[Download] Trying canvas method for image');
          try {
              const success = await new Promise<boolean>((resolve) => {
                  const img = new Image();
                  img.crossOrigin = 'anonymous';
                  img.onload = async () => {
                      try {
                          const canvas = document.createElement('canvas');
                          canvas.width = img.naturalWidth;
                          canvas.height = img.naturalHeight;
                          console.log('[Download] Canvas size:', canvas.width, 'x', canvas.height);
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                              ctx.drawImage(img, 0, 0);
                              canvas.toBlob(async (blob) => {
                                  if (blob && blob.size > 0) {
                                      const arrayBuffer = await blob.arrayBuffer();
                                      triggerDownloadWithFile(arrayBuffer, filename, 'image/png');
                                      console.log('[Download] Success via canvas');
                                      resolve(true);
                                  } else {
                                      console.log('[Download] Canvas blob empty');
                                      resolve(false);
                                  }
                              }, 'image/png');
                          } else {
                              resolve(false);
                          }
                      } catch (err) {
                          console.log('[Download] Canvas draw error:', err);
                          resolve(false);
                      }
                  };
                  img.onerror = (err) => {
                      console.log('[Download] Image load error:', err);
                      resolve(false);
                  };
                  img.src = encodedUrl;
              });
              if (success) return true;
          } catch (e) {
              console.log('[Download] Canvas method failed:', e);
          }
      }

      // 方法3: 使用页面中已加载的图片
      try {
          const existingImg = document.querySelector(`img[src="${url}"], img[src="${encodedUrl}"]`) as HTMLImageElement;
          if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
              console.log('[Download] Using existing image from DOM');
              const canvas = document.createElement('canvas');
              canvas.width = existingImg.naturalWidth;
              canvas.height = existingImg.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(existingImg, 0, 0);
                  const dataUrl = canvas.toDataURL('image/png');
                  // 将dataUrl转换为ArrayBuffer
                  const base64 = dataUrl.split(',')[1];
                  const binaryString = atob(base64);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                      bytes[i] = binaryString.charCodeAt(i);
                  }
                  triggerDownloadWithFile(bytes.buffer, filename, 'image/png');
                  console.log('[Download] Success via existing image');
                  return true;
              }
          }
      } catch (e) {
          console.log('[Download] Existing image method failed:', e);
      }

      // 方法4: 最后的 fallback - 打开新窗口让用户手动右键保存
      console.log('[Download] All automatic methods failed, opening in new tab for manual save');
      alert('自动下载失败，将在新窗口打开图片，请右键选择"另存为"保存图片。');
      window.open(encodedUrl, '_blank');
      return false;
  };

  const downloadAll = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!info.imageUrl || isDownloading) return;

      setIsDownloading(true);
      const safeName = info.name.replace(/\s+/g, '_').replace(/·/g, '_');
      console.log('[Download] Starting download for:', safeName);
      console.log('[Download] Image URL:', info.imageUrl);
      console.log('[Download] Video URL:', videoUrl);

      try {
          // 下载图片
          await downloadFile(info.imageUrl, `${safeName}.png`);

          // 如果有视频，延迟一下再下载（避免浏览器阻止多个下载）
          if (videoUrl) {
              await new Promise(r => setTimeout(r, 500));
              await downloadFile(videoUrl, `${safeName}_live.mp4`);
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in select-none"
        onClick={onClose}
    >
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

      {/* Confirmation Modal */}
      {showLiveConfirm && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowLiveConfirm(false)}>
            <div className="bg-white rounded-xl p-6 w-80 shadow-2xl animate-fade-in-up border border-slate-200" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-2">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">启动动态化契约？</h3>
                    <p className="text-sm text-slate-500">角色动态化需要较长等待时间（约1-3分钟），请耐心等候。</p>
                    {(() => {
                        const status = getQueueStatus();
                        if (status.isProcessing || status.queueLength > 0) {
                            const waitCount = status.queueLength + (status.isProcessing ? 1 : 0);
                            return (
                                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                                    ⏳ 当前有 {waitCount} 个任务在队列中，您的任务将排队等待
                                </p>
                            );
                        }
                        return null;
                    })()}
                    <div className="flex gap-3 w-full mt-2">
                        <button
                            onClick={() => setShowLiveConfirm(false)}
                            className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                        >
                            取消
                        </button>
                        <button
                            onClick={generateLiveVideo}
                            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md"
                        >
                            确定
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Main Wrapper */}
      <div
        className={`relative w-full max-w-[420px] aspect-[2/3] flex flex-col group transition-all duration-300 ${showFullArt ? 'scale-[1.02]' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setIsHovering(false); }}
        onMouseEnter={() => setIsHovering(true)}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        
        {/* Full Art Mode: External Control Bar (Right Side) */}
        {showFullArt && (
            <div className="absolute top-0 -right-16 flex flex-col gap-4 animate-fade-in z-50">
                <button 
                    onClick={() => setShowFullArt(false)}
                    className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 hover:bg-white hover:text-black transition-colors backdrop-blur-md shadow-lg"
                    title="显示卡面信息"
                >
                    <EyeOff size={24} />
                </button>
                
                <button
                    onClick={downloadAll}
                    disabled={isDownloading}
                    className={`w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 transition-colors backdrop-blur-md shadow-lg ${isDownloading ? 'opacity-50 cursor-wait' : 'hover:bg-emerald-500 hover:border-emerald-400 hover:text-white'}`}
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

        {/* Card Content Container */}
        <div className={`relative w-full h-full rounded-xl overflow-hidden border-[3px] ${showFullArt ? 'border-transparent shadow-none' : `${theme.border} ${theme.shadow} bg-slate-900`} flex flex-col transition-all duration-300`}>

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
            <div className="absolute inset-0 z-0 bg-slate-800">
                {info.imageUrl ? (
                    <img
                        src={info.imageUrl}
                        alt={info.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                            (isSR || isSSR || isUR) && !showFullArt ? 'rarity-breathing' : ''
                        }`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">No Image</div>
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
                <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 via-25% to-transparent pointer-events-none transition-opacity duration-300 ${showFullArt ? 'opacity-0' : 'opacity-100'}`} />
                <div className={`absolute inset-0 bg-gradient-to-b from-black/60 to-transparent h-32 pointer-events-none transition-opacity duration-300 ${showFullArt ? 'opacity-0' : 'opacity-100'}`} />
            </div>

            {/* --- TOP SECTION --- */}
            {!showFullArt && (
            <div className="relative z-10 p-5 flex flex-col items-start gap-1 animate-fade-in">
                <div className="flex items-start justify-between w-full">
                    <div className="flex items-center gap-2">
                        <h2 className={`text-5xl font-black italic tracking-tighter pr-2 pb-1 ${theme.textColor} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}>
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
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => setShowFullArt(true)}
                            className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center border border-white/20 hover:bg-white hover:text-black transition-colors backdrop-blur-sm"
                            title="查看原图"
                        >
                            <Eye size={16} />
                        </button>

                        {/* R稀有度不显示LIVE按钮 */}
                        {!isR && (
                            <button
                                onClick={handleLiveClick}
                                disabled={isLiveGenerating}
                                className="h-7 px-1.5 rounded flex items-center justify-center border backdrop-blur-sm transition-all duration-300 bg-black/40 border-white/20 text-white hover:bg-black/60 hover:border-white/40"
                                title={videoUrl ? (isLiveActive ? "切换静态立绘" : "切换动态视频") : "生成动态"}
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
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-amber-500/90 text-white px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                                契约编撰中...前方{queuePosition}个灵魂
                            </div>
                        )}
                        {!isR && isLiveGenerating && queuePosition === 0 && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-indigo-500/90 text-white px-2 py-0.5 rounded-full shadow-lg">
                                灵魂连接中...
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-lg font-bold text-white tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)] border-l-4 border-white/50 pl-2 mb-1">
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
            <div className="relative z-10 mt-auto p-5 pb-6 animate-fade-in-up">
                <div className="flex items-start gap-3 mb-4">
                    {/* 职业图标区域 - 支持双职业 */}
                    <div className="flex gap-2 mt-4 shrink-0">
                        {profStyles.map((style, idx) => {
                            const Icon = style.icon;
                            const isRainbow = (style as any).isRainbow;

                            if (isRainbow) {
                                // 命运之子特殊彩虹色图标 - 彩虹月亮
                                return (
                                    <div key={idx} className="relative w-12 h-12 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
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
                                            className="relative z-10 w-8 h-8 drop-shadow-md"
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
                                <div key={idx} className={`w-12 h-12 rounded-lg ${style.bg} border-2 ${style.border} flex items-center justify-center shadow-lg`}>
                                    <Icon size={24} className="text-white drop-shadow-md" />
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-col pb-1">
                        <div
                            className={`text-[10px] font-bold uppercase tracking-wider text-white/80 w-fit px-1.5 rounded-sm mb-0.5 ${(profStyles[0] as any).isRainbow ? '' : profStyles[0].bg}`}
                            style={(profStyles[0] as any).isRainbow ? { background: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6)' } : {}}
                        >
                            {info.profession}
                        </div>
                        {(() => {
                            const [firstName, ...rest] = info.name.split('·');
                            const titlePart = rest.join('·');
                            return (
                                <div className="flex flex-col leading-none">
                                    <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] font-serif tracking-wide">
                                        {firstName}
                                    </h1>
                                    {titlePart && (
                                        <span className="text-sm text-white/90 font-serif italic tracking-wider mt-0.5 drop-shadow-md">
                                            {titlePart}
                                        </span>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className="flex items-center mb-3">
                    <div className="flex items-center -space-x-1 mr-1">
                        {renderActiveSlots()}
                    </div>
                    {renderUltimateSlot()}
                    <div className="flex flex-col gap-1 items-end ml-auto">
                        <span className="text-[8px] text-white/60 uppercase tracking-widest font-bold">Passive</span>
                        <div className="flex gap-1">
                            {renderPassiveSlots()}
                        </div>
                    </div>
                </div>

                <div className="mt-2">
                    <p className="text-xs text-white/90 italic leading-relaxed text-justify drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-medium">
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
