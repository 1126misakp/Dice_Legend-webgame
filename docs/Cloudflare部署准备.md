# Cloudflare 部署准备

记录时间：2026-05-05

## 当前结论

项目已经具备 Cloudflare Worker 单体部署条件：Vite 构建产物由 Worker Assets 托管，`/api/*` 由 `src/worker/index.ts` 代理到 OpenRouter、RunningHub 和 MiniMax。

当前机器尚未登录 Cloudflare，实际发布前需要执行 `npx wrangler login`。

## 部署形态

- Worker 名称：`dice-legend-webgame`
- Worker 入口：`src/worker/index.ts`
- 静态资源目录：`dist`
- 前端路由处理：`not_found_handling` 使用 `single-page-application`
- Worker 优先处理：`/api/*`
- 用户密钥模式：BYOK，平台不保存 OpenRouter、RunningHub、MiniMax Key

## 今日部署前验证

已执行：

```bash
npm run ci
npx wrangler whoami
```

结果：

- `npm run typecheck` 通过。
- `npm run test:worker` 通过，16 条 Worker 测试全部通过。
- `npm run build` 通过。
- `npm run cf:dry-run` 通过。
- `npm run audit` 通过，0 个漏洞。
- Wrangler 版本为 `4.87.0`。
- `npx wrangler whoami` 显示未登录，需要发布前登录。

当前构建 chunk：

- `dist/assets/index-DRZ-GDt0.js`：约 345 KB，gzip 约 111 KB。
- `dist/assets/three-Ktgq_U5U.js`：约 494 KB，gzip 约 125 KB。
- `dist/assets/physics-BSpbupWn.js`：约 83 KB，gzip 约 24 KB。
- `dist/assets/react-B--z-fyW.js`：约 12 KB，gzip 约 4 KB。

## 发布步骤

推荐使用 GitHub Actions 自动部署，避免本机 `wrangler login` 的 OAuth 回调问题。

### GitHub Actions 自动部署

已新增 `.github/workflows/deploy.yml`。推送到 `main` 或在 GitHub Actions 页面手动触发 `部署到 Cloudflare` 后，会执行：

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
- 打开右上角「API 设置」，填写个人 OpenRouter、RunningHub、MiniMax Key。
- 不填 Key 时确认降级体验正常：
  - 无 OpenRouter：使用本地文案和 prompt 兜底。
  - 无 RunningHub：跳过立绘和 Live 动态化。
  - 无 MiniMax：跳过语音。
- 填真实 Key 后至少完成一次完整链路：
  - 投骰生成角色。
  - 缔结契约生成角色文案。
  - RunningHub 生成静态立绘。
  - MiniMax 生成语音。
  - Live 动态化提交、轮询并返回视频。
- 浏览器开发者工具中确认 `/api/*` 请求命中同域 Worker，而不是直接从前端访问第三方 API。

## 当前风险与注意事项

- 尚未使用真实三方 Key 做端到端验收，这是上线前最大剩余风险。
- Worker 当前只允许同源或本地开发来源访问 `/api/*`，正式部署后应从 Worker 域名或绑定域名访问页面。
- 用户 API Key 存在浏览器 `localStorage`，适合个人设备，不适合共享设备长期保存。
- 如果需要自定义域名，应先在 Cloudflare Dashboard 绑定域名，再用部署后的页面做完整验收。

## 清理记录

本轮验证后应清理：

- `dist/`：生产构建产物，部署命令会重新生成。
- `.wrangler/`：Wrangler 本地缓存。
- `._*`：macOS 资源叉文件。

保留：

- `node_modules/`：项目依赖目录，属于本地开发环境，不作为测试临时产物提交。
