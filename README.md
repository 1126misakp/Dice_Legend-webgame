# 纹章传说 Dice Legend

一个基于 React、Vite、Three.js 和 cannon-es 的 3D 物理骰子网页游戏。玩家通过投掷属性骰、命运骰和种族骰生成角色，再缔结契约生成角色卡、立绘、语音和动态效果。

## 功能

- 3D 物理骰子投掷与点数判定
- 稀有度、职业、种族、元素与奖励规则
- 刻印锁定骰子与灌铅骰子改点机制
- 角色卡展示、稀有度粒子、召唤动画和合成音效
- OpenRouter 文案生成、RunningHub 立绘/动态化生成、MiniMax 语音生成

## 技术栈

- React 19
- TypeScript
- Vite
- Three.js
- cannon-es
- lucide-react

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

开发服务器默认运行在 `http://localhost:3000`。

## 环境变量

复制 `.env.example` 为 `.env.local` 后填写需要的密钥：

```bash
VITE_OPENROUTER_API_KEY=你的_OpenRouter_Key
VITE_RUNNINGHUB_API_KEY=你的_RunningHub_Key
VITE_MINIMAX_API_KEY=你的_MiniMax_Key
```

这些密钥只应保存在本地环境文件中，不要提交到 Git 仓库。

## 常用命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览构建产物
```

## 项目结构

```text
.
├── App.tsx                    # 主流程与状态机
├── components/                # 3D 骰子、角色卡、结果面板等组件
├── hooks/                     # UI 音效 Hook
├── logic/                     # 骰子判定与角色规则
├── services/                  # 音效、贴图、语音等服务
├── utils/                     # 环境变量与 RunningHub 队列
├── types.ts                   # 核心类型定义
├── vite.config.ts             # Vite 配置
└── index.tsx                  # React 入口
```

