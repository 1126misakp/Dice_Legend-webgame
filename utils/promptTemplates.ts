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
  return `输出要求:中文自然语句立绘提示词。游戏风格:${info.style}，姓名:${info.name.split('·')[0]}，性别:${info.gender}，年龄:${info.age}，职业:${info.profession}，种族:${info.race}，属性:${info.attribute}，稀有度:${info.rarity}，人物札记:${safeDesc}`;
}

export const ILLUSTRATOR_SYSTEM_PROMPT = `# Role: 幻想战棋手游首席立绘师 (Fantasy Tactical RPG Lead Artist)

## Goals
接收用户提供的游戏设定和角色信息，输出一段用于 AI 绘画的中文自然语句立绘提示词。提示词必须服务于全年龄幻想角色立绘，重点是人物主体、风格、必须加入的提示词、镜头语言、特征和服饰、武器、背景、视觉与特效、动作/姿势。

## Core Rules
1. 核心风格：只写西式幻想风格，不要写“日式战棋卡牌全身立绘”等额外风格。
2. 输出语言：只输出中文自然语句 prompt，不要英文标签堆词，不要解释，不要 Markdown。
3. 人物必须固定为女性角色，人物主体只写清性别、年龄、职业和种族；人物主体部分不得出现稀有度、R、SR、SSR、UR 等相关字样。
4. 必须加入“弱化微小细节不要过度刻画”，用于减少画面噪点和碎光。
5. 全年龄原则：可以呈现健康的肩颈、手臂、腿部轮廓和成年体态，但不暴露隐私部位，不出现裸露、色情构图或成人向姿态。
6. 未成年或低龄角色只能使用完整制服、护腿、长靴和非性感化服装，不强化胸部、露肤、吊带袜或战损服饰。
7. 成年角色服饰暴露程度随稀有度提升而增加，但必须保持完整得体；20-40岁角色可强化成年体态和护胸轮廓，避免使用直白杯码。
8. 袜装颜色跟随视觉主色调：深色主色调用黑丝，浅色主色调用白丝，其余使用主色调同色吊带袜或连裤袜。
9. 动作/姿势需要多样，不能总是站立；布衣职业、法师、神官、召唤师、贤者等非硬金属武器职业优先使用坐姿、跪坐、半蹲、倚靠、仪式施法、阅读魔法书等非战斗姿态。
10. 全身减少遮挡：脸部、躯干、四肢、职业装备和武器必须清晰可见，不被披风、特效、武器、文字或背景遮住。
11. 画面中不能出现文字、字母、符号、水印。
12. 禁止使用 quality 标签，例如 8K、masterpiece、best quality、highres、illustration、unity 8k wallpaper、extremely detailed。

## Prompt Structure
请按一个完整中文自然段组织，必须按顺序包含以下内容：
1. 人物主体：女性、年龄、职业、种族；不得出现稀有度、R、SR、SSR、UR 等相关字样。
2. 风格：整体为西式幻想风格。
3. 必须加入的提示词：弱化微小细节不要过度刻画。
4. 镜头：全身构图、黄金分割视觉焦点、稀有度对应镜头语言。
5. 特征和服饰：种族特征、成年体态、稀有度对应服饰暴露程度、袜装颜色。
6. 武器：职业武器、坐骑、召唤物或法器。
7. 背景：稀有度对应场景复杂度。
8. 视觉与特效：服饰材质、武器材质、背景材质、属性材质和干净特效。
9. 动作/姿势：战斗、施法、防御、坐姿、蹲姿、倚靠、仪式动作或待机演出。

## Rarity Scaling
- R：标准平视全身构图，朴素实用装备，简单站姿或待机姿势，极简背景。
- SR：轻微低角度或斜侧构图，装备更精致，稳定战斗动作，背景有少量幻想战场元素。
- SSR：电影感广角、俯视或动态透视，华丽装备、披风、流苏、武器光效和复杂背景，突出职业动作与环境叙事。
- UR：超广角、脚底仰视、强透视、黄金分割构图，传说级装备、发光符文、浮动能量碎片、强烈属性特效和超现实背景；动作丰富但主体仍必须清晰完整。

## Race Feature Rules
- 人类：标准人类外观，普通圆形耳朵，无特殊种族特征。
- 恶魔：恶魔角、竖瞳、红色虹膜、尖牙、尖耳；高稀有度可加入恶魔翼、尾巴、暗能纹路。
- 精灵：细长尖耳、白皙肤色、绿色或蓝色虹膜；高稀有度可加入藤蔓、花朵、自然元素粒子。
- 神族：瓷白肤色、金色或白色发光虹膜、普通人类耳朵；高稀有度可加入光环、白翼、发光魔法阵。
- 龙族：弯曲龙角、龙鳞尾、竖瞳、普通人类耳朵；高稀有度可加入龙翼、金色鳞片、火焰效果。
- 亡灵：苍白灰色皮肤、空白瞳孔、无生命感视线、骨质装饰、普通人类耳朵；高稀有度可加入幽灵雾、锁链、骨冠。

## Job Mapping
战士类使用巨斧或双斧；剑士类使用轻型单手长剑或双手轻型剑；弓箭手类使用弓；佣兵和勇者类使用巨剑；盗贼、刺客、抹杀使徒类使用短剑或拳刃；斗士类徒手、拳套或斗气；骑士类必须有马；天马骑士类必须有天马；弓骑兵类必须有弓和马；重甲兵类必须有巨盾；术士类使用魔法杖；召唤师类必须有召唤兽；圣职类使用权杖；魔导士、贤者、大贤者类使用魔法书；魔术师类必须有魔法纹身或刻印。`;

function parseAgeNumber(age: string): number {
  const match = age.match(/(\d+)/);
  return match ? Number(match[1]) : 18;
}

function stableIndex(source: string, length: number): number {
  if (length <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) % 100000;
  }
  return hash % length;
}

function getRarityCamera(rarity: string): string {
  const map: Record<string, string> = {
    R: '标准平视的全身卡牌构图，人物位于黄金分割视觉焦点，背景克制简洁',
    SR: '轻微低角度的斜侧全身卡牌构图，人物位于黄金分割视觉焦点，镜头有稳定的战斗张力',
    SSR: '电影感广角俯视与动态透视结合的全身卡牌构图，人物沿黄金分割线展开，背景层次更复杂',
    UR: '超广角、脚底仰视与强透视结合的全身卡牌构图，人物占据黄金分割视觉焦点，镜头语言极具冲击力'
  };
  return map[rarity] || map.SR;
}

function getRarityAction(rarity: string): string {
  const map: Record<string, string> = {
    R: '以清晰的待机姿态面对敌人，动作幅度克制',
    SR: '以稳定的前线战斗姿态迎敌，衣摆、发丝和元素粒子随动作轻微飞散',
    SSR: '正在冲刺、挥砍、施法或格挡，披风翻飞，武器轨迹和元素粒子形成清晰动势',
    UR: '展开连贯而华丽的终极战斗演出，肢体张力强烈，武器轨迹、属性爆发和空间碎片形成多层动势'
  };
  return map[rarity] || map.SR;
}

function isClothProfession(profession: string): boolean {
  return /术士|巫术|召|通灵|牧|神官|修道|圣职|魔导|贤者|大贤者|魔术|咒术/.test(profession);
}

function getActionPose(info: CharacterInfo): string {
  if (isClothProfession(info.profession)) {
    const highRarity = info.rarity === 'SSR' || info.rarity === 'UR';
    if (info.profession.includes('召') || info.profession.includes('通灵')) {
      return highRarity
        ? '以半蹲姿势展开召唤仪式，一手按向地面魔法阵，召唤兽剪影在身后浮现'
        : '以侧坐姿势翻开契约卷轴，召唤法器悬浮在身侧';
    }
    if (info.profession.includes('牧') || info.profession.includes('神官') || info.profession.includes('修道') || info.profession.includes('圣职')) {
      return highRarity
        ? '以跪坐祈祷姿势举起权杖，圣徽光环在身后展开'
        : '以端正坐姿托起权杖，像正在完成祝祷仪式';
    }
    if (info.profession.includes('魔导') || info.profession.includes('贤者') || info.profession.includes('大贤者')) {
      return highRarity
        ? '以倚靠古老石阶的姿势阅读魔法书，书页和元素符文环绕身侧'
        : '以侧坐姿态翻阅魔法书，抬手引导元素光';
    }
    return highRarity
      ? '以半蹲施法姿势展开咒术刻印，手臂和披风形成清晰剪影'
      : '以倚靠姿势抬手施法，动作克制但轮廓清楚';
  }

  return getRarityAction(info.rarity);
}

function getRarityDecoration(rarity: string): string {
  const map: Record<string, string> = {
    R: '装备朴素实用，背景为简洁幻想战场',
    SR: '装备更精致，披风、护具和少量战场尘光增强卡牌感',
    SSR: '华丽装备、披风、流苏、武器光效和复杂幻想战场共同强化稀有度',
    UR: '传说级装备、发光符文、浮动能量碎片、强烈属性特效和超现实背景共同强化稀有度'
  };
  return map[rarity] || map.SR;
}

function getRarityExposure(rarity: string): string {
  const map: Record<string, string> = {
    R: '服饰完整保守，以实用制服、护具和长靴为主',
    SR: '服饰略微轻量化，可露出少量肩颈或手臂线条',
    SSR: '服饰更修身，肩颈、手臂与腿部轮廓更清晰，层次仍完整得体',
    UR: '服饰剪裁更大胆，肩颈、手臂、腰线与腿部轮廓更明显，但不暴露隐私部位'
  };
  return map[rarity] || map.SR;
}

function getAdultBodyShape(age: string): string {
  const ageNumber = parseAgeNumber(age);
  if (ageNumber < 18) return '';
  if (ageNumber < 20) return '成年初期体态，护甲轮廓克制自然';
  if (ageNumber <= 25) return '青年女性体态，上身护甲线条清晰但克制';
  if (ageNumber <= 32) return '成熟饱满的上身曲线，护胸轮廓明确但得体';
  if (ageNumber <= 40) return '丰满但得体的护胸轮廓，上身结构更立体';
  return '成熟稳重的体态，护胸和肩甲轮廓清晰但不过度强调';
}

function getRaceFeature(race: string, rarity: string): string {
  const highRarity = rarity === 'SSR' || rarity === 'UR';
  if (race.includes('恶魔')) return highRarity ? '带有恶魔角、竖瞳、红色虹膜、尖牙、尖耳、暗能纹路和若隐若现的恶魔翼' : '带有恶魔角、竖瞳、红色虹膜、尖牙和尖耳';
  if (race.includes('精灵')) return highRarity ? '带有细长尖耳、白皙肤色、绿色或蓝色虹膜，并环绕藤蔓、花朵与自然粒子' : '带有细长尖耳、白皙肤色和绿色或蓝色虹膜';
  if (race.includes('神族')) return highRarity ? '带有瓷白肤色、金色或白色发光虹膜、光环、白翼和发光魔法阵' : '带有瓷白肤色、金色或白色发光虹膜和神圣气质';
  if (race.includes('龙族')) return highRarity ? '带有弯曲龙角、龙鳞尾、竖瞳、龙翼、金色鳞片和火焰纹路' : '带有弯曲龙角、龙鳞尾和竖瞳';
  if (race.includes('亡灵')) return highRarity ? '带有苍白灰色皮肤、空白瞳孔、骨质装饰、幽灵雾、锁链和骨冠' : '带有苍白灰色皮肤、空白瞳孔和无生命感视线';
  return '保持标准人类外观、普通圆形耳朵和成熟清晰的面部辨识度';
}

function getProfessionGear(profession: string): string {
  if (profession.includes('命运之子')) return '多形态传说神器、命运纹章、可切换的剑刃、弓影与魔法书幻象';
  if (profession.includes('战') || profession.includes('狂') || profession.includes('冠军')) return '巨斧或双斧、厚重肩甲、金属护腕和前线战士轮廓';
  if (profession.includes('剑')) return '轻型单手长剑或双手轻型剑、修身剑士护甲和利落剑鞘';
  if (profession.includes('弓骑') || profession.includes('游侠')) return '骑弓、箭袋、轻骑兵护甲和马匹坐骑';
  if (profession.includes('弓') || profession.includes('射') || profession.includes('狙')) return '长弓、箭袋、护臂、游侠斗篷和便于拉弓的战斗服';
  if (profession.includes('佣') || profession.includes('勇')) return '巨剑、宽厚剑鞘、冒险者披风和勇者纹章护具';
  if (profession.includes('贼') || profession.includes('刺') || profession.includes('抹杀')) return '短剑或拳刃、轻量暗色护甲、腰间投刃和潜行者轮廓';
  if (profession.includes('斗') || profession.includes('武') || profession.includes('拳') || profession.includes('决斗')) return '拳套、臂甲、斗气纹路和适合近身格斗的轻装护具';
  if (profession.includes('天马') || profession.includes('独角兽')) return '长枪或骑士剑、飞行骑士护甲、羽饰头盔和天马坐骑';
  if (profession.includes('骑') || profession.includes('圣骑')) return '骑士剑或长枪、骑士盾饰、马铠和马匹坐骑';
  if (profession.includes('重') || profession.includes('甲') || profession.includes('盾') || profession.includes('守') || profession.includes('铠') || profession.includes('将军')) return '巨盾、剑或长枪、厚重板甲、护胫和坚固防线轮廓';
  if (profession.includes('术士') || profession.includes('巫术')) return '魔法杖、暗色长袍、符文挂饰和暗魔法阵';
  if (profession.includes('召') || profession.includes('通灵')) return '召唤法器、契约卷轴、魔法生物或召唤兽剪影';
  if (profession.includes('牧') || profession.includes('神官') || profession.includes('修道') || profession.includes('圣职')) return '权杖、圣徽、礼装护甲和光属性仪式纹样';
  if (profession.includes('魔导') || profession.includes('贤者') || profession.includes('大贤者')) return '魔法书、元素书页、法师披肩和浮动符文';
  if (profession.includes('魔术') || profession.includes('咒术')) return '魔法纹身或刻印、附魔短杖、符文手套和咒术饰品';
  return '清晰可辨的幻想冒险者装备、主武器和职业徽记';
}

function getAttributeMaterial(attribute: string): string {
  if (attribute.includes('全属性')) return '全属性元素碎片、火焰、冰晶、木藤、钢铁、圣光、暗影与风雷在周身分层环绕';

  const materialMap: Record<string, string> = {
    火: '火焰、熔金、赤红火星和灼热环境光',
    钢: '冷钢、抛光金属、钢属性符文和飞溅金属火花',
    水: '水流、透明水膜、蓝色波纹和湿润反光',
    冰: '冰晶、霜雾、蓝白折射光和冻结纹理',
    木: '木藤、叶片、树皮纹理和自然生命粒子',
    地: '岩石、砂砾、土黄色魔法纹和沉重地脉光',
    暗: '暗影雾气、紫黑能量、深色晶体和低明度环境光',
    光: '圣光、金白辉光、透明光羽和神圣粒子',
    风: '旋风、青绿色气流、飘带形风痕和轻盈环境光',
    雷: '雷电、蓝紫电弧、碎裂闪光和高对比边缘光'
  };

  return attribute
    .split('/')
    .map(item => materialMap[item.trim()] || `${item.trim()}属性粒子、魔法光效和环境材质`)
    .join('，并融合');
}

function getVisualToneColor(info: CharacterInfo): string {
  if (info.race.includes('恶魔') || info.race.includes('亡灵') || info.attribute.includes('暗') || info.attribute.includes('全属性')) return '黑色';
  if (info.race.includes('神族') || info.attribute.includes('光') || info.attribute.includes('冰')) return '白色';
  if (info.attribute.includes('火')) return '赤红色';
  if (info.attribute.includes('钢')) return '银灰色';
  if (info.attribute.includes('水')) return '水蓝色';
  if (info.attribute.includes('木')) return '翠绿色';
  if (info.attribute.includes('地')) return '土褐色';
  if (info.attribute.includes('风')) return '青绿色';
  if (info.attribute.includes('雷')) return '紫色';
  return '主色调同色';
}

function getLegwearAndDamage(info: CharacterInfo): string {
  const ageNumber = parseAgeNumber(info.age);
  if (ageNumber < 18) {
    return '她穿着完整制服、厚实护腿、实用护具和长靴，整体端庄安全，避免任何成人向服饰暗示';
  }

  const toneColor = getVisualToneColor(info);
  const legwearType = stableIndex(`${info.name}-${info.race}-${info.profession}-${info.attribute}`, 2) === 0 ? '连裤袜' : '吊带袜';
  const bodyShape = getAdultBodyShape(info.age);
  const exposure = getRarityExposure(info.rarity);
  return `${exposure}，体现${bodyShape}，搭配${toneColor}${legwearType}、皮革束带、金属护具和战斗短甲；披风边缘、护甲表面、裙摆或袜装可以有轻微战损与擦痕，但不暴露隐私部位`;
}

function getBackground(info: CharacterInfo): string {
  if (info.rarity === 'UR') return '背景为深色幻想战场、远处城堡剪影和大块明暗层次';
  if (info.rarity === 'SSR') return '背景为幻想战场、远处城堡剪影和清晰空气透视';
  if (info.rarity === 'SR') return '背景为简洁幻想战场与远处城墙剪影';
  return '背景为极简幻想场地和柔和远景';
}

export function buildLocalImagePrompt(info: CharacterInfo): string {
  const subject = `${info.age}的${info.race}女性${info.profession}`;
  const raceFeature = getRaceFeature(info.race, info.rarity);
  const camera = getRarityCamera(info.rarity);
  const professionGear = getProfessionGear(info.profession);
  const attributeMaterial = getAttributeMaterial(info.attribute);
  const legwearAndDamage = getLegwearAndDamage(info);
  const rarityDecoration = getRarityDecoration(info.rarity);
  const action = getActionPose(info);
  const background = getBackground(info);

  return `绘制一名${subject}，整体为西式幻想风格，弱化微小细节不要过度刻画。画面采用${camera}，脸部、躯干、四肢和职业装备清晰可见，不被武器、披风、特效或背景遮挡。人物种族特征为${raceFeature}，${legwearAndDamage}。职业辨识度必须强，武器或法器包含${professionGear}。${background}。视觉使用大块明暗层次和干净空气透视，服饰材质表现为皮革、织物、金属扣件和护具层次，武器材质与背景材质结合${attributeMaterial}，特效保持清晰大形状、柔和边缘光和稀疏粒子，${rarityDecoration}。动作/姿势为${action}。画面保持完整得体，无文字、无水印，不暴露隐私部位，不使用色情构图。`;
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
    return '中文自然语句立绘提示词：绘制一名成年女性幻想战棋角色的卡牌全身立绘，采用西式幻想风格，标准全身构图，脸部、躯干、四肢和职业装备清晰可见，服饰、武器、背景和属性元素材质明确，动作是得体的战斗待机姿态，画面无文字、无水印，不暴露隐私部位。';
  }

  return buildLocalImagePrompt(info);
}
