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
npm run dev
```

开发服务器默认运行在 `http://localhost:3000`。

## API Key 模式

项目使用用户自填 API Key 模式。打开网页后，在右上角「API 设置」中填写：

- OpenRouter API Key：角色文案、立绘提示词、动态提示词
- OpenRouter 模型：默认 `x-ai/grok-4.1-fast`，可按需改成你希望使用的大模型，主要影响文案生成
- RunningHub API Key：角色立绘与动态化视频
- MiniMax API Key：角色语音生成

密钥默认保存在浏览器 `localStorage`，只适合个人设备。共享设备使用后请点击「清除密钥」。密钥不会写入 URL、不会进入前端构建产物，也不应提交到 Git 仓库。

未填写对应 Key 时，功能会自动降级：

- 无 OpenRouter：使用本地角色文案和提示词兜底
- 无 RunningHub：不生成立绘和动态化视频，角色卡显示文字占位
- 无 MiniMax：不生成语音，语音按钮显示缺失态

## Cloudflare 部署

项目提供单 Worker 部署：Cloudflare Worker 同时托管 Vite 静态资源和 `/api/*` 代理接口。

```bash
npm run build
npm run cf:dev
npm run deploy
```

Worker 不保存平台密钥，只从请求头读取用户本次提供的 Key，转发到白名单第三方接口，并统一返回 `{ ok, data, error }` 风格响应。

## 常用命令

```bash
npm run dev        # 启动 Vite 开发服务器
npm run cf:dev     # 构建后用 Wrangler 启动 Cloudflare Worker
npm run typecheck  # TypeScript 类型检查
npm run build      # 构建生产版本
npm run preview    # 预览构建产物
npm run deploy     # 构建并部署到 Cloudflare
```

## 项目结构

```text
.
├── App.tsx                    # 主流程与状态机
├── components/                # 3D 骰子、角色卡、结果面板等组件
├── hooks/                     # UI 音效 Hook
├── logic/                     # 骰子判定与角色规则
├── services/                  # 音效、贴图、语音等服务
├── src/worker/                # Cloudflare Worker 代理
├── utils/                     # API Key、本域代理 Client 与 RunningHub 队列
├── types.ts                   # 核心类型定义
├── vite.config.ts             # Vite 配置
├── wrangler.jsonc             # Cloudflare Worker 配置
└── index.tsx                  # React 入口
```
