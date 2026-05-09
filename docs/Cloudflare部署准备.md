# Cloudflare 部署准备

记录时间：2026-05-06

## 当前结论

项目已经完成 Cloudflare Worker 单体部署：Vite 构建产物由 Worker Assets 托管，`/api/*` 由 `src/worker/index.ts` 代理到 OpenRouter、RunningHub 和 MiMo。

线上主页：

- `https://dice-legend-webgame.roysindywang.workers.dev`

当前机器仍未登录 Cloudflare，本地手动部署需要执行 `npx wrangler login` 或提供 `CLOUDFLARE_API_TOKEN`。当前推荐继续使用 GitHub Actions 自动部署。

## 部署形态

- Worker 名称：`dice-legend-webgame`
- Worker 入口：`src/worker/index.ts`
- 静态资源目录：`dist`
- 前端路由处理：`not_found_handling` 使用 `single-page-application`
- Worker 优先处理：`/api/*`
- 用户密钥模式：BYOK，平台不保存 OpenRouter、RunningHub、MiMo Key

## 今日部署前验证

已执行：

```bash
npm run typecheck
npm run test:worker
npm run build
npm run cf:dry-run
gh run watch <deploy-run-id> --repo 1126misakp/Dice_Legend-webgame --exit-status
```

结果：

- `npm run typecheck` 通过。
- `npm run test:worker` 通过，20 条 Worker 与配置迁移测试全部通过。
- `npm run build` 通过。
- `npm run cf:dry-run` 通过。
- Wrangler 版本为 `4.87.0`。
- GitHub Actions 自动部署成功。
- `npx wrangler whoami` 仍显示本机未登录，仅影响本地手动部署。

最近线上构建 chunk：

- `dist/assets/index-BtR6jDTF.js`：约 346 KB，gzip 约 111 KB。
- `dist/assets/three-Ktgq_U5U.js`：约 494 KB，gzip 约 125 KB。
- `dist/assets/physics-BSpbupWn.js`：约 83 KB，gzip 约 24 KB。
- `dist/assets/react-B--z-fyW.js`：约 12 KB，gzip 约 4 KB。

## 发布步骤

推荐使用 GitHub Actions 自动部署，避免本机 `wrangler login` 的 OAuth 回调问题。

### GitHub Actions 自动部署

已新增并验证 `.github/workflows/deploy.yml`。推送到 `main` 或在 GitHub Actions 页面手动触发 `部署到 Cloudflare` 后，会执行：

- `npm ci`
- `npm run typecheck`
- `npm run test:worker`
- `npm run build`
- `npm run audit`
- `npx wrangler deploy`

需要先在 GitHub 仓库配置 Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Token 只需要用于部署当前 Worker 的权限，不要写入仓库、聊天记录或前端环境变量。

最近成功部署：

- `5a9399a`：调整主界面布局与语音槽间距。
- GitHub Actions run：`25423850043`。
- 线上包：`/assets/index-BtR6jDTF.js`。

### 本地手动部署

1. 登录 Cloudflare：

```bash
npx wrangler login
```

2. 确认登录状态：

```bash
npx wrangler whoami
```

3. 做发布前验证：

```bash
npm run ci
```

4. 部署 Worker 与静态资源：

```bash
npm run deploy
```

## 上线后验收

- 打开 Worker 部署地址，确认主界面可加载。
- 打开右上角「API 设置」，填写个人 OpenRouter、RunningHub、MiMo Key。
- 不填 Key 时确认降级体验正常：
  - 无当前文案供应商 Key：使用本地文案和 prompt 兜底。
  - 无 RunningHub：跳过立绘和 Live 动态化。
  - 无 MiMo：跳过语音。
- 填真实 Key 后至少完成一次完整链路：
  - 投骰生成角色。
  - 缔结契约生成角色文案。
  - RunningHub 生成静态立绘。
  - MiMo 生成语音。
  - Live 动态化提交、轮询并返回视频。
- 浏览器开发者工具中确认 `/api/*` 请求命中同域 Worker，而不是直接从前端访问第三方 API。

## 当前风险与注意事项

- 尚未由本轮自动化使用真实三方 Key 做端到端验收，这是当前最大剩余风险。
- MiMo 文案模式使用 Token Plan 中国区专属 Base URL：`https://token-plan-cn.xiaomimimo.com/v1`。OpenRouter 文案模式下，语音生成使用官方 Base URL：`https://api.xiaomimimo.com/v1`，并使用单独保存的 MiMo 语音 API Key。
- Worker 当前只允许同源或本地开发来源访问 `/api/*`，正式部署后应从 Worker 域名或绑定域名访问页面。
- 用户 API Key 存在浏览器 `localStorage`，适合个人设备，不适合共享设备长期保存。
- 如果需要自定义域名，应先在 Cloudflare Dashboard 绑定域名，再用部署后的页面做完整验收。
- GitHub Actions 目前有 Node.js 20 action 运行时弃用提示，后续需要关注 2026-06-02 后默认 Node.js 24 切换。

## 清理记录

本轮验证后已清理：

- `dist/`：生产构建产物，部署命令会重新生成。
- `.wrangler/`：Wrangler 本地缓存。
- `._*`：macOS 资源叉文件。

保留：

- `node_modules/`：项目依赖目录，属于本地开发环境，不作为测试临时产物提交。
