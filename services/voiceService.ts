/**
 * 语音服务 - 纹章传说
 * 使用 MiniMax API 生成角色专属语音
 */

import { CharacterInfo, SkillType, VoiceData, CharacterVoices } from '../types';
import { ApiKeys, DEFAULT_OPENROUTER_MODEL } from '../utils/apiKeyStore';
import { proxyMiniMaxT2A, proxyMiniMaxVoiceDesign, proxyOpenRouterChat } from '../utils/apiClient';
import { logger } from '../utils/logger';

// T2A 语音合成配置
export interface T2AConfig {
  speed?: number;     // 语速 0.5-2.0，默认1.0，建议0.8-0.9
  vol?: number;       // 音量 0-10，默认1.0
  pitch?: number;     // 语调 -12 到 12，默认0
  emotion?: string;   // 情绪：happy, sad, angry, fearful, disgusted, surprised, neutral
}

// 稀有度对应的语音数量
export const VOICE_COUNT_BY_RARITY: Record<string, number> = {
  'R': 1,    // 只有奥义
  'SR': 3,   // 技能1、技能2、奥义
  'SSR': 4,  // 技能1、技能2、技能3、奥义
  'UR': 4    // 技能1、技能2、技能3、奥义
};

// 生成结果
export interface VoiceGenerationResult {
  success: boolean;
  data?: CharacterVoices;
  error?: string;
}

/**
 * 将hex字符串转换为AudioBuffer可播放的格式
 */
export function hexToAudioBlob(hexString: string): Blob {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return new Blob([bytes], { type: 'audio/mpeg' });
}

/**
 * 将base64字符串转换为Blob
 */
export function base64ToAudioBlob(base64String: string): Blob {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'audio/mpeg' });
}

/**
 * 智能检测音频数据格式并转换为Blob
 * 支持 hex 和 base64 两种格式
 */
export function audioDataToBlob(audioData: string): Blob {
  // 检测是否是纯 hex 格式（只包含 0-9, a-f, A-F）
  const isHex = /^[0-9a-fA-F]+$/.test(audioData);

  // 如果不是纯 hex，就认为是 base64
  const isBase64 = !isHex;

  logger.debug('[VoiceService] 音频格式检测', { isHex, isBase64, length: audioData.length });

  if (isBase64) {
    logger.debug('[VoiceService] 使用 base64 解码');
    return base64ToAudioBlob(audioData);
  } else {
    logger.debug('[VoiceService] 使用 hex 解码');
    return hexToAudioBlob(audioData);
  }
}

/**
 * 播放音频数据（自动检测 hex 或 base64 格式）
 */
export async function playAudioData(audioData: string): Promise<void> {
  const blob = audioDataToBlob(audioData);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    audio.play();
  });
}

/**
 * 播放hex编码的音频（保留向后兼容）
 */
export async function playHexAudio(hexString: string): Promise<void> {
  return playAudioData(hexString);
}

/**
 * 根据稀有度获取需要生成的技能类型列表
 * 所有稀有度都包含出场语音
 */
export function getSkillTypesByRarity(rarity: string): SkillType[] {
  switch (rarity) {
    case 'R':
      return ['entrance', 'ultimate'];
    case 'SR':
      return ['entrance', 'skill1', 'skill2', 'ultimate'];
    case 'SSR':
    case 'UR':
      return ['entrance', 'skill1', 'skill2', 'skill3', 'ultimate'];
    default:
      return ['entrance', 'ultimate'];
  }
}

/**
 * 获取技能类型的中文名称
 */
export function getSkillTypeName(skillType: SkillType): string {
  switch (skillType) {
    case 'entrance': return '出场';
    case 'skill1': return '技能1';
    case 'skill2': return '技能2';
    case 'skill3': return '技能3';
    case 'ultimate': return '奥义';
  }
}

function buildFallbackVoiceConfig(characterInfo: CharacterInfo): { voicePrompt: string; lines: Record<SkillType, string> } {
  return {
    voicePrompt: `${characterInfo.age}${characterInfo.gender}性的幻想角色声音，语气符合${characterInfo.profession}，带有${characterInfo.race}的神秘氛围，语速从容清晰`,
    lines: {
      entrance: '命运选中了我。',
      skill1: '锋芒已至！',
      skill2: '破开迷雾！',
      skill3: '纹章回应我！',
      ultimate: `以${characterInfo.attribute}之力，终结此战！`
    }
  };
}

/**
 * 使用OpenRouter grok-4.1-fast模型生成角色音色描述和台词
 */
export async function generateVoicePromptAndLines(
  characterInfo: CharacterInfo,
  openRouterApiKey?: string,
  openRouterModel: string = DEFAULT_OPENROUTER_MODEL
): Promise<{ voicePrompt: string; lines: Record<SkillType, string> }> {
  const skillTypes = getSkillTypesByRarity(characterInfo.rarity);
  
  // 从年龄字符串解析数值（如"18岁" -> 18）
  const parseAgeNumber = (ageStr: string): number => {
    const match = ageStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 20; // 默认20岁
  };

  // 根据年龄数值确定声音类型和禁止词
  // 命运点数对应：1点=8-15岁，2点=16-25岁，3点=26-35岁，4点=36-45岁，5点=46-55岁，6点=56-65岁
  const getVoiceAgeConfig = (age: string): { description: string; forbidden: string; example: string; ageRange: string } => {
    const ageNum = parseAgeNumber(age);

    if (ageNum >= 8 && ageNum <= 15) {
      return {
        description: '稚嫩清脆的萝莉音，声线细软甜美，像铃铛一样清亮，带有孩子气的天真感',
        forbidden: '成熟、沉稳、低沉、沧桑、御姐、妩媚、魅惑化、优雅、从容',
        example: '8-15岁少女的稚嫩声音，音色清脆如银铃，语速较快，情绪天真烂漫',
        ageRange: '8-15岁少女'
      };
    } else if (ageNum >= 16 && ageNum <= 25) {
      return {
        description: '清澈甜美的少女音，声线年轻活泼，音调偏高，充满青春活力',
        forbidden: '成熟、沧桑、低沉、老练、御姐、妇人、沉稳',
        example: '16-25岁年轻女性的甜美声音，音色清澈明亮，语速轻快，情绪活泼可爱',
        ageRange: '16-25岁青年女性'
      };
    } else if (ageNum >= 26 && ageNum <= 35) {
      return {
        description: '温柔知性的轻熟女音，声线柔和优雅，既有女性的温柔也有一定的成熟感',
        forbidden: '稚嫩、萝莉、天真、孩子气、幼稚、沧桑、老练',
        example: '26-35岁成熟女性的温柔声音，音色圆润有磁性，语速适中，情绪温和自信',
        ageRange: '26-35岁轻熟女性'
      };
    } else if (ageNum >= 36 && ageNum <= 45) {
      return {
        description: '成熟稳重的御姐音，声线优雅从容，带有成熟女性的魅力和自信',
        forbidden: '稚嫩、萝莉、天真、孩子气、幼稚、活泼、元气',
        example: '36-45岁成熟女性的优雅声音，音色沉稳有磁性，语速从容，情绪内敛自信',
        ageRange: '36-45岁成熟女性'
      };
    } else if (ageNum >= 46 && ageNum <= 55) {
      return {
        description: '沉稳睿智的中年女性音，声线深沉有力，带有人生阅历的厚重感',
        forbidden: '稚嫩、萝莉、甜美、活泼、元气、天真、少女',
        example: '46-55岁中年女性的沉稳声音，音色略低沉但有力，语速缓慢稳重',
        ageRange: '46-55岁中年女性'
      };
    } else if (ageNum >= 56 && ageNum <= 65) {
      return {
        description: '沧桑睿智的长者音，声线沉稳深邃，带有岁月沉淀的智慧',
        forbidden: '稚嫩、萝莉、甜美、活泼、元气、年轻、少女',
        example: '56-65岁年长女性的沉稳声音，音色略显沙哑但有力，语速缓慢',
        ageRange: '56-65岁年长女性'
      };
    } else {
      return {
        description: '清澈甜美的少女音，声线年轻活泼，音调偏高',
        forbidden: '成熟、沧桑、低沉',
        example: '年轻女性的甜美声音，音色清澈明亮，语速轻快',
        ageRange: '年轻女性'
      };
    }
  };

  // 根据职业确定语气风格
  const getProfessionVoiceStyle = (profession: string): { tone: string; manner: string } => {
    // 战士、佣兵类 - 有力
    if (profession.includes('战') || profession.includes('斗') || profession.includes('佣') || profession.includes('勇') || profession.includes('武')) {
      return { tone: '有力坚定', manner: '说话铿锵有力，充满战意和斗志，语气果断' };
    }
    // 盗贼、弓手类 - 神秘轻盈
    if (profession.includes('贼') || profession.includes('刺') || profession.includes('弓') || profession.includes('狙') || profession.includes('射') || profession.includes('游侠')) {
      return { tone: '神秘轻盈', manner: '说话轻柔飘逸，带有神秘感和灵动感，语速较快' };
    }
    // 骑士类 - 庄严
    if (profession.includes('骑') || profession.includes('将') || profession.includes('圣骑')) {
      return { tone: '庄严高贵', manner: '说话庄重威严，带有骑士的荣耀感，语速稳重' };
    }
    // 法术师类 - 柔和
    if (profession.includes('魔') || profession.includes('法') || profession.includes('术') || profession.includes('贤') || profession.includes('巫') ||
        profession.includes('召') || profession.includes('圣') || profession.includes('牧') || profession.includes('神官')) {
      return { tone: '柔和神秘', manner: '说话柔和优雅，带有魔法的神秘感，语速舒缓' };
    }
    // 重甲/守卫类 - 沉稳
    if (profession.includes('重甲') || profession.includes('守') || profession.includes('铠')) {
      return { tone: '沉稳厚重', manner: '说话沉稳有力，带有守护者的坚毅感，语速较慢' };
    }
    return { tone: '自然', manner: '说话自然流畅' };
  };

  // 根据种族确定声音特效描述
  const getRaceVoiceEffect = (race: string, rarity: string): { effect: string; atmosphere: string } => {
    // 稀有度对应特效强度：R=轻微, SR=适中, SSR=明显, UR=强烈
    const intensityMap: Record<string, string> = {
      'R': '轻微的',
      'SR': '适度的',
      'SSR': '明显的',
      'UR': '强烈的'
    };
    const intensity = intensityMap[rarity] || '适度的';

    if (race.includes('人') || race.includes('人族') || race.includes('人类')) {
      return {
        effect: `${intensity}空间混响`,
        atmosphere: '自然真实的人声，略带温暖的声音质感'
      };
    } else if (race.includes('精灵') || race.includes('妖精')) {
      return {
        effect: `${intensity}空灵混响，带有森林般的回音`,
        atmosphere: '灵动神秘、飘渺空灵的声音质感，如同风铃般清脆'
      };
    } else if (race.includes('神') || race.includes('天使') || race.includes('神族')) {
      return {
        effect: `${intensity}殿堂级混响，庄严的回声效果`,
        atmosphere: '庄严高贵、神圣威严的声音质感，仿佛从天界传来'
      };
    } else if (race.includes('龙') || race.includes('龙族')) {
      return {
        effect: `${intensity}浑厚低频共振，带有威压感的回响`,
        atmosphere: '威严狂野、充满力量的声音质感，带有远古巨龙的威压'
      };
    } else if (race.includes('恶魔') || race.includes('魔族')) {
      return {
        effect: `${intensity}黑暗混响，带有电子失真和低频震颤`,
        atmosphere: '邪魅诱惑、危险深邃的声音质感，仿佛来自地狱深渊'
      };
    } else if (race.includes('亡灵') || race.includes('幽灵') || race.includes('不死')) {
      return {
        effect: `${intensity}幽冥回响，带有空洞的电子音效和虚无感`,
        atmosphere: '阴森空灵、若隐若现的声音质感，仿佛灵魂在低语'
      };
    } else if (race.includes('兽') || race.includes('兽人') || race.includes('狼') || race.includes('猫')) {
      return {
        effect: `${intensity}野性共振，带有原始的力量感`,
        atmosphere: '野性自然、充满活力的声音质感，带有兽类的本能气息'
      };
    } else if (race.includes('机械') || race.includes('机器') || race.includes('人造')) {
      return {
        effect: `${intensity}金属混响，带有电子合成音效`,
        atmosphere: '机械冰冷、精准有力的声音质感，带有科技感'
      };
    } else {
      return {
        effect: `${intensity}空间混响`,
        atmosphere: '独特神秘的声音质感'
      };
    }
  };

  const voiceConfig = getVoiceAgeConfig(characterInfo.age);
  const raceEffect = getRaceVoiceEffect(characterInfo.race, characterInfo.rarity);
  const professionStyle = getProfessionVoiceStyle(characterInfo.profession);

  const systemPrompt = `你是一个专业的日系游戏配音导演。请根据角色信息，生成：
1. 音色描述(voice_prompt)：描述这个角色说话的声音特点
2. 出场台词和技能台词：根据角色的职业、种族、属性和性格生成

【音色描述规则 - 非常重要】
- 角色是${voiceConfig.ageRange}的${characterInfo.gender}性，种族是${characterInfo.race}，职业是${characterInfo.profession}
- 【年龄音色】声音特点必须是：${voiceConfig.description}
- 【种族氛围】声音氛围必须是：${raceEffect.atmosphere}
- 【职业语气】语气风格必须是：${professionStyle.tone}，${professionStyle.manner}
- 【语速要求】语速要偏慢、从容、有节奏感，让每个字都清晰可闻
- 描述格式示例：「${voiceConfig.example}，${raceEffect.atmosphere}，${professionStyle.manner}」
- 【禁止】出现以下词汇：${voiceConfig.forbidden}（这些与角色年龄不符）
- 声音必须与角色年龄${characterInfo.age}（属于${voiceConfig.ageRange}）相匹配

【台词规则 - 非常重要】
- 出场台词：8-15个字，用于角色首次登场时的自我介绍或霸气宣言，要能体现角色性格和身份
- 普通技能台词：5-10个字，简短有力
- 奥义台词：10-15个字，限制在一句话以内，要有气势
- 【禁止】在台词末尾添加角色名、技能名或任何不连贯的后缀词
- 【禁止】使用逗号分隔多个短句拼凑成长句
- 【禁止】使用"以XXX之名"这种俗套开头，要有创意！
- 台词必须是完整、连贯、自然的一句话
- 好的出场例子："命运选中了我，也选中了你。"、"终于等到这一刻了！"、"需要我的力量吗？"
- 好的奥义例子："万象归于寂灭！"、"这是终结的序章！"、"让一切化为尘埃吧！"
- 必须使用中文`;

  const userPrompt = `请为以下角色生成语音配置：

【角色信息】
- 姓名：${characterInfo.name}
- 性别：${characterInfo.gender}（女性角色）
- 年龄：${characterInfo.age}（属于${voiceConfig.ageRange}，声音必须匹配！）
- 职业：${characterInfo.profession}（语气风格：${professionStyle.tone}）
- 种族：${characterInfo.race}（声音要有${raceEffect.atmosphere}）
- 属性：${characterInfo.attribute}
- 稀有度：${characterInfo.rarity}
- 头衔：${characterInfo.title}
- 背景：${characterInfo.description}

【需要生成的内容】
1. voice_prompt: 音色描述（必须包含：年龄音色+种族氛围+职业语气）
2. ${skillTypes.map(s => `${getSkillTypeName(s)}_line: ${getSkillTypeName(s)}台词`).join('\n3. ')}

请严格按照以下JSON格式返回：
{
  "voice_prompt": "${voiceConfig.ageRange}女性的声音...，${raceEffect.atmosphere.substring(0, 6)}...，${professionStyle.tone}...",
  ${skillTypes.map(s => `"${s}_line": "${getSkillTypeName(s)}台词内容"`).join(',\n  ')}
}`;

  if (!openRouterApiKey?.trim()) {
    logger.warn('[VoiceService] 未配置 OpenRouter API Key，使用本地语音台词兜底');
    return buildFallbackVoiceConfig(characterInfo);
  }

  const data = await proxyOpenRouterChat(openRouterApiKey, {
    model: openRouterModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    max_tokens: 10000,
    temperature: 0.7
  });
  const content = data.choices?.[0]?.message?.content || '';

  // 解析JSON响应
  let parsed: Record<string, string>;
  try {
    // 尝试提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = normalizeVoiceConfig(JSON.parse(jsonMatch[0]));
    } else {
      throw new Error('无法解析响应');
    }
  } catch (e) {
    logger.error('[VoiceService] 解析响应失败', { length: content.length });
    // 使用默认值，根据年龄和种族匹配音色
    parsed = {
      voice_prompt: `${voiceConfig.example}，${raceEffect.atmosphere}，语速从容舒缓`,
      entrance_line: '命运选中了我！',
      skill1_line: '看我的！',
      skill2_line: '接招吧！',
      skill3_line: '这是我的力量！',
      ultimate_line: `以${characterInfo.attribute}之名，毁灭一切！`
    };
  }

  const lines: Record<SkillType, string> = {
    entrance: parsed.entrance_line || '命运选中了我！',
    skill1: parsed.skill1_line || '看我的！',
    skill2: parsed.skill2_line || '接招吧！',
    skill3: parsed.skill3_line || '这是我的力量！',
    ultimate: parsed.ultimate_line || `以${characterInfo.attribute}之名！`
  };

  return {
    voicePrompt: parsed.voice_prompt || `年轻${characterInfo.gender}的声音`,
    lines
  };
}

function normalizeVoiceConfig(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const result: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string') result[key] = child;
  }
  return result;
}

/**
 * 调用MiniMax音色设计API获取 voice_id
 * 只调用一次，用于创建角色专属音色
 */
export async function createVoiceDesign(
  miniMaxApiKey: string,
  prompt: string,
  previewText: string = "你好，我是你的专属角色"
): Promise<{ voiceId: string; audioHex: string }> {
  logger.info('[VoiceService] 调用 voice_design API 创建音色');

  const data = await proxyMiniMaxVoiceDesign(miniMaxApiKey, {
    prompt: prompt,
    preview_text: previewText
  });

  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax voice_design API错误: ${data.base_resp?.status_msg || '未知错误'}`);
  }

  logger.info('[VoiceService] 成功获取 voice_id', data.voice_id);

  return {
    voiceId: data.voice_id,
    audioHex: data.trial_audio
  };
}

/**
 * 调用MiniMax T2A v2 API 使用已有的 voice_id 生成语音
 * 支持语速、音量、语调、情绪控制
 */
export async function generateSpeechWithT2A(
  miniMaxApiKey: string,
  voiceId: string,
  text: string,
  config: T2AConfig = {}
): Promise<string> {
  // 设置默认参数
  const speed = config.speed ?? 0.85;  // 默认语速略慢
  const vol = config.vol ?? 1.0;
  const pitch = config.pitch ?? 0;
  const emotion = config.emotion ?? 'neutral';

  logger.info('[VoiceService] 调用 T2A API', { text, speed, emotion });

  const data = await proxyMiniMaxT2A(miniMaxApiKey, {
    model: "speech-02-turbo",
    text: text,
    stream: false,
    voice_setting: {
      voice_id: voiceId,
      speed: speed,
      vol: vol,
      pitch: pitch,
      emotion: emotion
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3"
    }
  });

  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax T2A API错误: ${data.base_resp?.status_msg || '未知错误'}`);
  }

  // T2A API 返回的 audio 字段是 hex 编码的音频数据
  const audioData = data.data?.audio;
  if (!audioData) {
    throw new Error('T2A API 未返回音频数据');
  }

  logger.info('[VoiceService] T2A 生成成功', { audioLength: audioData.length });

  // 直接返回音频数据，playAudioData 会自动检测格式
  return audioData;
}

/**
 * 获取技能类型对应的情绪设置
 */
function getEmotionForSkillType(skillType: SkillType): string {
  switch (skillType) {
    case 'skill1':
      return 'neutral';  // 普通技能，中性语气
    case 'skill2':
      return 'happy';    // 较强技能，自信/愉快
    case 'skill3':
      return 'surprised'; // 强力技能，惊讶/兴奋
    case 'ultimate':
      return 'angry';    // 奥义，愤怒/强势
    default:
      return 'neutral';
  }
}

/**
 * 为角色生成所有语音
 * 使用 voice_design API 为每条台词生成语音
 * 音色设计考虑：年龄 + 种族特效（根据稀有度增强）
 */
export async function generateCharacterVoices(
  characterInfo: CharacterInfo,
  apiKeys: ApiKeys,
  onProgress?: (current: number, total: number, skillType: SkillType) => void
): Promise<VoiceGenerationResult> {
  try {
    if (!apiKeys.miniMax.trim()) {
      return { success: false, error: '未配置 MiniMax API Key' };
    }

    logger.info('[VoiceService] 开始生成角色语音', characterInfo.name);

    // 1. 生成音色描述和台词
    const { voicePrompt, lines } = await generateVoicePromptAndLines(characterInfo, apiKeys.openRouter, apiKeys.openRouterModel);
    logger.debug('[VoiceService] 音色描述', voicePrompt);
    logger.debug('[VoiceService] 台词', lines);

    // 2. 获取需要生成的技能类型
    const skillTypes = getSkillTypesByRarity(characterInfo.rarity);
    const voices: VoiceData[] = [];
    let lastVoiceId = '';

    // 3. 为每条台词调用 voice_design API 生成语音
    for (let i = 0; i < skillTypes.length; i++) {
      const skillType = skillTypes[i];
      const line = lines[skillType];

      onProgress?.(i + 1, skillTypes.length, skillType);
      logger.info(`[VoiceService] 生成${getSkillTypeName(skillType)}语音`, line);

      // 调用 voice_design API，同时设计音色并朗读台词
      const result = await createVoiceDesign(apiKeys.miniMax, voicePrompt, line);

      voices.push({
        voiceId: result.voiceId,
        audioDataHex: result.audioHex,
        skillType,
        line
      });

      lastVoiceId = result.voiceId;

      // 添加延迟避免API限流
      if (i < skillTypes.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    logger.info('[VoiceService] 语音生成完成', { count: voices.length });

    return {
      success: true,
      data: {
        characterName: characterInfo.name,
        rarity: characterInfo.rarity,
        voiceId: lastVoiceId,
        voices
      }
    };
  } catch (error) {
    logger.error('[VoiceService] 语音生成失败', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}
