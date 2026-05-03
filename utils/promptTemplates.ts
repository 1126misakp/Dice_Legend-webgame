import { CharacterInfo, DiceResult } from '../types';

export function buildCharacterInfoPrompts(result: DiceResult, stylePrompt: string) {
  const systemPrompt = `你是一个《骰子传说》游戏的文案策划AI。
请基于提供的角色数值设定，创作角色的【名字】、【头衔】和【人物描述】。

【语言要求】只能使用中文回复，角色名字、头衔和描述都必须是中文。

【职业装备规则】人物描述必须匹配职业，不要描述不属于该职业的武器：
1. 初级战士/战士/狂战士/冠军勇士：巨斧或双斧。
2. 见习剑士/剑士/剑圣：轻型单手长剑或双手轻型剑。
3. 见习弓手/弓箭手/狙击手/神射手：弓。
4. 见习佣兵/佣兵/勇者：巨剑。
5. 初级盗贼/盗贼/刺客/抹杀使徒：短剑或拳刃。
6. 初级斗士/斗士/决斗士：徒手、拳套或斗气。
7. 见习骑士/骑士/圣骑士：剑或枪，并描述马匹坐骑。
8. 见习天马骑士/天马骑士/独角兽骑士：剑或枪，并描述天马坐骑。
9. 见习弓骑兵/弓骑兵/游侠将军：弓，并描述马匹坐骑。
10. 初级守卫/重甲兵/巨盾守卫/铠将军：剑或枪，并描述巨盾。
11. 见习术士/术士/巫术大师：魔法杖引导暗魔法。
12. 初级召唤师/召唤师/通灵大师：召唤兽或魔法生物。
13. 修道士/牧师/神官：权杖引导光魔法。
14. 见习魔导士/魔导士/贤者/大贤者：魔法书引导元素魔法。
15. 初级魔术师/魔术师/咒术大师：魔法纹身或刻印，用魔力附魔肉体或武器。

返回纯 JSON 对象，不要 Markdown 代码块：
{ "name": "...", "title": "...", "description": "..." }`;

  const userPrompt = `
角色设定：
风格：${stylePrompt}
稀有度：${result.rarity}
职业：${result.profession}
属性：${result.attribute}
种族：${result.race.name}
年龄：${result.age}

请生成 JSON 数据：
{ "name": "...", "title": "...", "description": "..." }`;

  return { systemPrompt, userPrompt };
}

export function buildImagePromptUserInput(info: CharacterInfo): string {
  const safeDesc = info.description ? info.description.substring(0, 150) : '神秘的角色';
  return `游戏风格:${info.style}，姓名:${info.name.split('·')[0]}，性别:${info.gender}，年龄:${info.age}，职业:${info.profession}，种族:${info.race}，属性:${info.attribute}，稀有度:${info.rarity}，人物札记:${safeDesc}`;
}

export const ILLUSTRATOR_SYSTEM_PROMPT = `# Role: 幻想战棋手游首席立绘师 (Fantasy Tactical RPG Lead Artist)

## Goals
接收用户提供的游戏设定和角色信息，输出一段用于 AI 绘画的英文提示词。提示词必须服务于全年龄幻想战棋角色立绘，重点是职业辨识度、装备轮廓、种族特征、属性特效和清晰构图。

## Core Rules
1. 核心风格：二次元/2.5D 厚涂游戏角色立绘，强调光影、材质、装备和面部辨识度。
2. 全年龄原则：使用战斗、施法、防御、骑乘、待机等游戏动作；不要加入不符合全年龄定位的成人向姿态。
3. 画面中不能出现文字、字母、符号、水印。
4. 只输出英文 prompt，不要解释，不要 Markdown。
5. 禁止使用 quality 标签，例如 8K、masterpiece、best quality、highres、illustration、unity 8k wallpaper、extremely detailed。

## Rarity Scaling
- R：平视或标准视角，朴素实用装备，简单站姿或待机姿势，极简背景。
- SR：轻微角度变化，精致装备和职业细节，动态但稳定的战斗或施法姿势，简单场景背景。
- SSR：电影级动态视角，华丽装备、披风、流苏、武器光效和复杂背景，突出职业动作与环境叙事。
- UR：强透视和视觉冲击，传说级装备、发光符文、浮动能量碎片、强烈属性特效和超现实背景；服装完整，动作仍必须是战斗或施法演出。

## Race Feature Rules
- 人类：标准人类外观，普通圆形耳朵，无特殊种族特征。
- 恶魔：demon horns、vertical slit pupils、red irises、sharp fangs、pointed ears；高稀有度可加入 demon wings、tail、dark energy markings。
- 精灵：long pointed elf ears，白皙肤色，绿色或蓝色虹膜；高稀有度可加入藤蔓、花朵、自然元素粒子。
- 神族：porcelain white skin、glowing golden or white irises、普通人类耳朵；高稀有度可加入 halo、white wings、glowing magic circle。
- 龙族：curved dragon horns、scaled dragon tail、vertical slit pupils、普通人类耳朵；高稀有度可加入 dragon wings、golden scales、flame effects。
- 亡灵：pale gray skin、white empty pupils、lifeless gaze、exposed bones、普通人类耳朵；高稀有度可加入 ghost mist、chains、bone crown。

## Prompt Structure
按以下顺序组织英文 prompt：
1. Camera & Perspective: 稀有度对应镜头、构图和主体焦点。
2. Character & Body: 1girl, solo, 种族特征、年龄气质、皮肤与眼睛。
3. Outfit & Job: 职业制服、武器、坐骑或召唤物、稀有度装备细节。
4. Legwear & Footwear: 根据职业加入 combat boots、riding boots、armored boots、greaves、knee guards、mage boots、ranger gaiters 等实用护具。
5. Pose & Expression: 战斗、施法、防御、骑乘或待机动作，以及符合角色气质的表情。
6. Attribute & VFX: 属性粒子、魔法、武器光效和环境光。
7. Background: 稀有度匹配背景复杂度。

## Job Mapping
战士类使用巨斧或双斧；剑士类使用轻型剑；弓箭手类使用弓；佣兵类使用巨剑；盗贼类使用短剑或拳刃；斗士类徒手或拳套；骑士类必须有马；天马骑士类必须有天马；弓骑兵类必须有弓和马；重甲兵类必须有巨盾；术士类使用魔法杖；召唤师类必须有召唤兽；圣职类使用权杖；魔导士类使用魔法书；魔术师类必须有魔法纹身或刻印。`;

export function buildLocalImagePrompt(info: CharacterInfo): string {
  return [
    'fantasy tactical RPG character portrait',
    'anime game CG style',
    `${info.race} ${info.profession}`,
    `${info.attribute} elemental visual effects`,
    `${info.rarity} rarity costume details`,
    'full body character art',
    'complete outfit',
    'combat-ready pose',
    'clean background',
    'no text, no watermark'
  ].join(', ');
}

export function buildLivePromptUserText(info: CharacterInfo): string {
  return `
角色姓名: ${info.name}
稀有度: ${info.rarity}
职业: ${info.profession}
种族: ${info.race}
属性: ${info.attribute}
性别: ${info.gender}
年龄: ${info.age}
头衔: ${info.title}
人物描述: ${info.description.substring(0, 200)}`;
}

export const LIVE_SYSTEM_PROMPT = `# Role: 幻想战棋手游动态视效导演 (Fantasy Tactical RPG Motion Director)

你是一名 AI 视频生成提示词专家和二次元游戏动作导演。请根据静态立绘、稀有度、职业和属性，生成全年龄动态演出脚本。

## 输出目标
1. 动态脚本设计：用中文描述动作流程、物理反馈、运镜和特效。
2. AI Video Prompt：可附英文视频提示词，但中文动态脚本必须清晰。

## 稀有度动作逻辑
- R：静态呼吸。保持原姿势，仅有呼吸、眨眼、头发微动和固定机位。
- SR：循环动作。原位整理披风、抬手施法、轻挥武器或握紧武器，运镜缓慢平移。
- SSR：动作释放。完成劈砍、射击、冲刺、施法或盾牌格挡，披风、发丝和元素粒子剧烈运动，运镜跟随动作。
- UR：终极演出。连贯的战斗或施法动作，强烈光影、魔法冲击、碎片飞散和职业演出，但不要镜头拉远。

## 约束
- 动作必须是战斗、施法、防御、骑乘、召唤或待机演出。
- 不要加入不符合全年龄定位的成人向表达。
- 运镜提示词中不要出现 zoomout。
- 直接输出提示词，不要额外寒暄。`;

export function buildFallbackLivePrompt(rarity: string): string {
  const rarityActions: Record<string, string> = {
    R: '角色保持静止姿态，仅有轻微呼吸起伏、眨眼和发丝微动。运镜固定，画面静谧。',
    SR: '角色在原位进行循环动作，整理披风或轻轻挥动武器，衣摆和头发随风摆动。运镜缓慢水平平移。',
    SSR: '角色释放蓄势已久的职业动作，武器挥舞、射击、防御或魔法释放。披风、发丝、武器挂饰和元素粒子剧烈运动，运镜跟随动作。',
    UR: '角色展开连贯且幅度较大的战斗或施法演出，魔法冲击、碎片飞散、披风翻飞和武器震动形成强烈光影，运镜极具张力但禁止镜头拉远。'
  };

  return rarityActions[rarity] || rarityActions.SR;
}

export function buildEmergencyImagePrompt(info?: CharacterInfo): string {
  if (!info) {
    return 'fantasy tactical RPG character portrait, anime game CG style, full body character art, complete outfit, combat-ready pose, clean background, no text, no watermark';
  }

  return buildLocalImagePrompt(info);
}
