
import React, { useState, useRef, useEffect, useCallback } from 'react';
import DiceCanvas, { DiceCanvasRef } from './components/DiceCanvas';
import ResultPanel from './components/ResultPanel';
import CharacterOverview from './components/CharacterOverview'; // Kept for history/peek if needed, but primary view is Card now
import CharacterCard from './components/CharacterCard';
import SummonAnimation from './components/SummonAnimation';
import InventoryBar from './components/InventoryBar';
import ThreeRarityAura from './components/ThreeRarityAura';
import ApiSettingsPanel from './components/ApiSettingsPanel';
import ApiErrorModal from './components/ApiErrorModal';
import { DiceResult, GameState, Inventory, CharacterInfo, RawDiceResult } from './types';
import { calculateDiceResult, upgradeProfession } from './logic/gameLogic';
import { Dices, RefreshCw, Eye, MessageSquareQuote, Handshake, RotateCcw, Gift, ShieldCheck, Anchor, KeyRound } from 'lucide-react';
import { audioService, Rarity } from './services/audioService';
import { playClickSound } from './hooks/useButtonSound';
import { ApiKeys, clearApiKeys, getApiCapabilities, loadApiKeys, saveApiKeys } from './utils/apiKeyStore';
import { useContractGeneration } from './hooks/useContractGeneration';
import { getButtonAuraFrameClass, isOverflowAuraRarity } from './components/auraLayout';

export default function App() {
  const diceRef = useRef<DiceCanvasRef>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [result, setResult] = useState<DiceResult | null>(null);
  const [charInfo, setCharInfo] = useState<CharacterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [peekMode, setPeekMode] = useState(false);
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [stylePrompt, setStylePrompt] = useState('火焰纹章风格+西式幻想RPG');
  const [inventory, setInventory] = useState<Inventory>({ crests: 1, weightedDice: 1 });
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => loadApiKeys());
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const capabilities = getApiCapabilities(apiKeys);
  
  const [fixedDiceIndices, setFixedDiceIndices] = useState<number[]>([]);
  const [weightedDiceIndices, setWeightedDiceIndices] = useState<number[]>([]);
  const [wentThroughRewardChoice, setWentThroughRewardChoice] = useState(false); // 是否经过了命运抉择
  const [consecutiveFailures, setConsecutiveFailures] = useState(0); // 连续召唤失败次数
  const [consumedItems, setConsumedItems] = useState({ crests: 0, weightedDice: 0 }); // 本次掷骰消耗的道具

  const [chargeLevel, setChargeLevel] = useState(0);
  const chargeStartTime = useRef<number>(0);
  const chargeRequestRef = useRef<number>(0);
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

  const handleSaveApiKeys = (nextKeys: ApiKeys) => {
      const saved = saveApiKeys(nextKeys);
      setApiKeys(saved);
  };

  const handleClearApiKeys = () => {
      setApiKeys(clearApiKeys());
  };

  const {
      loadingText,
      visualProgress,
      generateContract,
      cancelGeneration,
      resetProgress
  } = useContractGeneration({
      apiKeys,
      capabilities,
      onCharacterReady: (info) => {
          audioService.playSummonSound(info.rarity as Rarity);
          setGameState(GameState.SHOW_CARD);
          setFixedDiceIndices([]);
          setWeightedDiceIndices([]);
          setConsecutiveFailures(0);
          setConsumedItems({ crests: 0, weightedDice: 0 });
          setCharInfo(info);
      },
      onVoiceReady: (info) => {
          setCharInfo(info);
      },
      onApiError: (message) => {
          setApiErrorModal({ show: true, message });
      },
      onImageFailure: () => {
          setConsecutiveFailures(prev => prev + 1);
      },
      onReturnToContractPending: () => {
          setGameState(GameState.CONTRACT_PENDING);
      }
  });

  // 1. 投骰结束
  const handleRollComplete = (rawResult: RawDiceResult) => {
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
  const handleDiceUpdate = (rawResult: RawDiceResult) => {
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
    await generateContract(result, stylePrompt);
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
      cancelGeneration();
      setGameState(GameState.IDLE);
      setResult(null);
      setCharInfo(null);
      setWeightedDiceIndices([]);
      setFixedDiceIndices([]);
      resetProgress();
  };

  // 取消召唤确认弹框状态
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // 取消缔结契约，回到掷骰子界面（保留骰子结果但允许重投）
  const handleCancelContract = () => {
      playClickSound(); // 播放点击音效
      cancelGeneration();
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
      cancelGeneration();
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
      cancelGeneration();

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
      buttonStyleClass += " bg-slate-700/85 text-slate-300 border-slate-900 cursor-not-allowed";
  } else if (gameState === GameState.REWARD_CHOICE) {
      // 在奖励选择状态下，主按钮被隐藏（通过下面的条件渲染）
      mainButtonText = "请选择...";
      isButtonDisabled = true;
      buttonStyleClass += " bg-slate-700/85 text-slate-300 border-slate-900 cursor-not-allowed";
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
      buttonStyleClass += " bg-slate-700/85 text-slate-300 border-slate-900 cursor-not-allowed";
  } else if (gameState === GameState.SHOW_CARD || gameState === GameState.RESULT) {
      // In Card mode, button is hidden or just allows reset
      mainButtonText = "重新召唤";
      mainButtonAction = handleReset;
      buttonStyleClass += " bg-gradient-to-b from-[#2f5b9a] via-[#183a73] to-[#0b1a39] border-[#061022] hover:brightness-110 text-amber-50 arcane-focus-ring";
  } else {
      // IDLE
      buttonStyleClass += " bg-gradient-to-b from-[#2f5b9a] via-[#183a73] to-[#0b1a39] border-[#061022] hover:brightness-110 text-amber-50 arcane-focus-ring";
  }

  // Animation State Control
  const [showCardReveal, setShowCardReveal] = useState(false);
  useEffect(() => {
      if (gameState === GameState.SHOW_CARD) {
          setShowCardReveal(false); // Reset
          // Wait for summon animation to finish (controlled by component below)
      }
  }, [gameState]);

  const missingCapabilityLabels = [
      !capabilities.text && '文案',
      !capabilities.runningHub && '立绘/动态',
      !capabilities.mimo && '语音'
  ].filter(Boolean).join('、');
  const isRewardChoice = gameState === GameState.REWARD_CHOICE;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#07101f] bg-[url('/ui/academy-hall.png')] bg-cover bg-center text-amber-50 font-sans select-none">
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

        .academy-glass {
          background:
            linear-gradient(135deg, rgba(13, 27, 54, 0.9), rgba(9, 14, 27, 0.82)),
            url('/ui/arcane-metal-ui.png');
          background-size: cover;
          border: 1px solid rgba(245, 213, 139, 0.36);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.42), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .academy-parchment {
          background:
            linear-gradient(180deg, rgba(255, 247, 220, 0.92), rgba(226, 185, 112, 0.84)),
            url('/ui/parchment-panel.png');
          background-size: cover;
          border: 1px solid rgba(245, 213, 139, 0.55);
          color: #2b1a10;
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.42), inset 0 0 0 1px rgba(255, 255, 255, 0.28);
        }

        .summon-altar {
          background:
            radial-gradient(circle at 50% 0%, rgba(96, 165, 250, 0.24), transparent 44%),
            radial-gradient(circle at 50% 100%, rgba(245, 213, 139, 0.12), transparent 52%),
            linear-gradient(135deg, rgba(11, 22, 48, 0.92), rgba(13, 9, 24, 0.88));
          border: 1px solid rgba(245, 213, 139, 0.36);
          box-shadow: 0 18px 56px rgba(0, 0, 0, 0.48), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .arcane-focus-ring {
          box-shadow: 0 0 0 1px rgba(245, 213, 139, 0.35), 0 0 24px rgba(37, 99, 235, 0.22);
        }
      `}</style>

       {/* 3D 骰盘场景 */}
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

      <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(circle_at_50%_42%,rgba(9,20,42,0.02),rgba(5,9,20,0.28)_78%),linear-gradient(180deg,rgba(3,7,18,0.08),rgba(3,7,18,0.2))]" />

      {/* 左上工具区，角色卡展示时隐藏 */}
      {gameState !== GameState.SHOW_CARD && (
        <div className={`absolute top-3 left-3 right-3 md:top-6 md:left-6 md:right-auto z-40 flex flex-col items-start gap-3 max-w-[calc(100vw-1.5rem)] md:max-w-[18.5rem] transition-all duration-500 ${peekMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex flex-wrap items-start gap-2 md:gap-3 max-w-full">
            <div className="academy-glass backdrop-blur-xl p-2.5 md:p-4 rounded-xl md:rounded-2xl flex items-center gap-2.5 md:gap-4 max-w-full min-w-0">
              <button
                onClick={() => setIsStyleOpen(!isStyleOpen)}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-xl transition-all flex items-center justify-center shrink-0 border ${isStyleOpen ? 'bg-amber-500 text-slate-950 border-amber-200 shadow-lg scale-105' : 'bg-blue-950/55 text-amber-100 border-amber-200/25 hover:bg-blue-900/70'}`}
                title="风格设置"
              >
                <Dices size={22} />
              </button>
              <button
                onClick={() => setIsApiSettingsOpen(true)}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-xl transition-all flex items-center justify-center shrink-0 border ${capabilities.text && capabilities.runningHub && capabilities.mimo ? 'bg-emerald-500/18 text-emerald-200 border-emerald-200/35 hover:bg-emerald-500/28' : 'bg-amber-500/18 text-amber-200 border-amber-200/35 hover:bg-amber-500/28'}`}
                title={missingCapabilityLabels ? `API 设置，缺少：${missingCapabilityLabels}` : 'API 设置'}
              >
                <KeyRound size={22} />
              </button>
              <div
                className="flex flex-col min-w-0 pr-1 md:pr-2 cursor-pointer select-none group"
                onClick={() => setIsStyleOpen(!isStyleOpen)}
              >
                <h1 className="text-lg md:text-xl font-black font-serif tracking-widest leading-tight text-amber-100 group-hover:text-white transition-colors whitespace-nowrap drop-shadow">骰子传说</h1>
                <div className="text-[9px] md:text-[10px] text-blue-200/80 font-black uppercase tracking-[0.18em] md:tracking-[0.2em] whitespace-nowrap">Arcane Codex</div>
              </div>
            </div>

            <div className={`transition-all duration-500 origin-left overflow-hidden max-w-full ${isStyleOpen ? 'w-full sm:w-auto sm:max-w-xs opacity-100 sm:ml-2' : 'max-w-0 opacity-0 ml-0 pointer-events-none'}`}>
              <div className="academy-glass backdrop-blur-xl p-3 md:p-4 rounded-xl md:rounded-2xl flex items-center gap-3 whitespace-nowrap min-w-0">
                <MessageSquareQuote size={18} className="text-amber-200 flex-shrink-0" />
                <input
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder="输入游戏风格关键词..."
                  className="bg-transparent border-b border-amber-200/35 text-sm text-amber-50 focus:outline-none focus:border-amber-200 w-full sm:w-52 min-w-0 px-1 placeholder-amber-100/45"
                />
              </div>
            </div>
          </div>

          <div className="w-full max-w-[18.5rem] flex flex-col gap-2">
            <InventoryBar
              inventory={inventory}
              activeFixedCount={fixedDiceIndices.length}
              activeWeightedCount={weightedDiceIndices.length}
              onCancelWeightedDice={handleCancelWeightedDice}
              orientation="vertical"
            />
            <div className="academy-glass rounded-xl px-3 py-2 text-[10px] md:text-[11px] text-amber-100/64 font-black uppercase tracking-[0.22em] leading-relaxed">
              Crest: {fixedDiceIndices.length}<br />
              Weighted: {weightedDiceIndices.length}
            </div>
            {(!capabilities.text || !capabilities.runningHub || !capabilities.mimo) && (
              <button
                onClick={() => setIsApiSettingsOpen(true)}
                className="w-full text-left text-[11px] leading-relaxed text-amber-100 font-bold bg-amber-500/16 rounded-xl px-3 py-2 hover:bg-amber-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
              >
                API 未完整配置<br />
                缺少 {missingCapabilityLabels}<br />
                对应能力会自动降级
              </button>
            )}
          </div>
        </div>
      )}

      {/* 界面隐藏切换 */}
      {gameState !== GameState.SHOW_CARD && (
        <button
            onClick={() => setPeekMode(!peekMode)}
            className={`absolute bottom-20 right-3 md:bottom-8 md:right-8 z-50 w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg border ${peekMode ? 'bg-amber-500 text-slate-950 border-amber-200 shadow-amber-500/30 scale-105' : 'bg-blue-950/75 backdrop-blur-md border-amber-200/35 text-amber-100 hover:text-white hover:bg-blue-900/90'}`}
            title={peekMode ? '显示界面' : '隐藏界面'}
        >
            <Eye size={24} />
        </button>
      )}

      {/* 结果信息面板，角色卡展示时隐藏 */}
      <div className={`absolute top-24 left-3 right-3 md:top-8 md:left-auto md:right-5 lg:right-8 z-20 w-auto md:w-[22rem] xl:w-96 max-h-[calc(100vh-16rem)] md:max-h-[calc(100vh-15rem)] overflow-y-auto overscroll-contain flex flex-col gap-6 transition-all duration-500 ${peekMode || gameState === GameState.SHOW_CARD ? 'translate-x-[120%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
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

      {/* 底部主控区，角色卡展示时隐藏 */}
      <div className={`absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 z-20 w-full ${isRewardChoice ? 'max-w-[27rem]' : 'max-w-[24rem] md:max-w-[28rem]'} px-2.5 sm:px-3 flex flex-col items-center gap-3 transition-all duration-500 ${peekMode || gameState === GameState.SHOW_CARD ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <div className="w-full flex flex-col justify-center gap-3 md:gap-4 items-center">
            <div className={`flex flex-col gap-2.5 md:gap-3 w-full ${isRewardChoice ? 'max-w-[24rem]' : 'max-w-[23rem] md:max-w-[27rem]'}`}>

                {/* 奖励选择界面 - 仅在 REWARD_CHOICE 状态显示 */}
                {gameState === GameState.REWARD_CHOICE && result && (() => {
                    // 根据稀有度设置缔结契约按钮样式
                    const rarity = result.rarity;
                    const overflowAura = isOverflowAuraRarity(rarity);
                    let contractButtonClass = "w-full relative isolate overflow-hidden text-white font-black py-4 px-6 rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all shadow-lg ";
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
                        <div className="relative w-full academy-parchment backdrop-blur-xl rounded-2xl p-4 md:p-5 shadow-2xl animate-fade-in overflow-hidden">
                            <div className="relative text-center mb-3 md:mb-4">
                                <h3 className="text-lg md:text-xl font-black text-[#71410f] mb-1 md:mb-2 font-serif tracking-wider">命运的抉择</h3>
                                <p className="text-sm text-[#5b3a18]">你获得了特殊骰型！请选择你的奖励：</p>
                            </div>

                            <div className="relative bg-amber-950/10 rounded-xl p-3 mb-4 border border-amber-900/20 shadow-inner">
                                <div className="text-xs text-amber-900/75 font-black mb-2">本次奖励：</div>
                                <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
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

                            <div className="grid grid-cols-[minmax(0,3fr)_minmax(68px,1fr)] gap-2.5 sm:gap-3">
                                {/* 缔结契约按钮 - 带粒子特效和稀有度颜色 - 占据更多空间 */}
                                <div className="flex-[3] relative overflow-visible">
                                    {/* 按钮外沿余辉 */}
                                    <div className={getButtonAuraFrameClass(rarity, 'rewardChoice')}>
                                        <ThreeRarityAura rarity={rarity} intensity={overflowAura ? 'burst' : 'large'} viewportScale={overflowAura ? 1.45 : 1.4} />
                                    </div>

                                    <button
                                        onClick={handleChooseContract}
                                        className={`relative z-10 ${contractButtonClass}`}
                                    >
                                        {/* 按钮内能量阵 */}
                                        <div className={`absolute -inset-x-8 -inset-y-6 z-0 mix-blend-screen pointer-events-none ${overflowAura ? 'opacity-95' : 'opacity-75'}`}>
                                            <ThreeRarityAura rarity={rarity} intensity="normal" />
                                        </div>
                                        <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_50%_110%,rgba(255,255,255,0.45),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.22),transparent_42%,rgba(0,0,0,0.18))]" />
                                        <div className="absolute inset-x-4 bottom-1 z-[2] h-px bg-white/45 blur-[1px]" />

                                        {/* 闪光效果 */}
                                        <div className={`absolute inset-0 z-[3] w-full h-full bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none ${shineClass}`} />

                                        {/* 内侧高光边线 */}
                                        <div className="absolute inset-0 z-[4] border border-white/20 border-t-white/45 rounded-xl pointer-events-none"></div>

                                        <div className="relative z-10 flex flex-col items-center gap-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] min-w-0 text-center leading-tight">
                                            <Handshake size={20} />
                                            <span className="text-sm">缔结契约</span>
                                            <span className="text-[10px] opacity-80">(抽卡)</span>
                                        </div>
                                    </button>
                                </div>

                                {/* 领取奖励按钮 - 占据较少空间 */}
                                <button
                                    onClick={handleChooseReward}
                                    className="bg-gradient-to-b from-[#f4c96d] via-[#c7852b] to-[#7c4715] hover:brightness-110 text-white font-black py-4 px-1.5 md:px-6 rounded-xl border-b-4 border-[#4f2d0c] active:border-b-0 active:translate-y-1 transition-all shadow-lg min-w-0"
                                >
                                    <div className="flex flex-col items-center gap-1 text-center leading-tight">
                                        <Gift size={20} />
                                        <span className="text-sm">领取奖励</span>
                                        <span className="text-[10px] opacity-80">(不抽卡)</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* 底部按钮容器 */}
	                <div className="relative w-full group flex gap-2">
                    {/* 取消召唤/重投小按钮 - 仅在 CONTRACT_PENDING 状态显示 */}
                    {gameState === GameState.CONTRACT_PENDING && (
                        wentThroughRewardChoice ? (
                            // 经过命运抉择 -> 显示"取消召唤"（需要确认弹框）
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="relative z-10 w-12 md:w-14 h-16 md:h-20 rounded-xl bg-[#1b2d4f] hover:bg-[#25406d] border-b-4 border-[#081221] active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center shadow-lg shrink-0 border border-amber-200/25"
                                title="取消召唤，返回掷骰子界面"
                            >
                                <RotateCcw size={20} className="text-white" />
                                <span className="text-[9px] text-white/80 mt-1 font-bold text-center leading-tight">取消<br/>召唤</span>
                            </button>
                        ) : (
                            // 未经过命运抉择 -> 显示"重投"（直接重投，无需确认）
                            <button
                                onClick={handleReroll}
                                className="relative z-10 w-12 md:w-14 h-16 md:h-20 rounded-xl bg-[#1b2d4f] hover:bg-[#25406d] border-b-4 border-[#081221] active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center shadow-lg shrink-0 border border-amber-200/25"
                                title="重新投掷"
                            >
                                <RotateCcw size={20} className="text-white" />
                                <span className="text-[9px] text-white/80 mt-1 font-bold">重投</span>
                            </button>
                        )
                    )}

                    {/* 主按钮 - 在 REWARD_CHOICE 状态下隐藏 */}
                    {gameState !== GameState.REWARD_CHOICE && (
                      <div className="relative z-10 flex-1 min-w-0 h-16 md:h-20">
                        {gameState === GameState.CONTRACT_PENDING && result && (
                          <div className={getButtonAuraFrameClass(result.rarity, 'bottomMain')}>
                            <ThreeRarityAura rarity={result.rarity} intensity={isOverflowAuraRarity(result.rarity) ? 'burst' : 'large'} viewportScale={isOverflowAuraRarity(result.rarity) ? 1.6 : 1.5} />
                          </div>
                        )}
                        <button
                            onMouseDown={gameState === GameState.IDLE ? startCharge : undefined}
                            onTouchStart={gameState === GameState.IDLE ? startCharge : undefined}
                            onClick={mainButtonAction || undefined}
                            disabled={isButtonDisabled}
                            className={`relative z-10 isolate w-full h-full rounded-xl transition-all flex items-center justify-center overflow-hidden shadow-2xl ${buttonStyleClass}`}
                        >
                            {gameState === GameState.CONTRACT_PENDING && result && (
                                <>
                                    <div className={`absolute -inset-x-8 -inset-y-6 z-0 mix-blend-screen pointer-events-none ${isOverflowAuraRarity(result.rarity) ? 'opacity-95' : 'opacity-70'}`}>
                                        <ThreeRarityAura rarity={result.rarity} intensity="normal" />
                                    </div>
                                    <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_50%_105%,rgba(255,255,255,0.42),transparent_60%),linear-gradient(180deg,rgba(255,255,255,0.2),transparent_45%,rgba(0,0,0,0.16))]" />
                                </>
                            )}

                            {/* 蓄力进度层 */}
                            {gameState === GameState.CHARGING && (
                                <div className="absolute left-0 top-0 z-[2] h-full bg-white/30 transition-all pointer-events-none" style={{ width: `${chargeLevel}%` }} />
                            )}

                            {/* 闪光效果 */}
                            {gameState === GameState.CONTRACT_PENDING && (
                               <div className={`absolute inset-0 z-[3] w-full h-full bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none ${shineClass}`} />
                            )}

                            {/* 内侧高光边线 */}
                            <div className="absolute inset-0 z-[4] border border-white/15 border-t-white/40 rounded-xl pointer-events-none"></div>

                            <span className="relative z-10 font-black text-base md:text-xl uppercase tracking-[0.16em] md:tracking-[0.3em] flex items-center justify-center gap-2 md:gap-3 drop-shadow-[0_2px_7px_rgba(0,0,0,0.6)] whitespace-nowrap">
                                {gameState === GameState.CONTRACT_PENDING && <Handshake size={24} />}
                                {mainButtonText}
                            </span>
                        </button>
                      </div>
                    )}

                    {/* 重置按钮 - 仅在 CONTRACT_PENDING 状态显示，连续失败5次才可点击 */}
                    {gameState === GameState.CONTRACT_PENDING && (
                        <button
                            onClick={handleFailureReset}
                            disabled={consecutiveFailures < 5}
                            className={`relative z-10 w-12 md:w-14 h-16 md:h-20 rounded-xl border-b-4 transition-all flex flex-col items-center justify-center shadow-lg shrink-0 ${
                                consecutiveFailures >= 5
                                    ? 'bg-amber-700 hover:bg-amber-600 border-amber-950 active:border-b-0 active:translate-y-1 cursor-pointer border border-amber-200/25'
                                    : 'bg-slate-600 border-slate-800 cursor-not-allowed opacity-60'
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
            </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-[100] bg-[#07101f] bg-[url('/ui/academy-hall.png')] bg-cover bg-center flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-black/62 backdrop-blur-sm" />
            {/* 游戏风格魔法阵加载动画 */}
            <div className="relative w-24 h-24 mb-6">
                {/* 外圈 - 逆时针旋转 */}
                <div className="absolute inset-0 border-4 border-amber-300 rounded-full animate-[spin_3s_linear_infinite_reverse] opacity-60" />
                {/* 中圈 - 顺时针旋转 */}
                <div className="absolute inset-2 border-2 border-dashed border-blue-300 rounded-full animate-[spin_2s_linear_infinite]" />
                {/* 内圈 - 脉冲 */}
                <div className="absolute inset-4 border-2 border-amber-400 rounded-full animate-pulse" />
                {/* 中心符文 */}
                <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">⚔️</div>
                {/* 四角符文 */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-sm animate-bounce">✦</div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-sm animate-bounce delay-100">✦</div>
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 text-sm animate-bounce delay-200">✦</div>
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 text-sm animate-bounce delay-300">✦</div>
            </div>
            <div className="relative text-amber-100 text-lg font-black tracking-[0.5em] uppercase animate-pulse drop-shadow-[0_0_12px_rgba(251,191,36,0.45)]">正在刻印纹章</div>
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
         <div className="fixed inset-0 z-[60] bg-[#07101f] bg-[url('/ui/academy-hall.png')] bg-cover bg-center flex flex-col items-center justify-center">
             <div className="absolute inset-0 bg-black/72 backdrop-blur-sm" />
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

             <div className="relative text-amber-50 text-lg font-black tracking-[0.5em] uppercase animate-pulse mb-4 drop-shadow-[0_0_16px_rgba(251,191,36,0.45)]">{loadingText}</div>

             {/* Visual Progress Bar - 魔法能量条样式 */}
             <div className={`relative w-64 h-3 bg-black/40 rounded-full overflow-hidden border ${colors.progressBorder} ${colors.progressShadow}`}>
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
          <div className="academy-parchment rounded-2xl max-w-sm w-full p-6 animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-[#2b1a10] font-black text-lg mb-4 text-center font-serif">确定取消召唤吗？</h3>
            <p className="text-[#5b3a18] text-sm mb-6 text-center leading-relaxed">
              取消后将返回到掷骰子界面，并且已消耗的<span className="text-amber-400 font-bold">刻印</span>、<span className="text-purple-400 font-bold">灌铅骰子</span>等消耗品将<span className="text-red-400 font-bold">不会返还</span>。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#1b2d4f]/20 hover:bg-[#1b2d4f]/30 text-[#34405c] font-bold transition-all border-b-4 border-[#1b2d4f]/35 active:border-b-0 active:translate-y-1"
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

      <ApiErrorModal
        open={apiErrorModal.show}
        message={apiErrorModal.message}
        onReturn={() => {
          setApiErrorModal({ show: false, message: '' });
          setGameState(GameState.CONTRACT_PENDING);
        }}
      />
    </div>
  );
}
