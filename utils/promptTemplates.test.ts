import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CharacterInfo } from '../types';
import {
  buildEmergencyImagePrompt,
  buildImagePromptUserInput,
  buildLocalImagePrompt,
  ILLUSTRATOR_SYSTEM_PROMPT
} from './promptTemplates';

const baseInfo: CharacterInfo = {
  style: '火焰纹章风格+西式幻想RPG',
  name: '艾琳·苍蓝守护者',
  gender: '女',
  age: '40岁',
  profession: '战士',
  race: '人类',
  attribute: '钢',
  rarity: 'SR',
  title: '苍蓝守护者',
  description: '作为人类一族的战士，她通过钢元素与世界共鸣。'
};

test('立绘系统提示词要求输出中文自然语句并覆盖固定结构', () => {
  assert.match(ILLUSTRATOR_SYSTEM_PROMPT, /中文自然语句/);
  assert.match(ILLUSTRATOR_SYSTEM_PROMPT, /人物主体/);
  assert.match(ILLUSTRATOR_SYSTEM_PROMPT, /风格/);
  assert.match(ILLUSTRATOR_SYSTEM_PROMPT, /必须加入的提示词/);
  assert.match(ILLUSTRATOR_SYSTEM_PROMPT, /镜头语言/);
  assert.match(ILLUSTRATOR_SYSTEM_PROMPT, /特征和服饰/);
  assert.match(ILLUSTRATOR_SYSTEM_PROMPT, /武器/);
  assert.match(ILLUSTRATOR_SYSTEM_PROMPT, /背景/);
  assert.match(ILLUSTRATOR_SYSTEM_PROMPT, /属性材质/);
  assert.match(ILLUSTRATOR_SYSTEM_PROMPT, /黑丝|白丝|紧身连裤袜/);
  assert.match(ILLUSTRATOR_SYSTEM_PROMPT, /不暴露隐私部位/);
});

test('本地立绘提示词按新结构输出主体、风格、必须提示词、镜头、服饰、武器、背景、特效和动作', () => {
  const prompt = buildLocalImagePrompt(baseInfo);

  assert.match(prompt, /40岁的人类女性战士/);
  assert.match(prompt, /SR稀有度/);
  assert.match(prompt, /整体为西式幻想风格/);
  assert.doesNotMatch(prompt, /日式战棋卡牌全身立绘|火焰纹章风格\+西式幻想RPG/);
  assert.match(prompt, /弱化微小细节不要过度刻画/);
  assert.match(prompt, /黄金分割/);
  assert.match(prompt, /脸部、躯干、四肢和职业装备清晰可见/);
  assert.match(prompt, /巨斧或双斧/);
  assert.match(prompt, /钢铁|冷钢|金属/);
  assert.match(prompt, /银灰色连裤袜|银灰色吊带袜/);
  assert.match(prompt, /背景为/);
  assert.match(prompt, /不暴露隐私部位/);
  assert.doesNotMatch(prompt, /^fantasy tactical RPG/);
});

test('UR 本地立绘提示词强化镜头语言、稀有度华丽度和全属性材质', () => {
  const prompt = buildLocalImagePrompt({
    ...baseInfo,
    name: '塞拉·深渊使者',
    age: '30岁',
    profession: '命运之子',
    race: '恶魔',
    attribute: '全属性',
    rarity: 'UR'
  });

  assert.match(prompt, /30岁的恶魔女性命运之子/);
  assert.match(prompt, /超广角|脚底仰视|强透视/);
  assert.match(prompt, /传说级/);
  assert.match(prompt, /全属性元素碎片/);
  assert.match(prompt, /恶魔角|竖瞳|暗能纹路/);
  assert.match(prompt, /黑色战斗连裤袜|黑色吊带袜/);
  assert.match(prompt, /成熟饱满的上身曲线|丰满但得体的护胸轮廓/);
});

test('未成年角色不会加入露肤、战损、吊带袜和身体曲线强化', () => {
  const prompt = buildLocalImagePrompt({
    ...baseInfo,
    age: '15岁',
    profession: '见习弓手',
    race: '精灵',
    attribute: '木',
    rarity: 'R'
  });

  assert.match(prompt, /完整制服/);
  assert.match(prompt, /护腿/);
  assert.doesNotMatch(prompt, /肩颈、手臂与腿部轮廓/);
  assert.doesNotMatch(prompt, /战损|破损|擦痕/);
  assert.doesNotMatch(prompt, /吊带袜|上身曲线|护胸轮廓|胸部/);
});

test('浅色主色调使用白色袜装，非深浅主色调使用属性同色袜装', () => {
  const icePrompt = buildLocalImagePrompt({
    ...baseInfo,
    age: '20岁',
    profession: '勇者',
    race: '精灵',
    attribute: '冰',
    rarity: 'SSR'
  });
  const firePrompt = buildLocalImagePrompt({
    ...baseInfo,
    age: '28岁',
    profession: '魔术师',
    race: '人类',
    attribute: '火',
    rarity: 'SR'
  });

  assert.match(icePrompt, /白色连裤袜|白色吊带袜/);
  assert.match(firePrompt, /赤红色连裤袜|赤红色吊带袜/);
});

test('布衣职业优先生成非站立非战斗姿势', () => {
  const prompt = buildLocalImagePrompt({
    ...baseInfo,
    age: '32岁',
    profession: '神官',
    race: '神族',
    attribute: '光',
    rarity: 'SSR'
  });

  assert.match(prompt, /坐姿|跪坐|侧坐|半蹲|倚靠/);
  assert.doesNotMatch(prompt, /前线战斗姿态迎敌/);
});

test('提交给文案模型的立绘输入声明中文自然语句目标', () => {
  const input = buildImagePromptUserInput(baseInfo);

  assert.match(input, /输出要求:中文自然语句立绘提示词/);
  assert.match(input, /属性:钢/);
});

test('紧急兜底提示词复用中文本地立绘提示词', () => {
  assert.equal(buildEmergencyImagePrompt(baseInfo), buildLocalImagePrompt(baseInfo));
  assert.match(buildEmergencyImagePrompt(), /中文自然语句/);
});
