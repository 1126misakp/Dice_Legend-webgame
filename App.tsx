
import React, { useState, useRef, useEffect, useCallback } from 'react';
import DiceCanvas, { DiceCanvasRef } from './components/DiceCanvas';
import ResultPanel from './components/ResultPanel';
import CharacterOverview from './components/CharacterOverview'; // Kept for history/peek if needed, but primary view is Card now
import CharacterCard from './components/CharacterCard';
import SummonAnimation from './components/SummonAnimation';
import InventoryBar from './components/InventoryBar';
import RarityParticles from './components/RarityParticles';
import ApiSettingsPanel from './components/ApiSettingsPanel';
import { DiceResult, GameState, Inventory, CharacterInfo } from './types';
import { calculateDiceResult, upgradeProfession, generateFallbackInfo } from './logic/gameLogic';
import { Dices, RefreshCw, Eye, MessageSquareQuote, Handshake, RotateCcw, Gift, ShieldCheck, Anchor, KeyRound } from 'lucide-react';
import { runningHubQueue, getQueueStatus } from './utils/runningHubQueue';
import { audioService, Rarity } from './services/audioService';
import { playClickSound } from './hooks/useButtonSound';
import { generateCharacterVoices } from './services/voiceService';
import { ApiKeys, DEFAULT_OPENROUTER_MODEL, clearApiKeys, getApiCapabilities, loadApiKeys, saveApiKeys } from './utils/apiKeyStore';
import { proxyOpenRouterChat, proxyRunningHubOutputs, proxyRunningHubRun } from './utils/apiClient';

export default function App() {
  const diceRef = useRef<DiceCanvasRef>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [result, setResult] = useState<DiceResult | null>(null);
  const [charInfo, setCharInfo] = useState<CharacterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [peekMode, setPeekMode] = useState(false);
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [loadingText, setLoadingText] = useState("命运编织中...");
  const [visualProgress, setVisualProgress] = useState(0);
  
  const [stylePrompt, setStylePrompt] = useState('火焰纹章风格+西式幻想RPG');
  const [inventory, setInventory] = useState<Inventory>({ crests: 1, weightedDice: 1 });
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => loadApiKeys());
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const capabilities = getApiCapabilities(apiKeys);
  const openRouterModel = apiKeys.openRouterModel || DEFAULT_OPENROUTER_MODEL;
  
  const [fixedDiceIndices, setFixedDiceIndices] = useState<number[]>([]);
  const [weightedDiceIndices, setWeightedDiceIndices] = useState<number[]>([]);
  const [wentThroughRewardChoice, setWentThroughRewardChoice] = useState(false); // 是否经过了命运抉择
  const [consecutiveFailures, setConsecutiveFailures] = useState(0); // 连续召唤失败次数
  const [consumedItems, setConsumedItems] = useState({ crests: 0, weightedDice: 0 }); // 本次掷骰消耗的道具

  const [chargeLevel, setChargeLevel] = useState(0);
  const chargeStartTime = useRef<number>(0);
  const chargeRequestRef = useRef<number>(0);
  const progressIntervalRef = useRef<any>(null);
  const gameStateRef = useRef(gameState);
  const chargeLevelRef = useRef(chargeLevel);

  // API错误弹框状态
  const [apiErrorModal, setApiErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // 同步 refs
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { chargeLevelRef.current = chargeLevel; }, [chargeLevel]);

  // 初始化音效服务
  useEffect(() => {
    // 加载保存的音效设置
    audioService.loadSettings();

    // 在用户首次交互时初始化AudioContext
    const initAudio = () => {
      audioService.init();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('touchstart', initAudio);

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Helper to animate progress bar over 90 seconds
  const startProgressAnimation = () => {
      setVisualProgress(0);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      
      const startTime = Date.now();
      const duration = 90000; // 90 seconds

      progressIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min((elapsed / duration) * 100, 99); // Cap at 99% until actually done
          setVisualProgress(progress);
      }, 100);
  };

  const stopProgressAnimation = () => {
      if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
      }
      setVisualProgress(100);
  };

  const handleSaveApiKeys = (nextKeys: ApiKeys) => {
      const saved = saveApiKeys(nextKeys);
      setApiKeys(saved);
  };

  const handleClearApiKeys = () => {
      setApiKeys(clearApiKeys());
  };

  const buildLocalImagePrompt = (info: CharacterInfo) => {
      return [
          'fantasy tactical RPG character portrait',
          'anime game CG style',
          `${info.race} ${info.profession}`,
          `${info.attribute} elemental visual effects`,
          `${info.rarity} rarity costume details`,
          'full body character art',
          'clean background',
          'no text, no watermark'
      ].join(', ');
  };

  // 1. 投骰结束
  const handleRollComplete = (rawResult: any) => {
    // 判断是否使用了刻印或灌铅骰子
    const usedItems = fixedDiceIndices.length > 0 || weightedDiceIndices.length > 0;

    const finalResult = calculateDiceResult(rawResult.rawAttributes, rawResult.destinyPoint, rawResult.racePoint, usedItems);
    const displayProfession = upgradeProfession(finalResult.profession, finalResult.rarity);
    setResult({ ...finalResult, profession: displayProfession });

    // 记录本次掷骰消耗的道具（刻印数量 = fixedDiceIndices.length，灌铅骰子 = weightedDiceIndices.length）
    setConsumedItems({ crests: fixedDiceIndices.length, weightedDice: weightedDiceIndices.length });

    // 判断是否有奖励：如果有奖励，进入选择状态；否则直接进入缔结契约
    const hasRewards = finalResult.rewards.crests > 0 || finalResult.rewards.weightedDice > 0;
    if (hasRewards) {
      setWentThroughRewardChoice(true); // 标记经过了命运抉择
      setGameState(GameState.REWARD_CHOICE);
    } else {
      setWentThroughRewardChoice(false); // 标记未经过命运抉择
      setGameState(GameState.CONTRACT_PENDING);
    }
  };

  // 2. 使用灌铅骰子后更新结果与命运抉择状态
  const handleDiceUpdate = (rawResult: any) => {
	      // 使用灌铅骰子后，usedItems一定为true
	      const finalResult = calculateDiceResult(rawResult.rawAttributes, rawResult.destinyPoint, rawResult.racePoint, true);
	      const displayProfession = upgradeProfession(finalResult.profession, finalResult.rarity);
	      const nextResult = { ...finalResult, profession: displayProfession };

	      setResult(nextResult);

	      // 根据最新结果决定是否需要显示「命运的抉择」
	      const hasRewards = nextResult.rewards.crests > 0 || nextResult.rewards.weightedDice > 0;

	      setGameState(prev => {
	          if (prev === GameState.CONTRACT_PENDING && hasRewards) {
	              // 原来没有奖励，通过灌铅骰子调整出了奖励 -> 进入命运的抉择
	              return GameState.REWARD_CHOICE;
	          }
	          if (prev === GameState.REWARD_CHOICE && !hasRewards) {
	              // 原来有奖励，被调整到无奖励 -> 回到直接缔结契约
	              return GameState.CONTRACT_PENDING;
	          }
	          return prev;
	      });
	  };

  // 3. 用户选择：抽卡（不获得奖励）
  const handleChooseContract = () => {
    if (!result || gameState !== GameState.REWARD_CHOICE) return;
    playClickSound(); // 播放点击音效
    // 清空奖励，进入缔结契约
    setResult({ ...result, rewards: { crests: 0, weightedDice: 0 } });
    setGameState(GameState.CONTRACT_PENDING);
  };

  // 4. 用户选择：获得奖励（不抽卡）
  const handleChooseReward = () => {
    if (!result || gameState !== GameState.REWARD_CHOICE) return;
    playClickSound(); // 播放点击音效
    // 发放奖励
    setInventory(prev => ({
      crests: prev.crests + result.rewards.crests,
      weightedDice: prev.weightedDice + result.rewards.weightedDice
    }));
    // 清空锁定状态，返回 IDLE
    setFixedDiceIndices([]);
    setWeightedDiceIndices([]);
    setResult(null);
    setGameState(GameState.IDLE);
  };

  // 5. 缔结契约
  const handleMakeContract = async () => {
    if (!result || gameState !== GameState.CONTRACT_PENDING) return;
    playClickSound(); // 播放点击音效
    
    setGameState(GameState.AI_GENERATING);
    setLoadingText("正在撰写命运篇章..."); // Step 1 status
    setVisualProgress(0);

    // 自定义错误类型
    class TimeoutError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'TimeoutError';
      }
    }

    class ApiError extends Error {
      public details: string;
      constructor(message: string, details: string = '') {
        super(message);
        this.name = 'ApiError';
        this.details = details;
      }
    }

    // 带超时的单次fetch函数（不自动重试，由调用方处理）
    const fetchWithTimeout = async (
      url: string,
      options: RequestInit,
      timeoutMs: number = 30000
    ): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        console.log(`[API] Fetching ${url}...`);
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          // 尝试获取详细错误信息
          let errorDetails = '';
          try {
            const errorData: any = await response.json();
            errorDetails = errorData.error?.message || errorData.message || JSON.stringify(errorData);
          } catch {
            errorDetails = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new ApiError(`API请求失败`, errorDetails);
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);

        if ((error as Error).name === 'AbortError') {
          throw new TimeoutError('请求超时（30秒无响应）');
        }

        throw error;
      }
    };

    // 1. Text Generation (OpenRouter - grok-4.1-fast)
    let generatedInfo: CharacterInfo | null = null;

    try {
      // Updated Prompt with Strict Equipment Rules
      const systemPrompt = `你是一个《骰子传说》游戏的文案策划AI。
请基于提供的角色数值设定，创作角色的【名字】、【头衔】和【人物描述】。

【语言要求】你必须且只能使用中文回复，所有内容都必须是中文，包括角色名字、头衔和描述。绝对不要使用英文或其他语言。

【重要】在撰写【人物描述】时，必须严格遵守以下职业与装备/特征的对应关系，绝对不要描述不属于该职业的武器：
1. 初级战士/战士/狂战士/冠军勇士：必须持有【巨斧或双斧】。
2. 见习剑士/剑士/剑圣：必须持有【轻型单手长剑或双手轻型剑】。
3. 见习弓手/弓箭手/狙击手/神射手：必须持有【弓】。
4. 见习佣兵/佣兵/勇者：必须持有【巨剑】。
5. 初级盗贼/盗贼/刺客/抹杀使徒：必须持有【短剑或拳刃】。
6. 初级斗士/斗士/决斗士：必须是【徒手】或佩戴【拳套】，用斗气作为武器。
7. 见习骑士/骑士/圣骑士：武器可以是剑或枪，但必须描述有【马】作为坐骑。
8. 见习天马骑士/天马骑士/独角兽骑士：武器可以是剑或枪，但必须描述有【天马】作为坐骑（飞行单位）。
9. 见习弓骑兵/弓骑兵/游侠将军：必须持有【弓】，且必须描述有【马】作为坐骑。
10. 初级守卫/重甲兵/巨盾守卫/铠将军：武器是剑或枪，但必须描述持有【巨盾】。
11. 见习术士/术士/巫术大师：必须持有【魔法杖】引导暗魔法。
12. 初级召唤师/召唤师/通灵大师：身边必须描述有【召唤兽】或【魔法生物召唤物】。
13. 修道士/牧师/神官：必须持有【权杖】引导光魔法。
14. 见习魔导士/魔导士/贤者/大贤者：必须持有【魔法书】引导元素魔法。
15. 初级魔术师/魔术师/咒术大师：身上必须描述有明显的【魔法纹身】或【刻印】，用魔力附魔肉体或武器。

要求：
1. 名字 (name)：角色的中文姓名，包含称号（格式如：名字·称号），必须是中文。
2. 头衔 (title)：显示在稀有度下方的小字，用于描述角色的身份，必须是中文。
3. 人物描述 (description)：一段关于角色背景或性格的中文短文，必须包含上述职业对应的外貌或装备特征。

返回格式必须是纯 JSON 对象，不要使用 Markdown 代码块。所有字段值必须是中文。`;

      const userPrompt = `
        角色设定：
        风格：${stylePrompt}
        稀有度：${result.rarity}
        职业：${result.profession}
        属性：${result.attribute}
        种族：${result.race.name}
        年龄：${result.age}

        请生成 JSON 数据：
        { "name": "...", "title": "...", "description": "..." }
      `;

      if (!capabilities.openRouter) {
        console.warn("[CharacterInfo] 未配置 OpenRouter API Key，使用本地角色文案兜底");
        generatedInfo = generateFallbackInfo(result, stylePrompt);
      } else {
      console.log("[CharacterInfo] Starting text generation with grok-4.1-fast...");
      const data = await proxyOpenRouterChat(apiKeys.openRouter, {
        model: openRouterModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 10000,
        temperature: 0.8
      });
      const content = data.choices[0].message.content;

      // 清理可能的 Markdown 代码块包装
      let cleanedContent = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const aiData = JSON.parse(cleanedContent);

      generatedInfo = {
        ...aiData,
        style: stylePrompt,
        gender: '女',
        age: result.age,
        profession: result.profession,
        race: result.race.name,
        attribute: result.attribute,
        rarity: result.rarity
      };

      console.log("[CharacterInfo] Text generation successful");
      }

    } catch (e: any) {
      console.warn("Text Generation failed:", e);

      if (e.name === 'TimeoutError') {
        // 超时：提示并自动返回缔结契约界面
        setLoadingText("角色信息生成超时，正在返回...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        setGameState(GameState.CONTRACT_PENDING);
        return;
      } else if (e.name === 'ApiError') {
        // API错误：弹框显示错误详情
        setApiErrorModal({
          show: true,
          message: `角色信息生成失败\n\n错误详情：${e.details || e.message}`
        });
        return;
      } else {
        // 其他错误（如网络错误等）：尝试使用本地备用生成器
        console.warn("Using fallback generator due to error:", e);
        generatedInfo = generateFallbackInfo(result, stylePrompt);
      }
    }

    if (!generatedInfo) return;

    // === 并行任务：开始生成角色语音（不阻塞后续流程）===
    // 语音生成Promise，稍后会等待它完成
    let voiceGenerationPromise: Promise<any> | null = null;

    if (capabilities.miniMax) {
      console.log('[Voice] 开始并行生成角色语音...');
      voiceGenerationPromise = generateCharacterVoices(
        generatedInfo,
        apiKeys,
        (current, total, skillType) => {
          console.log(`[Voice] 生成进度: ${current}/${total} - ${skillType}`);
        }
      ).catch(err => {
        console.error('[Voice] 语音生成异常:', err);
        return { success: false, error: err.message };
      });
    } else {
      console.warn('[Voice] 未配置 MiniMax API Key，跳过语音生成');
    }

    // 2. 使用 OpenRouter API (grok-4.1-fast) 生成立绘提示词
    setLoadingText("灵魂连接中...");

    let imagePrompt = "";
    const safeDesc = generatedInfo.description ? generatedInfo.description.substring(0, 150) : "神秘的角色";

    // 构建给 AI 的角色信息
    const characterInfoForPrompt = `游戏风格:${generatedInfo.style}，姓名:${generatedInfo.name.split('·')[0]}，性别:${generatedInfo.gender}，年龄:${generatedInfo.age}，职业:${generatedInfo.profession}，种族:${generatedInfo.race}，属性:${generatedInfo.attribute}，稀有度:${generatedInfo.rarity}，人物札记:${safeDesc}`;

    // 立绘师系统提示词
    const illustratorSystemPrompt = `# Role: 幻想战棋手游首席立绘师 (Fantasy Tactical RPG Lead Artist)

## Profile
你是一名拥有10年经验的幻想战棋手游立绘师。你擅长使用 Midjourney / Stable Diffusion 的提示词逻辑来构筑画面，能够根据角色的年龄、属性和稀有度，设计出符合游戏设定、装备清晰、姿态有表现力的角色立绘。

## Goals
接收用户提供的游戏设定和角色信息，输出一段高质量的、用于AI绘画的英文提示词（Prompt）。

## Constraints & Rules (必须严格遵守)
1.  **核心风格**：必须是高质量的二次元/2.5D厚涂风格，强调光影、皮肤质感和解剖学的夸张美感（Game CG quality）。

2.  **全年龄视觉原则 (Safe Fantasy Focus)**：
    -   **成年角色**：强调职业气质、装备轮廓、动态姿势、面部辨识度和属性特效。
    -   **年轻角色**：强调清爽、勇敢、可爱或灵动的冒险者气质，禁止任何性化表达。
    -   **姿势 (Poses)**：使用战斗、施法、防御、骑乘、待机等游戏动作，禁止裸露、挑逗或性暗示姿势。

3.  **稀有度视觉分级系统 (Rarity Scaling System)**：
    *这是工作的核心，稀有度越高，装备/武器/着装越华丽，动作越丰富，人物形象越美型*

    -   **R (Rare)**：
        -   **视角**：**平视/标准视角**（Eye level, Cowboy shot），无透视变形，清晰展示角色正面。
        -   **角色外观**：普通美貌，清秀型。
        -   **装备与着装**：朴素实用的装备，普通材质（布料、皮革、铁器），无华丽装饰，武器造型简洁。
        -   **姿势**：简单的站姿或坐姿，服装完整。
        -   **背景**：极简背景（Simple background），纯色或简单渐变。
        -   **画面张力**：低。

    -   **SR (Super Rare)**：
        -   **视角**：**轻微角度变化**（Slightly from below/above, Dutch angle），增加画面的生动感。
        -   **角色外观**：美丽动人，有一定魅力。
        -   **装备与着装**：精致的装备，带有一些装饰细节（银饰、刺绣、镶边），武器有雕花或纹路，服装剪裁讲究。
        -   **姿势**：动态姿势，突出武器、施法手势或职业动作。
        -   **背景**：简单场景，背景虚化（Blurred background），有明确空间感。
        -   **画面张力**：中。

    -   **SSR (Specially Super Rare)**：
        -   **视角**：**电影级动态视角**（Cinematic angle, Dynamic angle）。
            -   *仰视（From below）*：强调长腿、压迫感或裙底风光。
            -   *俯视（From above）*：强调乳沟、无辜感或被支配感。
        -   **角色外观**：绝世美貌，倾国倾城级别，五官精致完美。
        -   **装备与着装**：华丽的装备，使用高级材质（丝绸、精钢、宝石镶嵌），武器有魔法光效或元素附魔效果，服装设计感强，有披风、流苏等动态元素。
        -   **姿势**：极具张力的战斗构图和姿势，装备破损仅限非暴露的战斗磨损。
        -   **背景**：精细复杂的全景，强调环境叙事和电影级光照。
        -   **画面张力**：高。

    -   **UR (Ultra Rare)**：
        -   **视角**：**极端透视与视觉冲击**（Extreme foreshortening, Fisheye, Wide angle）。肢体（如脚、手、胸部）极度靠近镜头，产生打破第四面墙的立体感。
        -   **角色外观**：神颜级别，超越凡俗的绝美，如神祇或仙女下凡，散发圣洁或堕落的气质。
        -   **装备与着装**：传说级华丽装备，极致奢华（金银丝线、发光符文、浮动的能量碎片、神圣/暗黑光环），武器有强烈的视觉特效（火焰、雷电、神圣光芒等），服装华丽完整，如神装、圣衣、魔王战袍。
        -   **姿势**：视觉爆炸，构图和姿势更具张力，呈现"Live2D"般的瞬间定格。
        -   **背景**：艺术化/超现实背景，神圣或堕落的领域感，背景与特效融为一体。
        -   **画面张力**：**极高（Max Impact）**。

4.  **属性与视觉呈现**：
    -   将用户提供的属性（如火、冰、暗）转化为对应的主色调（Theme Color）和环境光效。

5.  **种族特征系统 (Race Feature System)**：
    *种族特征必须明确体现，且稀有度越高特征越突出、越精致*

    **【重要】耳朵规则**：
    - **只有精灵族和恶魔族**可以使用"pointed ears"、"elf ears"、"long ears"等尖耳描述
    - **人类、神族、龙族、亡灵族**必须是**普通人类耳朵**，绝对禁止出现任何尖耳相关词汇

    -   **人类 (Human)**：
        -   标准人类外观，普通圆形耳朵，无特殊种族特征。
        -   根据稀有度提升皮肤质感和细节精致度。

    -   **恶魔 (Demon)**：
        -   **必备特征**：恶魔角（demon horns）、恶魔竖瞳（vertical slit pupils, red irises）、尖锐犬牙（sharp fangs）、尖耳（pointed ears）。
        -   **肤色**：深色系/暗色系（dark skin, grayish skin, ashen complexion）。
        -   **R级**：5cm黑色弯曲小角，微露犬牙，红色瞳孔。
        -   **SR级**：10cm螺旋恶魔角，外露獠牙，金红色竖瞳，小型蝙蝠翅膀。
        -   **SSR级**：15cm大型弯曲角带金色纹路，獠牙明显，发光红瞳，完整蝙蝠翅膀，细长恶魔尾。
        -   **UR级**：20cm皇冠状巨型恶魔角带火焰效果，全套恶魔翅膀和尾巴，全身暗红色能量纹路。

    -   **精灵 (Elf)**：
        -   **必备特征（所有稀有度都必须明显）**：精灵尖耳（long pointed elf ears, 10-15cm length）。
        -   **肤色**：白皙肤色。
        -   **R级**：10cm尖耳，绿色/蓝色虹膜，光滑皮肤。
        -   **SR级**：12cm尖耳带银色耳环，翠绿色虹膜，金色或银色长发。
        -   **SSR级**：15cm修长尖耳带精致耳饰，发光的绿色虹膜，头发缠绕藤蔓或花朵。
        -   **UR级**：15cm以上华丽尖耳配宝石耳饰，虹膜带有光晕，全身环绕发光的自然元素粒子。

    -   **神族 (Divine/Celestial)**：
        -   **必备特征**：瓷白无瑕皮肤（porcelain white skin）、发光瞳孔（glowing golden/white irises）、普通人类耳朵。
        -   **R级**：白皙肌肤，淡金色发光虹膜。
        -   **SR级**：瓷白肌肤，明亮发光瞳孔，头顶小型光环。
        -   **SSR级**：完美无瑕白皙皮肤，强烈发光的金色瞳孔，背后一对白色羽翼，头顶光环。
        -   **UR级**：全身散发柔和白光，巨大多层羽翼，瞳孔如小太阳般发光，背后巨型发光法阵。

    -   **龙族 (Dragon/Dragonkin)**：
        -   **必备特征**：龙角（curved dragon horns）、龙尾（scaled dragon tail）、竖瞳（vertical slit pupils）、普通人类耳朵。
        -   **R级**：8cm小型弯曲龙角，60cm细长龙尾，金色竖瞳。
        -   **SR级**：12cm龙角带鳞片纹理，80cm龙尾，发光橙色竖瞳，手臂有少量鳞片。
        -   **SSR级**：18cm大型弯曲龙角，100cm粗壮龙尾带尾刃，燃烧效果的红色竖瞳，四肢覆盖鳞片，背后一对龙翼。
        -   **UR级**：25cm皇者级巨型龙角，150cm龙尾带火焰效果，完整龙翼展开，全身若隐若现金色鳞片，瞳孔散发压迫感光芒。

    -   **亡灵 (Undead)**：
        -   **必备特征**：苍白无血色皮肤（pale gray skin, bloodless complexion）、无神白色瞳孔（white empty pupils, lifeless gaze）、部分骨骼外露（exposed bones）、普通人类耳朵。
        -   **R级**：灰白色皮肤，空洞的白色眼睛，手指关节骨骼外露。
        -   **SR级**：死灰色皮肤带青紫血管纹路，完全白色瞳孔，手臂和锁骨处骨骼外露，皮肤有缝合痕迹。
        -   **SSR级**：半透明灰白皮肤，眼眶有蓝色灵魂火焰，大面积骨骼外露（肋骨、脊椎可见），全身环绕幽灵雾气。
        -   **UR级**：皮肤与骨骼完美融合的死亡美学，眼眶燃烧强烈灵魂之火，全身缠绕幽冥锁链，头戴骨质王冠，背后巨型骷髅虚影。

## Prompt Structure Strategy (提示词构建策略)
生成的英文提示词需遵循以下顺序（**禁止使用quality标签**）：
1.  **Camera & Perspective**: ([Rarity based Angle tags: foreshortening/fisheye/from below], [Focus tags])
2.  **Character & Body**: (1girl, solo, [Race features - 具体尺寸和颜色], [Age/Body type tags], [Skin texture])
3.  **Outfit & Job**: ([Job uniform], [Clothing details], [Rarity based equipment details])
4.  **Legwear & Footwear**: ([若符合腿部装饰触发条件，必须添加：stockings/thighhighs/garter belt/high heels等])
5.  **Pose & Expression**: ([Seductive pose], [Expression])
6.  **Attribute & VFX**: ([Elemental effects], [Magic spells], [Color theme])
7.  **Background**: ([Background description matched with Rarity logic])

## Workflow
1.  **分析输入**：解析用户的游戏风格、角色性别、年龄段、职业、种族、属性、稀有度、人物札记。
2.  **逻辑映射**：
    -   根据**职业**确定：角色穿着和武器以及一些该职业必备的物件或坐骑：
        - 战士类(初级战士/战士/狂战士/冠军勇士)：武器是巨斧或双斧
        - 剑士类(见习剑士/剑士/剑圣)：武器是轻型单手长剑或双手轻型剑
        - 弓箭手类(见习弓手/弓箭手/狙击手/神射手)：武器是弓，**必须添加腿部装饰**
        - 佣兵类(见习佣兵/佣兵/勇者)：武器是巨剑
        - 盗贼类(初级盗贼/盗贼/刺客/抹杀使徒)：武器是短剑或拳刃，**必须添加腿部装饰**
        - 武者类(初级斗士/斗士/决斗士)：徒手或拳套，用斗气战斗
        - 骑士类(见习骑士/骑士/圣骑士)：武器是剑或枪，必须有马
        - 天马骑士类(见习天马骑士/天马骑士/独角兽骑士)：武器是剑或枪，必须有天马（飞行）
        - 弓骑兵类(见习弓骑兵/弓骑兵/游侠将军)：武器是弓，必须有马
        - 重甲兵类(初级守卫/重甲兵/巨盾守卫/铠将军)：武器是剑或枪，必须有巨盾
        - 术士类(见习术士/术士/巫术大师)：使用魔法杖引导暗魔法，**必须添加腿部装饰**
        - 召唤师类(初级召唤师/召唤师/通灵大师)：必须有召唤兽或魔法生物，**必须添加腿部装饰**
        - 圣职类(修道士/牧师/神官)：武器是权杖，引导光魔法，**必须添加腿部装饰**
        - 魔导士类(见习魔导士/魔导士/贤者/大贤者)：武器是魔法书，引导元素魔法，**必须添加腿部装饰**
        - 魔术师类(初级魔术师/魔术师/咒术大师)：身上必须有魔法纹身或刻印，**必须添加腿部装饰**
    -   根据**稀有度**确定：镜头视角、穿着物件和道具的视觉精致度（关键）、背景复杂度、特效强度、**腿部装饰的华丽程度**。
    -   根据**种族**确定：必须严格按照"种族特征系统"添加对应的种族外观特征，使用**具体的尺寸、颜色、数量**描述（如"15cm curved dragon horns"而非"大型龙角"）。
    -   根据**年龄**确定：体型、表情和服装成熟度。年轻角色必须保持全年龄冒险者表现。
3.  **生成提示词**：编写一段连贯的英文Prompt，**种族特征关键词必须出现在提示词中**。
4.  **输出结果**：只输出英文提示词，不要任何解释性文字。

## 输出格式要求（必须严格遵守）
1.  **客观具象描述**：所有描述必须是客观、可视化的具体特征（如颜色、尺寸、形状、材质），严禁使用比喻、情感化修辞（如"如星辰般闪耀"、"散发威压"、"美如画卷"等）。
2.  **禁止源标签**：绝对不能包含"8K"、"masterpiece"、"best quality"、"highres"、"illustration"、"unity 8k wallpaper"、"extremely detailed"等质量标签或绘制指令。
3.  **禁止尖耳滥用**：只有精灵族和恶魔族可以使用"pointed ears"、"elf ears"等尖耳描述，其他种族必须是普通人类耳朵或不提及耳朵。
4.  **画面无文字**：画面中绝对不能出现任何文字、字母、符号。
5.  **纯英文输出**：只输出英文提示词，不包含任何中文或解释性文字。

## 腿部装备规则 (Leg Armor & Footwear System)
**【重要】以下条件满足任意一条时，必须在提示词中加入合适的腿部装备元素**：

**触发条件（满足任意一条）**：
1. **法系职业**：术士、巫术大师、召唤师、通灵大师、圣职（修道士/牧师/神官）、魔导士、贤者、大贤者、魔术师、咒术大师
2. **敏捷系职业**：盗贼、刺客、抹杀使徒、弓箭手、狙击手、神射手
3. **战斗角色**：需要符合职业动作的靴子、护膝或腿甲

**腿部装饰关键词选择（根据角色风格和稀有度选择）**：
-   **护具类**：leather greaves, steel knee guards, armored boots, cloth wraps, riding boots, mage boots, ranger gaiters
-   **鞋靴类**：combat boots, riding boots, reinforced boots, elegant mage boots
-   **职业细节**：belt pouches, knee armor, engraved shin guards, rune patterns on boots

**稀有度与腿部装饰华丽度对应**：
-   **R级**：简单皮靴或布料绑腿
-   **SR级**：带纹路的战斗靴或轻型护膝
-   **SSR级**：华丽腿甲、符文靴或职业化护具
-   **UR级**：传说级腿甲、宝石嵌饰护具、发光符文或元素特效

**风格适配**：
-   法系职业优先使用：mage boots, rune patterns, mystical leg accessories
-   敏捷系职业优先使用：light greaves, ranger gaiters, flexible combat boots
-   骑乘职业优先使用：riding boots, reinforced knee guards, saddle-ready leg armor`;

    try {
      if (!capabilities.openRouter) {
        console.warn("[ImagePrompt] 未配置 OpenRouter API Key，使用本地立绘提示词");
        imagePrompt = buildLocalImagePrompt(generatedInfo);
      } else {
      console.log("[ImagePrompt] Starting image prompt generation...");
      const openRouterData = await proxyOpenRouterChat(apiKeys.openRouter, {
        "model": openRouterModel,
        "messages": [
          { "role": "system", "content": illustratorSystemPrompt },
          { "role": "user", "content": characterInfoForPrompt }
        ],
        "max_tokens": 10000,
        "temperature": 0.8
      });
      imagePrompt = openRouterData.choices[0]?.message?.content || "";

      // 清理提示词：移除可能的 markdown 代码块标记
      imagePrompt = imagePrompt.replace(/```[\s\S]*?```/g, '').replace(/`/g, '').trim();

      console.log("[ImagePrompt] Generated Image Prompt:", imagePrompt);
      }

    } catch (e: any) {
      console.warn("[ImagePrompt] API failed:", e);

      if (e.name === 'TimeoutError') {
        // 超时：提示并自动返回缔结契约界面
        setLoadingText("立绘提示词生成超时，正在返回...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        setGameState(GameState.CONTRACT_PENDING);
        return;
      } else if (e.name === 'ApiError') {
        // API错误：弹框显示错误详情
        setApiErrorModal({
          show: true,
          message: `立绘提示词生成失败\n\n错误详情：${e.details || e.message}`
        });
        return;
      } else {
        // 其他错误：使用备用提示词
        console.warn("[ImagePrompt] Using fallback prompt");
        imagePrompt = `best quality, masterpiece, 8k, highres, illustration, 1girl, solo, ${generatedInfo.race}, ${generatedInfo.profession}, ${generatedInfo.attribute} element effects, fantasy game character, detailed outfit`;
      }
    }

    if (!imagePrompt) {
      imagePrompt = `best quality, masterpiece, 8k, highres, illustration, 1girl, solo, fantasy character`;
    }

    const finalizeCharacter = async (info: CharacterInfo) => {
        audioService.playSummonSound(info.rarity as Rarity);
        setGameState(GameState.SHOW_CARD);
        setFixedDiceIndices([]);
        setWeightedDiceIndices([]);
        setConsecutiveFailures(0);
        setConsumedItems({ crests: 0, weightedDice: 0 });
        setCharInfo(info);

        if (voiceGenerationPromise) {
            console.log('[Voice] 等待语音生成完成...');
            const voiceResult = await voiceGenerationPromise;

            if (voiceResult?.success && voiceResult?.data) {
                console.log('[Voice] 语音生成成功！');
                setCharInfo({ ...info, voices: voiceResult.data });
            } else {
                console.warn('[Voice] 语音生成失败:', voiceResult?.error);
            }
        }
    };

    if (!capabilities.runningHub) {
        console.warn('[RunningHub] 未配置 RunningHub API Key，跳过立绘生成');
        stopProgressAnimation();
        setLoadingText('未配置立绘服务，展示文字契约...');
        await new Promise(r => setTimeout(r, 800));
        await finalizeCharacter(generatedInfo);
        return;
    }

    // 3. Image Generation (RunningHub) - 使用新的工作流
    // Helper to find URL recursively in the response structure
    const findImage = (obj: any): string | null => {
        if (!obj) return null;
        if (typeof obj === 'string') {
            if (obj.startsWith('http')) {
                if (/\.(jpeg|jpg|png|webp|gif|bmp)(\?.*)?$/i.test(obj)) return obj;
            }
            return null;
        }
        if (typeof obj === 'object') {
            const keysToCheck = ['fileUrl', 'imgUrl', 'imageUrl', 'url', 'image', 'outputUrl'];
            for (const key of keysToCheck) {
                if (obj[key] && typeof obj[key] === 'string' && obj[key].startsWith('http')) {
                    return obj[key];
                }
            }
            if (Array.isArray(obj)) {
                for (const item of obj) {
                    const found = findImage(item);
                    if (found) return found;
                }
            } else {
                for (const key in obj) {
                    if (typeof obj[key] === 'object' || Array.isArray(obj[key])) {
                        const found = findImage(obj[key]);
                        if (found) return found;
                    }
                }
            }
        }
        return null;
    };

    // 单次图片生成尝试
    const attemptImageGeneration = async (): Promise<string> => {
        setLoadingText("灵魂连接中...");
        startProgressAnimation();

        // --- Step A: Submit Task ---
        const executeData = await proxyRunningHubRun(apiKeys.runningHub, {
            "webappId": "2004539728869425154",
            "nodeInfoList": [
                { "nodeId": "63", "fieldName": "text", "fieldValue": imagePrompt, "description": "角色立绘完整提示词" },
                { "nodeId": "71", "fieldName": "text", "fieldValue": generatedInfo.name.split('·')[0], "description": "角色姓名" }
            ]
        });
        if (executeData.code !== 0) {
            throw new Error(`RunningHub API error: ${executeData.msg || 'Unknown error'}`);
        }

        console.log("RH Execute Data:", executeData);

        // --- Step B: Determine Task ID or Direct Result ---
        let imageUrl = "";
        let taskId = "";

        const directImage = findImage(executeData.data);
        if (directImage) {
            imageUrl = directImage;
        } else if (executeData.data && executeData.data.taskId) {
            taskId = executeData.data.taskId;
        } else if (typeof executeData.data === 'string' && executeData.data.length > 5) {
            taskId = executeData.data;
        }

        // --- Step C: Poll for Result if Task ID exists ---
        if (taskId && !imageUrl) {
            console.log("Polling for Task ID:", taskId);
            setLoadingText("正在召唤...");

            let attempts = 0;
            const maxAttempts = 200;

            // 检测失败状态的辅助函数
            const isFailureStatus = (status: string): boolean => {
                const failureStatuses = [
                    'FAILURE', 'FAILED', 'ERROR', 'CANCELLED', 'CANCELED',
                    'TIMEOUT', 'REJECTED', 'ABORTED', 'EXCEPTION'
                ];
                return failureStatuses.includes(status);
            };

            // 检测失败信息的辅助函数（包括安审失败等）
            const checkForFailure = (data: any): string | null => {
                // 检查常见的错误信息字段
                const errorFields = ['errorMsg', 'error', 'message', 'msg', 'reason', 'failReason'];
                for (const field of errorFields) {
                    if (data[field] && typeof data[field] === 'string') {
                        const msg = data[field].toLowerCase();
                        // 检测安审失败、内容审核失败等关键词
                        if (msg.includes('安审') || msg.includes('审核') || msg.includes('违规') ||
                            msg.includes('敏感') || msg.includes('forbidden') || msg.includes('blocked') ||
                            msg.includes('rejected') || msg.includes('censored') || msg.includes('nsfw') ||
                            msg.includes('inappropriate') || msg.includes('policy') || msg.includes('moderation')) {
                            return data[field];
                        }
                        // 检测一般性失败
                        if (msg.includes('fail') || msg.includes('error') || msg.includes('失败')) {
                            return data[field];
                        }
                    }
                }
                // 检查嵌套的 output 数组中的错误
                if (data.output && Array.isArray(data.output)) {
                    for (const item of data.output) {
                        if (item && typeof item === 'object') {
                            const nestedError = checkForFailure(item);
                            if (nestedError) return nestedError;
                        }
                    }
                }
                return null;
            };

            while (!imageUrl && attempts < maxAttempts) {
                try {
                    const queryData = await proxyRunningHubOutputs(apiKeys.runningHub, taskId);
                    console.log(`[Poll ${attempts}] Response:`, JSON.stringify(queryData).substring(0, 500));

                    // code 804 = APIKEY_TASK_IS_RUNNING，任务正在运行中，继续轮询
                    if (queryData.code === 804 && queryData.msg === 'APIKEY_TASK_IS_RUNNING') {
                        // 正常状态，继续等待
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        attempts++;
                        continue;
                    }

                    // 检查特殊错误码：805 = APIKEY_TASK_STATUS_ERROR（可能是安审失败）
                    if (queryData.code === 805 && queryData.msg === 'APIKEY_TASK_STATUS_ERROR') {
                        const data = queryData.data || {};
                        const exceptionMsg = data.exception_message || '';

                        console.warn(`[Poll] APIKEY_TASK_STATUS_ERROR detected, exception_message:`, exceptionMsg);

                        // 只有当 exception_message 包含 "Porn" 等安审关键词时才判定为失败
                        if (exceptionMsg.toLowerCase().includes('porn') ||
                            exceptionMsg.includes('色情') ||
                            exceptionMsg.includes('违规') ||
                            exceptionMsg.includes('nsfw')) {
                            throw new Error(`安审失败: ${exceptionMsg}`);
                        }

                        // 其他 805 错误也视为失败
                        throw new Error(`任务状态错误: ${exceptionMsg || '未知错误'}`);
                    }

                    if (queryData.code === 0 && queryData.data) {
                        const statusRaw = queryData.data.status || queryData.data.taskStatus;
                        const status = statusRaw ? String(statusRaw).toUpperCase() : '';

                        // 只检查 exception_message 字段中的安审关键词
                        const exceptionMsg = queryData.data.exception_message || '';
                        if (exceptionMsg && (
                            exceptionMsg.toLowerCase().includes('porn') ||
                            exceptionMsg.includes('色情') ||
                            exceptionMsg.includes('违规'))) {
                            console.warn(`[Poll] 安审失败:`, exceptionMsg);
                            throw new Error(`安审失败: ${exceptionMsg}`);
                        }

                        // 检查是否有失败状态
                        if (isFailureStatus(status)) {
                            const errorMsg = queryData.data.errorMsg || queryData.data.error || queryData.msg || 'Unknown error';
                            console.warn(`[Poll] Task failed with status: ${status}, error: ${errorMsg}`);
                            throw new Error(`Generation Failed (${status}): ${errorMsg}`);
                        }

                        // 尝试查找图片
                        const foundImg = findImage(queryData.data);
                        if (foundImg) {
                            imageUrl = foundImg;
                            break;
                        }

                        if (status === 'SUCCESS' || status === 'COMPLETED' || status === 'SUCCEED') {
                            if (!imageUrl && queryData.data.output && Array.isArray(queryData.data.output)) {
                                const outUrl = queryData.data.output[0]?.fileUrl;
                                if (outUrl) imageUrl = outUrl;
                            }
                        }
                    }
                } catch (queryError: any) {
                    const message = queryError?.message || '';
                    if (message.includes('安审失败') || message.includes('任务状态错误') || message.includes('Generation Failed')) {
                        throw queryError;
                    }
                    console.warn(`[Poll ${attempts}] 查询失败:`, queryError);
                }

                if (imageUrl) break;
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;
            }
        }

        if (!imageUrl) {
            throw new Error("Image generation failed - no image returned");
        }

        return imageUrl;
    };

    // 检查队列状态
    const queueStatus = getQueueStatus();
    if (queueStatus.isProcessing || queueStatus.queueLength > 0) {
        const waitCount = queueStatus.queueLength + (queueStatus.isProcessing ? 1 : 0);
        setLoadingText(`契约编撰中...前方${waitCount}个灵魂`);
        console.log(`[Static] Waiting in queue. Position: ${queueStatus.queueLength + 1}`);
    }

    const staticQueueId = `static-${generatedInfo.name}-${Date.now()}`;

    try {
        await runningHubQueue.enqueue(staticQueueId, async () => {
            const imageUrl = await attemptImageGeneration();

            // --- Step D: Finish ---
            if (imageUrl) {
                stopProgressAnimation();
                generatedInfo.imageUrl = imageUrl;
                setLoadingText("正在显影...");
                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = resolve;
                    img.src = imageUrl;
                    setTimeout(resolve, 5000);
                });

                await finalizeCharacter(generatedInfo);
            } else {
                throw new Error("No image URL found after processing.");
            }
        });

    } catch (e: any) {
        stopProgressAnimation();
        console.warn("Image Gen Error:", e);

        // 增加连续失败计数
        setConsecutiveFailures(prev => prev + 1);

        // 生成失败，显示提示并回退到缔结契约界面
        setLoadingText("召唤失败，请重试...");
        await new Promise(r => setTimeout(r, 1500)); // 让用户看到失败提示

        // 回退到 CONTRACT_PENDING 状态，让用户手动重新点击缔结契约
        setGameState(GameState.CONTRACT_PENDING);
    }
  };

  const startCharge = () => {
    if (gameStateRef.current !== GameState.IDLE) return;
    // 同步更新 ref，确保 endCharge 能立即读取到
    gameStateRef.current = GameState.CHARGING;
    setGameState(GameState.CHARGING);
    chargeStartTime.current = performance.now();
    const update = () => {
        const level = Math.min((performance.now() - chargeStartTime.current) / 800 * 100, 100);
        chargeLevelRef.current = level;
        setChargeLevel(level);
        chargeRequestRef.current = requestAnimationFrame(update);
    };
    update();
  };

  const endCharge = useCallback(() => {
    // 使用 ref 获取最新状态，避免闭包陷阱
    if (gameStateRef.current !== GameState.CHARGING) return;
    cancelAnimationFrame(chargeRequestRef.current);
    const force = 15 + (40 * (chargeLevelRef.current / 100));
    // 同步更新 ref
    gameStateRef.current = GameState.ROLLING;
    chargeLevelRef.current = 0;
    setChargeLevel(0);
    setGameState(GameState.ROLLING);
    setResult(null);
    setCharInfo(null);
    diceRef.current?.throwDice(force);
  }, []);

  const toggleDiceLock = (index: number) => {
    if (gameState !== GameState.IDLE) return;
    setFixedDiceIndices(prev => {
      if (prev.includes(index)) {
        setInventory(inv => ({ ...inv, crests: inv.crests + 1 }));
        return prev.filter(i => i !== index);
      } else {
        if (inventory.crests > 0) {
          setInventory(inv => ({ ...inv, crests: inv.crests - 1 }));
          return [...prev, index];
        }
        return prev;
      }
    });
  };

  const handleWeightedDiceUse = (index: number) => {
      if (!weightedDiceIndices.includes(index)) {
          if (inventory.weightedDice > 0) {
              setInventory(inv => ({ ...inv, weightedDice: inv.weightedDice - 1 }));
              setWeightedDiceIndices(prev => [...prev, index]);
          }
      }
  };

  // 取消所有灌铅骰子操作，返还库存并恢复骰子状态
  const handleCancelWeightedDice = () => {
      const usedCount = weightedDiceIndices.length;
      if (usedCount > 0) {
          // 恢复骰子到原始状态
          diceRef.current?.resetWeightedDice();
          // 返还灌铅骰子到库存
          setInventory(inv => ({ ...inv, weightedDice: inv.weightedDice + usedCount }));
          // 清空灌铅状态
          setWeightedDiceIndices([]);
      }
  };

  const handleReset = () => {
      playClickSound(); // 播放点击音效
      setGameState(GameState.IDLE);
      setResult(null);
      setCharInfo(null);
      setWeightedDiceIndices([]);
      setFixedDiceIndices([]);
      setVisualProgress(0);
  };

  // 取消召唤确认弹框状态
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // 取消缔结契约，回到掷骰子界面（保留骰子结果但允许重投）
  const handleCancelContract = () => {
      playClickSound(); // 播放点击音效
      setShowCancelConfirm(false);
      setGameState(GameState.IDLE);
      setResult(null);
      setWentThroughRewardChoice(false);
      // 保留刻印锁定的骰子，但清除灌铅修改（如果有的话可以归还）
      // 暂时清空灌铅状态，让用户可以重新投掷
      setWeightedDiceIndices([]);
      setConsecutiveFailures(0);
      setConsumedItems({ crests: 0, weightedDice: 0 });
  };

  // 重投（未经过命运抉择时使用，无需确认）
  const handleReroll = () => {
      playClickSound(); // 播放点击音效
      setGameState(GameState.IDLE);
      setResult(null);
      setWentThroughRewardChoice(false);
      setWeightedDiceIndices([]);
      setConsecutiveFailures(0);
      setConsumedItems({ crests: 0, weightedDice: 0 });
  };

  // 连续失败5次后重置（返还消耗的道具）
  const handleFailureReset = () => {
      if (consecutiveFailures < 5) return;
      playClickSound(); // 播放点击音效

      // 返还本次掷骰消耗的道具
      setInventory(prev => ({
          crests: prev.crests + consumedItems.crests,
          weightedDice: prev.weightedDice + consumedItems.weightedDice
      }));

      // 重置状态
      setGameState(GameState.IDLE);
      setResult(null);
      setWentThroughRewardChoice(false);
      setWeightedDiceIndices([]);
      setFixedDiceIndices([]);
      setConsecutiveFailures(0);
      setConsumedItems({ crests: 0, weightedDice: 0 });
  };

  useEffect(() => {
    const handleUp = () => endCharge();
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [endCharge]);

  // Button State Logic
  let mainButtonText = "长按召唤";
  let mainButtonAction = null;
  let isButtonDisabled = false;
  // Base 3D styling
  let buttonStyleClass = "border-b-4 active:border-b-0 active:translate-y-1";
  let shineClass = "";

  if (gameState === GameState.ROLLING) {
      mainButtonText = "命运流转...";
      isButtonDisabled = true;
      buttonStyleClass += " bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed";
  } else if (gameState === GameState.REWARD_CHOICE) {
      // 在奖励选择状态下，主按钮被隐藏（通过下面的条件渲染）
      mainButtonText = "请选择...";
      isButtonDisabled = true;
      buttonStyleClass += " bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed";
  } else if (gameState === GameState.CONTRACT_PENDING) {
      mainButtonText = "缔结契约";
      mainButtonAction = handleMakeContract;
      
      const rarity = result?.rarity || 'R';
      // 3D gradients and borders based on rarity
      if (rarity === 'UR') {
        buttonStyleClass += " bg-gradient-to-b from-yellow-400 via-red-500 to-red-600 border-red-800 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)]";
        shineClass = "animate-shine-superfast opacity-50";
      } else if (rarity === 'SSR') {
        buttonStyleClass += " bg-gradient-to-b from-pink-400 via-purple-500 to-indigo-600 border-indigo-900 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]";
        shineClass = "animate-shine-fast opacity-40";
      } else if (rarity === 'SR') {
        buttonStyleClass += " bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 border-amber-800 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]";
        shineClass = "animate-shine opacity-30";
      } else {
        // R
        buttonStyleClass += " bg-gradient-to-b from-blue-400 via-blue-500 to-blue-700 border-blue-900 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]";
        shineClass = "animate-shine opacity-20";
      }
      
  } else if (gameState === GameState.AI_GENERATING) {
      mainButtonText = "契约缔结中...";
      isButtonDisabled = true;
      buttonStyleClass += " bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed";
  } else if (gameState === GameState.SHOW_CARD || gameState === GameState.RESULT) {
      // In Card mode, button is hidden or just allows reset
      mainButtonText = "重新召唤";
      mainButtonAction = handleReset;
      buttonStyleClass += " bg-gradient-to-b from-indigo-500 to-indigo-700 border-indigo-900 hover:brightness-110 text-white";
  } else {
      // IDLE
      buttonStyleClass += " bg-gradient-to-b from-indigo-500 to-indigo-700 border-indigo-900 hover:brightness-110 text-white";
  }

  // Animation State Control
  const [showCardReveal, setShowCardReveal] = useState(false);
  useEffect(() => {
      if (gameState === GameState.SHOW_CARD) {
          setShowCardReveal(false); // Reset
          // Wait for summon animation to finish (controlled by component below)
      }
  }, [gameState]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-100 text-slate-800 font-sans select-none">
       <style>{`
        @keyframes shine {
          0% { transform: translateX(-150%) skewX(-20deg); }
          40% { transform: translateX(150%) skewX(-20deg); }
          100% { transform: translateX(150%) skewX(-20deg); }
        }
        .animate-shine { animation: shine 4s infinite; }
        .animate-shine-fast { animation: shine 3s infinite; }
        .animate-shine-superfast { animation: shine 2s infinite; }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-500 { animation-delay: 500ms; }
      `}</style>

       {/* 3D Dice Scene */}
      <DiceCanvas 
        ref={diceRef} 
        onRollComplete={handleRollComplete} 
        onDiceUpdate={handleDiceUpdate}
        fixedDiceIndices={fixedDiceIndices}
        weightedDiceIndices={weightedDiceIndices}
        onDiceClick={toggleDiceLock}
        onWeightedDiceUsed={handleWeightedDiceUse}
        inventory={inventory}
        gameState={gameState}
        onAssetsLoaded={() => setTimeout(() => setLoading(false), 800)} 
      />

      {/* Top Left Menu (Hidden during card show) */}
      {gameState !== GameState.SHOW_CARD && (
        <div className={`absolute top-6 left-6 z-40 flex items-center gap-3 transition-all duration-500 ${peekMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-4 rounded-2xl flex items-center gap-4 shadow-xl">
            <button 
                onClick={() => setIsStyleOpen(!isStyleOpen)}
                className={`p-2.5 rounded-xl transition-all ${isStyleOpen ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'}`}
                title="风格设置"
            >
                <Dices size={24} />
            </button>
            <button
                onClick={() => setIsApiSettingsOpen(true)}
                className={`p-2.5 rounded-xl transition-all ${capabilities.openRouter && capabilities.runningHub && capabilities.miniMax ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                title="API 设置"
            >
                <KeyRound size={22} />
            </button>
            <div 
                className="flex flex-col pr-2 cursor-pointer select-none group"
                onClick={() => setIsStyleOpen(!isStyleOpen)}
            >
                <h1 className="text-xl font-black font-serif tracking-widest leading-tight text-slate-900 group-hover:text-indigo-900 transition-colors">骰子传说</h1>
                <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.2em]">Crest Summoner</div>
            </div>
            </div>

            <div className={`transition-all duration-500 origin-left overflow-hidden ${isStyleOpen ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 pointer-events-none'}`}>
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-4 rounded-2xl shadow-xl flex items-center gap-3 whitespace-nowrap">
                <MessageSquareQuote size={18} className="text-indigo-500 flex-shrink-0" />
                <input 
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                placeholder="输入游戏风格关键词..."
                className="bg-transparent border-b border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 w-44 px-1 placeholder-slate-400"
                />
            </div>
            </div>
        </div>
      )}

      {/* Peek Toggle */}
      {gameState !== GameState.SHOW_CARD && (
        <button
            onClick={() => setPeekMode(!peekMode)}
            className={`absolute bottom-8 right-8 z-50 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${peekMode ? 'bg-indigo-600 text-white shadow-indigo-500/50 scale-110' : 'bg-white/80 backdrop-blur-md border border-white/40 text-slate-500 hover:text-indigo-600 hover:bg-white'}`}
        >
            <Eye size={28} />
        </button>
      )}

      {/* Info Panel (Old Overview - Hidden in SHOW_CARD) */}
      <div className={`absolute top-8 right-8 z-20 w-80 md:w-96 flex flex-col gap-6 transition-all duration-500 ${peekMode || gameState === GameState.SHOW_CARD ? 'translate-x-[120%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
        <ResultPanel result={result} visible={!!result} />
      </div>

      {/* Summon Animation & Card */}
      {gameState === GameState.SHOW_CARD && charInfo && (
          <>
            {!showCardReveal && (
                <SummonAnimation 
                    rarity={charInfo.rarity} 
                    onComplete={() => setShowCardReveal(true)} 
                />
            )}
            {showCardReveal && (
                <CharacterCard info={charInfo} onClose={handleReset} apiKeys={apiKeys} capabilities={capabilities} />
            )}
          </>
      )}

      {/* Bottom Area (Controls) - Hidden when Card is shown */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-4xl px-4 flex flex-col items-center gap-6 transition-all duration-500 ${peekMode || gameState === GameState.SHOW_CARD ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <div className="w-full flex justify-center gap-8 items-end">
            <div className="hidden lg:block">
                <InventoryBar
                    inventory={inventory}
                    activeFixedCount={fixedDiceIndices.length}
                    activeWeightedCount={weightedDiceIndices.length}
                    onCancelWeightedDice={handleCancelWeightedDice}
                />
            </div>

            <div className="flex flex-col gap-4 w-72 md:w-96">
                {/* 奖励选择界面 - 仅在 REWARD_CHOICE 状态显示 */}
                {gameState === GameState.REWARD_CHOICE && result && (() => {
                    // 根据稀有度设置缔结契约按钮样式
                    const rarity = result.rarity;
                    let contractButtonClass = "w-full relative overflow-hidden text-white font-black py-4 px-6 rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all shadow-lg ";
                    let shineClass = "";

                    if (rarity === 'UR') {
                        contractButtonClass += "bg-gradient-to-b from-yellow-400 via-red-500 to-red-600 border-red-800 shadow-[0_0_20px_rgba(239,68,68,0.6)]";
                        shineClass = "animate-shine-superfast opacity-50";
                    } else if (rarity === 'SSR') {
                        contractButtonClass += "bg-gradient-to-b from-pink-400 via-purple-500 to-indigo-600 border-indigo-900 shadow-[0_0_15px_rgba(168,85,247,0.5)]";
                        shineClass = "animate-shine-fast opacity-40";
                    } else if (rarity === 'SR') {
                        contractButtonClass += "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 border-amber-800 shadow-[0_0_15px_rgba(245,158,11,0.5)]";
                        shineClass = "animate-shine opacity-30";
                    } else {
                        contractButtonClass += "bg-gradient-to-b from-blue-400 via-blue-500 to-blue-700 border-blue-900 shadow-[0_0_10px_rgba(59,130,246,0.5)]";
                        shineClass = "animate-shine opacity-20";
                    }

                    return (
                        <div className="relative w-full bg-white/90 backdrop-blur-xl border-2 border-amber-400 rounded-2xl p-6 shadow-2xl animate-fade-in">
                            <div className="text-center mb-4">
                                <h3 className="text-xl font-black text-amber-600 mb-2">命运的抉择</h3>
                                <p className="text-sm text-slate-600">你获得了特殊骰型！请选择你的奖励：</p>
                            </div>

                            <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
                                <div className="text-xs text-amber-700 font-bold mb-2">本次奖励：</div>
                                <div className="flex gap-4 justify-center">
                                    {result.rewards.crests > 0 && (
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <ShieldCheck size={20} />
                                            <span className="font-bold">{result.rewards.crests} 刻印</span>
                                        </div>
                                    )}
                                    {result.rewards.weightedDice > 0 && (
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <Anchor size={20} />
                                            <span className="font-bold">{result.rewards.weightedDice} 灌铅骰子</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {/* 缔结契约按钮 - 带粒子特效和稀有度颜色 - 占据更多空间 */}
                                <div className="flex-[3] relative">
                                    {/* 粒子特效背景 */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] pointer-events-none z-0">
                                        <RarityParticles rarity={rarity} />
                                    </div>

                                    <button
                                        onClick={handleChooseContract}
                                        className={contractButtonClass}
                                    >
                                        {/* Shine Effect */}
                                        <div className={`absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none ${shineClass}`} />

                                        {/* Inner Highlight */}
                                        <div className="absolute inset-0 border-t border-white/30 rounded-xl pointer-events-none"></div>

                                        <div className="relative z-10 flex flex-col items-center gap-1">
                                            <Handshake size={20} />
                                            <span className="text-sm">缔结契约</span>
                                            <span className="text-[10px] opacity-80">(抽卡)</span>
                                        </div>
                                    </button>
                                </div>

                                {/* 领取奖励按钮 - 占据较少空间 */}
                                <button
                                    onClick={handleChooseReward}
                                    className="flex-1 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-600 hover:to-amber-700 text-white font-black py-4 px-6 rounded-xl border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 transition-all shadow-lg"
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <Gift size={20} />
                                        <span className="text-sm">领取奖励</span>
                                        <span className="text-[10px] opacity-80">(不抽卡)</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Button Container with Relative Positioning for Particles */}
	                <div className="relative w-full group flex gap-2">
                    {/* External Surrounding Particles (Behind Main Button) - 扩大范围，避免明显矩形裁剪 */}
	                    {gameState === GameState.CONTRACT_PENDING && result && (
	                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[300%] pointer-events-none z-0">
	                          <RarityParticles rarity={result.rarity} />
	                      </div>
	                    )}

                    {/* 取消召唤/重投小按钮 - 仅在 CONTRACT_PENDING 状态显示 */}
                    {gameState === GameState.CONTRACT_PENDING && (
                        wentThroughRewardChoice ? (
                            // 经过命运抉择 -> 显示"取消召唤"（需要确认弹框）
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="relative z-10 w-14 h-20 rounded-xl bg-slate-600 hover:bg-slate-500 border-b-4 border-slate-800 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center shadow-lg"
                                title="取消召唤，返回掷骰子界面"
                            >
                                <RotateCcw size={20} className="text-white" />
                                <span className="text-[9px] text-white/80 mt-1 font-bold text-center leading-tight">取消<br/>召唤</span>
                            </button>
                        ) : (
                            // 未经过命运抉择 -> 显示"重投"（直接重投，无需确认）
                            <button
                                onClick={handleReroll}
                                className="relative z-10 w-14 h-20 rounded-xl bg-slate-600 hover:bg-slate-500 border-b-4 border-slate-800 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center shadow-lg"
                                title="重新投掷"
                            >
                                <RotateCcw size={20} className="text-white" />
                                <span className="text-[9px] text-white/80 mt-1 font-bold">重投</span>
                            </button>
                        )
                    )}

                    {/* 主按钮 - 在 REWARD_CHOICE 状态下隐藏 */}
                    {gameState !== GameState.REWARD_CHOICE && (
                        <button
                            onMouseDown={gameState === GameState.IDLE ? startCharge : undefined}
                            onTouchStart={gameState === GameState.IDLE ? startCharge : undefined}
                            onClick={mainButtonAction || undefined}
                            disabled={isButtonDisabled}
                            className={`relative z-10 flex-1 h-20 rounded-xl transition-all flex items-center justify-center overflow-hidden shadow-2xl ${buttonStyleClass}`}
                        >
                            {/* Charge Overlay */}
                            {gameState === GameState.CHARGING && (
                                <div className="absolute left-0 top-0 h-full bg-white/30 transition-all pointer-events-none" style={{ width: `${chargeLevel}%` }} />
                            )}

                            {/* Shine Effect */}
                            {gameState === GameState.CONTRACT_PENDING && (
                               <div className={`absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none ${shineClass}`} />
                            )}

                            {/* Inner Highlight/Border for Extra 3D Detail */}
                            <div className="absolute inset-0 border-t border-white/30 rounded-xl pointer-events-none"></div>

                            <span className="relative z-10 font-black text-xl uppercase tracking-[0.3em] flex items-center justify-center gap-3 drop-shadow-md">
                                {gameState === GameState.CONTRACT_PENDING && <Handshake size={24} />}
                                {mainButtonText}
                            </span>
                        </button>
                    )}

                    {/* 重置按钮 - 仅在 CONTRACT_PENDING 状态显示，连续失败5次才可点击 */}
                    {gameState === GameState.CONTRACT_PENDING && (
                        <button
                            onClick={handleFailureReset}
                            disabled={consecutiveFailures < 5}
                            className={`relative z-10 w-14 h-20 rounded-xl border-b-4 transition-all flex flex-col items-center justify-center shadow-lg ${
                                consecutiveFailures >= 5
                                    ? 'bg-amber-600 hover:bg-amber-500 border-amber-800 active:border-b-0 active:translate-y-1 cursor-pointer'
                                    : 'bg-slate-400 border-slate-500 cursor-not-allowed opacity-60'
                            }`}
                            title={consecutiveFailures >= 5
                                ? '返还消耗的道具并重新开始'
                                : `当连续召唤失败达到5次时可点击 ${consecutiveFailures}/5`}
                        >
                            <RefreshCw size={20} className="text-white" />
                            <span className="text-[9px] text-white/80 mt-1 font-bold">重置</span>
                            <span className="text-[8px] text-white/60">{consecutiveFailures}/5</span>
                        </button>
                    )}
                </div>

                <div className="text-[11px] text-center text-slate-400 font-black uppercase tracking-[0.4em]">
                    Crest: {fixedDiceIndices.length} | Weighted: {weightedDiceIndices.length}
                </div>
                {(!capabilities.openRouter || !capabilities.runningHub || !capabilities.miniMax) && (
                    <button
                        onClick={() => setIsApiSettingsOpen(true)}
                        className="text-[11px] text-center text-amber-600 font-bold bg-amber-50/90 border border-amber-200 rounded-xl px-3 py-2 hover:bg-amber-100"
                    >
                        API 未完整配置：缺失能力会自动降级
                    </button>
                )}
            </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col items-center justify-center">
            {/* 游戏风格魔法阵加载动画 */}
            <div className="relative w-24 h-24 mb-6">
                {/* 外圈 - 逆时针旋转 */}
                <div className="absolute inset-0 border-4 border-indigo-300 rounded-full animate-[spin_3s_linear_infinite_reverse] opacity-60" />
                {/* 中圈 - 顺时针旋转 */}
                <div className="absolute inset-2 border-2 border-dashed border-indigo-500 rounded-full animate-[spin_2s_linear_infinite]" />
                {/* 内圈 - 脉冲 */}
                <div className="absolute inset-4 border-2 border-indigo-600 rounded-full animate-pulse" />
                {/* 中心符文 */}
                <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">⚔️</div>
                {/* 四角符文 */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-sm animate-bounce">✦</div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-sm animate-bounce delay-100">✦</div>
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 text-sm animate-bounce delay-200">✦</div>
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 text-sm animate-bounce delay-300">✦</div>
            </div>
            <div className="text-indigo-900 text-lg font-black tracking-[0.5em] uppercase animate-pulse">正在刻印纹章</div>
        </div>
      )}

      <ApiSettingsPanel
        apiKeys={apiKeys}
        capabilities={capabilities}
        open={isApiSettingsOpen}
        onClose={() => setIsApiSettingsOpen(false)}
        onSave={handleSaveApiKeys}
        onClear={handleClearApiKeys}
      />

      {gameState === GameState.AI_GENERATING && (() => {
         // 根据稀有度设置颜色
         const rarityColors = {
           R: {
             border: 'border-blue-400/60',
             shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
             runeText: 'text-blue-300',
             coreBg: 'bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400',
             coreShadow: 'shadow-[0_0_25px_rgba(59,130,246,0.8)]',
             progressBorder: 'border-blue-500/50',
             progressShadow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]',
             progressBg: 'bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400',
             progressGlow: 'shadow-[0_0_15px_rgba(59,130,246,0.6)]',
             particle: 'bg-blue-300'
           },
           SR: {
             border: 'border-purple-400/60',
             shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
             runeText: 'text-purple-300',
             coreBg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-purple-400',
             coreShadow: 'shadow-[0_0_25px_rgba(168,85,247,0.8)]',
             progressBorder: 'border-purple-500/50',
             progressShadow: 'shadow-[0_0_10px_rgba(168,85,247,0.3)]',
             progressBg: 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-400',
             progressGlow: 'shadow-[0_0_15px_rgba(168,85,247,0.6)]',
             particle: 'bg-purple-300'
           },
           SSR: {
             border: 'border-yellow-400/60',
             shadow: 'shadow-[0_0_20px_rgba(234,179,8,0.5)]',
             runeText: 'text-yellow-300',
             coreBg: 'bg-gradient-to-br from-yellow-500 via-amber-400 to-orange-400',
             coreShadow: 'shadow-[0_0_25px_rgba(234,179,8,0.8)]',
             progressBorder: 'border-yellow-500/50',
             progressShadow: 'shadow-[0_0_10px_rgba(234,179,8,0.3)]',
             progressBg: 'bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-400',
             progressGlow: 'shadow-[0_0_15px_rgba(234,179,8,0.6)]',
             particle: 'bg-yellow-300'
           },
           UR: {
             border: 'border-pink-400/60',
             shadow: 'shadow-[0_0_25px_rgba(236,72,153,0.6)]',
             runeText: 'text-pink-300',
             coreBg: 'bg-gradient-to-br from-red-500 via-purple-500 to-cyan-400',
             coreShadow: 'shadow-[0_0_30px_rgba(236,72,153,0.9)]',
             progressBorder: 'border-pink-500/50',
             progressShadow: 'shadow-[0_0_15px_rgba(236,72,153,0.4)]',
             progressBg: 'bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-cyan-400 via-blue-500 to-purple-500',
             progressGlow: 'shadow-[0_0_20px_rgba(236,72,153,0.7)]',
             particle: 'bg-pink-300'
           }
         };
         const rarity = result?.rarity || 'SR';
         const colors = rarityColors[rarity as keyof typeof rarityColors] || rarityColors.SR;
         const isUR = rarity === 'UR';

         return (
         <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
             {/* 游戏风格召唤魔法阵动画 */}
             <div className="relative w-32 h-32 mb-8">
                 {/* 最外圈 - 慢速旋转 + 发光 */}
                 <div className={`absolute inset-0 border-2 ${colors.border} rounded-full animate-[spin_4s_linear_infinite] ${colors.shadow}`}
                      style={isUR ? { borderImage: 'linear-gradient(90deg, #ef4444, #eab308, #22c55e, #06b6d4, #8b5cf6, #ec4899) 1', animation: 'spin 4s linear infinite' } : {}} />
                 {/* 外圈符文环 - 逆时针 */}
                 <div className="absolute inset-2 rounded-full animate-[spin_3s_linear_infinite_reverse]">
                     <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 ${colors.runeText} text-xs`}>◆</div>
                     <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 ${colors.runeText} text-xs`}>◆</div>
                     <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 ${colors.runeText} text-xs`}>◆</div>
                     <div className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 ${colors.runeText} text-xs`}>◆</div>
                 </div>
                 {/* 中圈 - 虚线旋转 */}
                 <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-full animate-[spin_2s_linear_infinite]" />
                 {/* 内圈 - 脉冲发光 */}
                 <div className="absolute inset-6 border-2 border-white/60 rounded-full animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                 {/* 六芒星 */}
                 <div className="absolute inset-0 flex items-center justify-center animate-[spin_6s_linear_infinite]">
                     <svg className={`w-16 h-16 ${isUR ? 'text-pink-400/80' : rarity === 'SSR' ? 'text-yellow-400/80' : rarity === 'R' ? 'text-blue-400/80' : 'text-purple-400/80'}`} viewBox="0 0 100 100" fill="currentColor">
                         <polygon points="50,5 61,40 97,40 68,62 79,97 50,75 21,97 32,62 3,40 39,40" />
                     </svg>
                 </div>
                 {/* 中心能量核心 */}
                 <div className="absolute inset-0 flex items-center justify-center">
                     <div className={`w-8 h-8 ${colors.coreBg} rounded-full animate-pulse ${colors.coreShadow}`} />
                 </div>
                 {/* 浮动粒子 */}
                 <div className="absolute inset-0 animate-[spin_5s_linear_infinite]">
                     <div className="absolute top-2 left-1/2 w-1 h-1 bg-white rounded-full animate-ping" />
                 </div>
                 <div className="absolute inset-0 animate-[spin_5s_linear_infinite_reverse]">
                     <div className={`absolute bottom-2 left-1/2 w-1 h-1 ${colors.particle} rounded-full animate-ping delay-500`} />
                 </div>
             </div>

             <div className="text-white text-lg font-black tracking-[0.5em] uppercase animate-pulse mb-4">{loadingText}</div>

             {/* Visual Progress Bar - 魔法能量条样式 */}
             <div className={`w-64 h-3 bg-black/40 rounded-full overflow-hidden border ${colors.progressBorder} ${colors.progressShadow}`}>
                 <div
                    className={`h-full ${colors.progressBg} transition-all duration-100 ease-linear ${colors.progressGlow} relative`}
                    style={{ width: `${visualProgress}%` }}
                 >
                     {/* 进度条上的光效 */}
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite]" />
                 </div>
             </div>
         </div>
         );
      })()}

      {/* 取消召唤确认弹框 */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border-2 border-slate-600 shadow-2xl max-w-sm w-full p-6 animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-white font-black text-lg mb-4 text-center">确定取消召唤吗？</h3>
            <p className="text-slate-300 text-sm mb-6 text-center leading-relaxed">
              取消后将返回到掷骰子界面，并且已消耗的<span className="text-amber-400 font-bold">刻印</span>、<span className="text-purple-400 font-bold">灌铅骰子</span>等消耗品将<span className="text-red-400 font-bold">不会返还</span>。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-bold transition-all border-b-4 border-slate-700 active:border-b-0 active:translate-y-1"
              >
                继续召唤
              </button>
              <button
                onClick={handleCancelContract}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
              >
                确定取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API错误弹框 */}
      {apiErrorModal.show && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border-2 border-red-500/50 shadow-2xl max-w-md w-full p-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h3 className="text-red-400 font-black text-lg mb-4 text-center">API 调用失败</h3>
            <div className="bg-slate-900/50 rounded-lg p-4 mb-6 max-h-40 overflow-y-auto">
              <p className="text-slate-300 text-sm whitespace-pre-wrap break-words leading-relaxed">
                {apiErrorModal.message}
              </p>
            </div>
            <button
              onClick={() => {
                setApiErrorModal({ show: false, message: '' });
                setGameState(GameState.CONTRACT_PENDING);
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-bold transition-all border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              返回缔结契约
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
