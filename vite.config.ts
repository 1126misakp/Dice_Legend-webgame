import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: true, // 等同于 '0.0.0.0'，允许外部访问
        // 完全禁用 HMR（热模块替换）以避免 WebSocket 连接错误
        // 修改代码后需要手动刷新页面
        hmr: false,
        watch: {
          usePolling: false,
        },
        // 严格端口模式：如果端口被占用则报错而不是自动切换
        strictPort: true,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
