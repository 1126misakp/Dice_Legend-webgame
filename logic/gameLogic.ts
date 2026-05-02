
import { FANTASY_SYMBOLS, DiceResult, RACE_DATA, CharacterInfo } from '../types';

/**
 * 计算骰子结果
 * @param rawAttributes 6个骰子的原始点数 (1-6)
 * @param destinyPoint 命运点数
 * @param racePoint 种族点数
 * @param usedItems 是否使用了刻印或灌铅骰子（默认false）
 */
export function calculateDiceResult(
  rawAttributes: number[],
  destinyPoint: number,
  racePoint: number,
  usedItems: boolean = false
): DiceResult {
  const counts: Record<number, number> = {};
  rawAttributes.forEach(v => counts[v] = (counts[v] || 0) + 1);

  // 按数量降序，数量相同按点数降序（用于原始统计，包含女神像）
  const sortedCounts = Object.entries(counts)
    .map(([val, count]) => ({ val: parseInt(val), count }))
    .sort((a, b) => b.count - a.count || b.val - a.val);

  // 统计女神像数量（值为5）
  const luckyCount = counts[5] || 0;

  // 过滤掉女神像，只保留非女神像的骰子用于稀有度判定
  const nonLuckyAttributes = rawAttributes.filter(v => v !== 5);
  const nonLuckyTotal = nonLuckyAttributes.length; // 非女神像骰子数量

  // 非女神像骰子的统计
  const nonLuckyCounts: Record<number, number> = {};
  nonLuckyAttributes.forEach(v => nonLuckyCounts[v] = (nonLuckyCounts[v] || 0) + 1);

  const sortedNonLuckyCounts = Object.entries(nonLuckyCounts)
    .map(([val, count]) => ({ val: parseInt(val), count }))
    .sort((a, b) => b.count - a.count || b.val - a.val);

  const nlTop = sortedNonLuckyCounts[0];
  const nlSecond = sortedNonLuckyCounts[1];
  // const nlThird = sortedNonLuckyCounts[2]; // 可能不存在

  // --- 检查是否为命运之子 ---
  // 6个不同骰面 或 6个女神像
  const isAllDiffOriginal = sortedCounts.length === 6; // 原始6个骰子全不同
  const isAllLucky = luckyCount === 6; // 全是女神像

  // 命运之子判定：必须没使用刻印或灌铅骰子
  const isDestinyChild = !usedItems && (isAllDiffOriginal || isAllLucky);

  // --- 1. 稀有度判定 (Rarity) ---
  // 规则（基于非女神像骰子）：
  // 命运之子 -> UR（需要未使用道具）
  // 6相同(非女神像) or 5相同(非女神像) or 3+3 or 4+2 -> SSR
  // 4相同 or 3+2(FullHouse) -> SR
  // 3相同 or 2对 or 1对 -> R (以及其他情况兜底)

  let rarity = 'R';

  // 如果是命运之子，直接UR
  if (isDestinyChild) {
    rarity = 'UR';
  } else if (nonLuckyTotal === 0) {
    // 全是女神像但使用了道具，按R处理
    rarity = 'R';
  } else {
    // 基于非女神像骰子判定稀有度
    const nlMaxCount = nlTop?.count || 0;
    const nlUniqueCount = sortedNonLuckyCounts.length;

    // 辅助布尔值（基于非女神像骰子）
    const nlIsAllSame = nlMaxCount === nonLuckyTotal && nonLuckyTotal >= 4; // 所有非女神像都相同，至少4个
    const nlIsAllDiff = nlUniqueCount === nonLuckyTotal && nonLuckyTotal >= 4; // 所有非女神像都不同，至少4个
    const nlIsFiveSame = nlMaxCount >= 5;
    const nlIsFourTwo = nlMaxCount === 4 && nlSecond?.count === 2;
    const nlIsFourOneOne = nlMaxCount === 4 && (!nlSecond || nlSecond.count === 1);
    const nlIsThreeThree = nlMaxCount === 3 && nlSecond?.count === 3;
    const nlIsFullHouse = nlMaxCount === 3 && nlSecond?.count === 2;
    // const nlIsThreeSameOnly = nlMaxCount === 3 && (!nlSecond || nlSecond.count === 1);

    if (nlIsAllSame && nonLuckyTotal === 6) {
      // 6个相同（无女神像）-> UR（但不是命运之子）
      rarity = 'UR';
    } else if (nlIsFiveSame || nlIsThreeThree || nlIsFourTwo) {
      rarity = 'SSR';
    } else if (nlIsFourOneOne || nlIsFullHouse) {
      rarity = 'SR';
    } else if (nlIsAllDiff && nonLuckyTotal >= 5) {
      // 5个或6个不同（非命运之子情况，因为用了道具）
      rarity = 'SSR';
    } else {
      rarity = 'R';
    }
  }

  // 保留原始统计用于奖励判定
  const top = sortedCounts[0];
  const second = sortedCounts[1];
  // const third = sortedCounts[2];
  const maxCount = top?.count || 0;
  const uniqueCount = sortedCounts.length;

  // 原始判定值（用于奖励计算，仍基于所有骰子）
  const isAllSame = maxCount === 6;
  const isAllDiff = uniqueCount === 6;
  const isFiveSame = maxCount === 5;
  const isFourTwo = maxCount === 4 && second?.count === 2;
  const isThreeThree = maxCount === 3 && second?.count === 3;
  const isFullHouse = maxCount === 3 && second?.count === 2;
  const isThreeSameOnly = maxCount === 3 && second?.count === 1;

  // --- 2. 特殊奖励判定 (Rewards) ---
  // 规则：
  // 3+3 or 4+2 -> 3个灌铅骰子
  // 3+2 (FullHouse) -> 1个灌铅骰子
  // 3个对子 (2+2+2) -> 3个刻印
  // 3个相同 (3+1+1+1) -> 2个刻印
  // 1个对子 (2+1+1+1+1) -> 1个刻印
  // 注意：两个对子 (2+2+1+1) 无奖励
  
  let crests = 0;
  let weightedDice = 0;

  // 统计对子数量 (count == 2)
  const pairCount = sortedCounts.filter(c => c.count === 2).length;

  if (isThreeThree || isFourTwo) {
    weightedDice = 3;
  } else if (isFullHouse) {
    weightedDice = 1;
  } else if (pairCount === 3) {
    // 2+2+2
    crests = 3;
  } else if (isThreeSameOnly) {
    // 3+1+1+1 (单三条)
    crests = 2;
  } else if (pairCount === 1) {
    // 2+1+1+1+1 (单对子)
    crests = 1;
  } 
  // pairCount === 2 (两个对子) 不获得任何奖励

  // --- 3. 职业判定 (Profession) ---
  // 排除幸运骰子 (5)
  const profCountsArr: { val: number, count: number }[] = [];
  rawAttributes.forEach(v => {
    if (v !== 5) { // 5是幸运，不参与职业判定
      const existing = profCountsArr.find(p => p.val === v);
      if (existing) existing.count++;
      else profCountsArr.push({ val: v, count: 1 });
    }
  });
  
  // 重新排序职业骰子
  profCountsArr.sort((a, b) => b.count - a.count || b.val - a.val);
  
  const pTop = profCountsArr[0];
  const pSecond = profCountsArr[1];
  const pThird = profCountsArr[2];

  let baseProfession = "冒险者";

  // 基础映射 (单属性 -> 职业名) - 基础职业名用于R级
  const getSingleClass = (val: number) => {
    switch(val) {
      case 1: return "战士"; // 力量最多 - 战士类职业（巨斧或双斧）
      case 2: return "重甲兵"; // 防御最多 - 重甲兵职业（巨盾+剑或枪）
      case 3: return "盗贼"; // 速度最多 - 盗贼类职业（短剑/拳刃）
      case 4: return "魔导士"; // 魔法最多 - 魔导士职业（魔法书引导元素魔法）
      case 6: return "弓箭手"; // 技巧最多 - 弓箭手职业（弓）
      default: return "冒险者";
    }
  };

  // 组合映射 (双属性 -> 职业名) - 基础职业名用于R级
  const getComboClass = (v1: number, v2: number) => {
    const pair = [v1, v2].sort((a, b) => a - b).join("");
    const map: Record<string, string> = {
      "12": "佣兵",     // 力量+防御 - 佣兵类职业（巨剑）
      "13": "剑士",     // 力量+速度 - 剑士类职业（轻型单手/双手剑）
      "16": "武者",     // 力量+技巧 - 武者类职业（拳套/徒手斗气）
      "14": "术士",     // 力量+魔法 - 术士类职业（魔法杖引导暗魔法）
      "24": "圣职",     // 魔法+防御 - 圣职职业（权杖引导光魔法）
      "34": "召唤师",   // 魔法+速度 - 召唤师职业（召唤魔法生物）
      "46": "魔术师",   // 魔法+技巧 - 魔术师职业（附魔肉体或武器）
      "26": "弓骑兵",   // 技巧+防御 - 弓骑兵职业（骑马用弓）
      "36": "天马骑士", // 技巧+速度 - 天马骑士职业（飞行单位，枪或剑）
      "23": "骑士"      // 速度+防御 - 骑士类职业（骑马，枪或剑）
    };
    return map[pair] || "冒险者";
  };

  // 所有可用的单职业列表（用于随机选择）
  const allSingleClasses = ["战士", "重甲兵", "盗贼", "魔导士", "弓箭手"];
  // 所有可用的组合职业列表（用于随机选择）
  const allComboClasses = ["佣兵", "剑士", "武者", "术士", "圣职", "召唤师", "魔术师", "弓骑兵", "天马骑士", "骑士"];

  // 判定逻辑
  if (isDestinyChild) {
    // 命运之子（6个不同骰面或6个女神像，且未使用道具）
    baseProfession = "命运之子";
  } else if (profCountsArr.length === 0) {
     // 全幸运骰子被排除后（使用了道具的情况）
     baseProfession = "冒险者";
  } else {
    // 检查是否为6个不同骰面（使用道具的情况，非命运之子）
    const isAllDifferent = profCountsArr.length >= 5 && profCountsArr.every(p => p.count === 1);

    if (isAllDifferent) {
      // 6个不同骰面（使用道具）-> 随机选择一个职业（单职业或组合职业）
      // 使用命运点数来决定随机结果，保证同一次掷骰结果一致
      const allProfessions = [...allSingleClasses, ...allComboClasses];
      const randomIndex = (destinyPoint + racePoint) % allProfessions.length;
      baseProfession = allProfessions[randomIndex];
    }
    // 特殊情况3：3个XX和3个YY -> XX/YY 双职业
    else if (pTop && pSecond && pTop.count === 3 && pSecond.count === 3) {
      baseProfession = `${getSingleClass(pTop.val)}/${getSingleClass(pSecond.val)}`;
    }
    // 特殊情况2：2个XX, 2个YY, 2个ZZ -> 2+2+2 双职业
    else if (pTop && pSecond && pThird && pTop.count === 2 && pSecond.count === 2 && pThird.count === 2) {
      // 命运点数决定组合
      if (destinyPoint <= 2) { // XX+YY / YY+ZZ (Top+2nd / 2nd+3rd) -> 这里的 Top/2nd/3rd 是排序后的，其实就是组合
         baseProfession = `${getComboClass(pTop.val, pSecond.val)}/${getComboClass(pSecond.val, pThird.val)}`;
      } else if (destinyPoint <= 4) { // XX+YY / XX+ZZ
         baseProfession = `${getComboClass(pTop.val, pSecond.val)}/${getComboClass(pTop.val, pThird.val)}`;
      } else { // YY+ZZ / XX+ZZ
         baseProfession = `${getComboClass(pSecond.val, pThird.val)}/${getComboClass(pTop.val, pThird.val)}`;
      }
    }
    // 特殊情况1：2个XX 和 2个YY (忽略剩下的) -> XX+YY
    else if (pTop && pSecond && pTop.count === 2 && pSecond.count === 2) {
      baseProfession = getComboClass(pTop.val, pSecond.val);
    }
    // 标准判定：
    // 当XX最多(唯一) 且 没有第二多 -> XX (单职业)
    // 当XX最多(唯一) 且 有第二多(唯一) YY -> XX+YY (组合职业)
    else {
      // 检查 Top 是否唯一
      const isTopUnique = !pSecond || pTop.count > pSecond.count;

      if (isTopUnique) {
        // Top 唯一。检查 Second 是否存在且唯一
        // 如果没有 Second (例如 5个Str, 1个Lucky被排除了)，则只有 Top
        if (!pSecond) {
            baseProfession = getSingleClass(pTop.val);
        } else {
            // 检查 Second 是否唯一 (即 SecondCount > ThirdCount)
            const isSecondUnique = !pThird || pSecond.count > pThird.count;

            if (isSecondUnique) {
                // Top唯一，Second唯一 -> XX+YY
                baseProfession = getComboClass(pTop.val, pSecond.val);
            } else {
                // Top唯一，Second不唯一 (e.g. 4 Str, 1 Def, 1 Spd) -> XX
                baseProfession = getSingleClass(pTop.val);
            }
        }
      } else {
        // Top 不唯一 (e.g. 2 Str, 2 Spd, 1 Def -> 前面已经由 2+2 逻辑捕获了)
        // 这里的逻辑通常是 fallback，比如 1,1,1,1,1,1 全不同被上面捕获了。
        // 如果剩下的是 1,1,1 (3个不同)，比如筛除了3个幸运。
        // 此时 Top count 1, Second count 1.
        // 这种极少数情况，默认取 Top 单职业
        baseProfession = getSingleClass(pTop.val);
      }
    }
  }

  // --- 4. 元素共鸣 & 属性判定 (随机) ---
  const resonance: Record<string, number> = {};
  for(let i=0; i<6; i++) resonance[i.toString()] = 0;
  for(let i=0; i<6; i++) {
      const rnd = Math.floor(Math.random() * 6);
      resonance[rnd.toString()] = (resonance[rnd.toString()] || 0) + 1;
  }

  const sortedResonance = Object.entries(resonance)
      .map(([key, count]) => ({ val: parseInt(key) + 1, count })) 
      .sort((a, b) => b.count - a.count || b.val - a.val);

  const colorMap: Record<number, string[]> = {
    1: ["火", "钢"], 2: ["水", "冰"], 3: ["木", "地"], 6: ["风", "雷"], 4: ["暗"], 5: ["光"]
  };
  const getSingleAttr = (val: number) => {
    const options = colorMap[val];
    if (options.length === 1) return options[0];
    return destinyPoint % 2 !== 0 ? options[0] : options[1];
  };

  let attribute = "";
  const r1 = sortedResonance[0];
  const r2 = sortedResonance[1];
  const r3 = sortedResonance[2];

  if (sortedResonance.every(r => r.count === 1)) {
    attribute = "全属性";
  } else if (r1.count > r2.count) {
    attribute = getSingleAttr(r1.val);
  } else if (r1.count === r2.count) {
    if (r1.count === 3) {
      attribute = `${getSingleAttr(r1.val)}/${getSingleAttr(r2.val)}`;
    } else if (r1.count === 2) {
      if (r3 && r3.count === 2) {
        if (destinyPoint <= 2) attribute = `${getSingleAttr(r1.val)}/${getSingleAttr(r2.val)}`;
        else if (destinyPoint <= 4) attribute = `${getSingleAttr(r2.val)}/${getSingleAttr(r3.val)}`;
        else attribute = `${getSingleAttr(r1.val)}/${getSingleAttr(r3.val)}`;
      } else {
        attribute = destinyPoint % 2 !== 0 ? getSingleAttr(r1.val) : getSingleAttr(r2.val);
      }
    }
  }
  if (!attribute) attribute = getSingleAttr(r1.val);

  const attributesSummary: Record<string, number> = {};
  rawAttributes.forEach(v => {
    const sym = FANTASY_SYMBOLS[v - 1];
    if (sym) attributesSummary[sym.name] = (attributesSummary[sym.name] || 0) + 1;
  });

  // --- 5. 年龄生成 ---
  const getAge = (dp: number) => {
    const ranges: Record<number, [number, number]> = {
        1: [8, 15], 2: [16, 25], 3: [26, 35], 4: [36, 45], 5: [46, 55], 6: [56, 65]
    };
    const range = ranges[dp] || [16, 25];
    const age = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    return `${age}岁`;
  };
  
  return {
    rawAttributes,
    destinyPoint,
    racePoint,
    rarity,
    profession: baseProfession || "冒险者",
    attribute: attribute || "无",
    race: RACE_DATA[racePoint - 1] || RACE_DATA[0],
    age: getAge(destinyPoint),
    luckyValue: counts[5] || 0,
    attributes: attributesSummary,
    colors: resonance,
    rewards: { crests, weightedDice }
  };
}

export function upgradeProfession(base: string, rarity: string): string {
    // 排除特殊的复合职业或命运之子
    if (base === "自定义" || base === "命运之子") return base;

    // R:0, SR:1, SSR:2, UR:3
    const idx = rarity === 'UR' ? 3 : rarity === 'SSR' ? 2 : rarity === 'SR' ? 1 : 0;

    // 晋升映射表 [R, SR, SSR, UR]
    const rankMap: Record<string, string[]> = {
        // 力量最多 - 战士类职业（巨斧或双斧）
        "战士": ["初级战士", "战士", "狂战士", "冠军勇士"],

        // 力量+防御 - 佣兵类职业（巨剑）
        "佣兵": ["见习佣兵", "佣兵", "勇者", "勇者"],

        // 力量+速度 - 剑士类职业（轻型单手/双手剑）
        "剑士": ["见习剑士", "剑士", "剑圣", "剑圣"],

        // 力量+技巧 - 武者类职业（拳套/徒手斗气）
        "武者": ["初级斗士", "斗士", "决斗士", "决斗士"],

        // 力量+魔法 - 术士类职业（魔法杖引导暗魔法）
        "术士": ["见习术士", "术士", "巫术大师", "巫术大师"],

        // 魔法最多 - 魔导士职业（魔法书引导元素魔法）
        "魔导士": ["见习魔导士", "魔导士", "贤者", "大贤者"],

        // 魔法+防御 - 圣职职业（权杖引导光魔法）
        "圣职": ["修道士", "牧师", "神官", "神官"],

        // 魔法+速度 - 召唤师职业（召唤魔法生物）
        "召唤师": ["初级召唤师", "召唤师", "通灵大师", "通灵大师"],

        // 魔法+技巧 - 魔术师职业（附魔肉体或武器）
        "魔术师": ["初级魔术师", "魔术师", "咒术大师", "咒术大师"],

        // 技巧最多 - 弓箭手职业（弓）
        "弓箭手": ["见习弓手", "弓箭手", "狙击手", "神射手"],

        // 技巧+防御 - 弓骑兵职业（骑马用弓）
        "弓骑兵": ["见习弓骑兵", "弓骑兵", "游侠将军", "游侠将军"],

        // 技巧+速度 - 天马骑士职业（飞行单位，枪或剑）
        "天马骑士": ["见习天马骑士", "天马骑士", "独角兽骑士", "独角兽骑士"],

        // 速度最多 - 盗贼类职业（短剑/拳刃）
        "盗贼": ["初级盗贼", "盗贼", "刺客", "抹杀使徒"],

        // 速度+防御 - 骑士类职业（骑马，枪或剑）
        "骑士": ["见习骑士", "骑士", "圣骑士", "圣骑士"],

        // 防御最多 - 重甲兵职业（巨盾+剑或枪）
        "重甲兵": ["初级守卫", "重甲兵", "巨盾守卫", "铠将军"]
    };

    const upgradeSingle = (name: string) => {
        const list = rankMap[name];
        if (!list) return name;
        return list[idx] || list[list.length - 1];
    };

    if (base.includes('/')) {
        return base.split('/').map(upgradeSingle).join('/');
    }

    return upgradeSingle(base);
}

// Fallback generator in case external API fails
export function generateFallbackInfo(result: DiceResult, style: string): CharacterInfo {
    const names = ["艾莉丝", "露娜", "塞拉", "薇薇安", "伊莎贝拉", "诺拉", "艾米", "克拉拉", "索菲亚", "艾琳", "芙蕾雅", "希尔薇"];
    const prefixes = ["星之", "月之", "风之", "雷之", "红莲", "苍蓝", "深渊", "圣洁", "幻影", "永恒"];
    const suffixes = ["守护者", "咏唱者", "行者", "使者", "骑士", "魔导", "猎手", "剑姬", "女王", "领主"];
    
    const rName = names[Math.floor(Math.random() * names.length)];
    const rPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const rSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const title = `${rPrefix}${rSuffix}`;
    const name = `${rName}·${title}`;
    
    // Fallback description template
    const desc = `作为${result.race.name}一族的${result.profession}，她通过${result.attribute}元素与世界共鸣。虽然外表只有${result.age}，但她眼神中透露出的坚定，预示着一段不凡的${result.rarity}级传奇即将展开。`;

    return {
        style,
        name,
        gender: '女',
        age: result.age,
        profession: result.profession,
        race: result.race.name,
        attribute: result.attribute,
        rarity: result.rarity,
        title,
        description: desc
    };
}
