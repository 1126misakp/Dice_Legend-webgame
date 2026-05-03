
export interface DiceResult {
  rawAttributes: number[]; // 6个属性骰子的点数 (1-6)
  destinyPoint: number;    // 命运点数 (1-6)
  racePoint: number;       // 种族点数 (1-6)
  
  // 判定结果
  rarity: string;
  profession: string;
  attribute: string;
  race: { char: string; name: string; color: string };
  age: string;
  luckyValue: number;
  
  // 新增：适配 ResultPanel 的汇总数据
  attributes: Record<string, number>;
  colors: Record<string, number>;
  
  // 奖励
  rewards: {
    crests: number;
    weightedDice: number;
  };
}

export interface RawDiceResult {
  rawAttributes: number[];
  destinyPoint: number;
  racePoint: number;
}

export interface Inventory {
  crests: number;
  weightedDice: number;
}

export enum GameState {
  IDLE = 'IDLE',
  CHARGING = 'CHARGING',
  ROLLING = 'ROLLING',
  REWARD_CHOICE = 'REWARD_CHOICE', // 新增：选择奖励或抽卡
  CONTRACT_PENDING = 'CONTRACT_PENDING',
  RESULT = 'RESULT',
  AI_GENERATING = 'AI_GENERATING',
  SHOW_CARD = 'SHOW_CARD'
}

export const FANTASY_SYMBOLS = [
  { char: '⚔️', name: '力量', color: '#991b1b' },
  { char: '🛡️', name: '防御', color: '#1e3a8a' },
  { char: '🏃', name: '速度', color: '#166534' },
  { char: '🪄', name: '魔法', color: '#6b21a8' },
  { char: '🗽', name: '幸运', color: '#ca8a04' },
  { char: '👁️', name: '技巧', color: '#115e59' }
];

// Add exported FANTASY_COLORS for textureService and ResultPanel
export const FANTASY_COLORS = FANTASY_SYMBOLS.map(s => s.color);

export const RACE_DATA = [
  { char: '🧑', name: '人类', color: '#ffffff' },
  { char: '👿', name: '恶魔', color: '#7f1d1d' },
  { char: '🧝', name: '精灵', color: '#15803d' },
  { char: '👼', name: '神族', color: '#f59e0b' },
  { char: '🐉', name: '龙族', color: '#b91c1c' },
  { char: '💀', name: '亡灵', color: '#171717' }
];

// Add exported RACE_ICONS for textureService
export const RACE_ICONS = RACE_DATA.map(r => ({ ...r, bgColor: r.color }));

// 技能类型（包含出场语音）
export type SkillType = 'entrance' | 'skill1' | 'skill2' | 'skill3' | 'ultimate';

// 单条语音数据
export interface VoiceData {
  voiceId: string;           // MiniMax生成的音色ID
  audioDataHex: string;      // hex编码的音频数据
  skillType: SkillType;      // 技能类型
  line: string;              // 台词文本
}

// 角色语音信息
export interface CharacterVoices {
  characterName: string;
  rarity: string;
  voiceId: string;           // 角色专属音色ID
  voices: VoiceData[];       // 所有语音列表
}

export interface CharacterInfo {
  style: string;
  name: string;
  gender: '女';
  age: string;
  profession: string;
  race: string;
  attribute: string;
  rarity: string;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string; // Generated Live2D/Video URL
  voices?: CharacterVoices; // 角色语音数据
}
