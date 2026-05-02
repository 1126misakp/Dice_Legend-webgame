const viteEnv = ((import.meta as any).env ?? {}) as Record<string, string | undefined>;

export const OPENROUTER_API_KEY = viteEnv.VITE_OPENROUTER_API_KEY ?? '';
export const RUNNINGHUB_API_KEY = viteEnv.VITE_RUNNINGHUB_API_KEY ?? '';
export const MINIMAX_API_KEY = viteEnv.VITE_MINIMAX_API_KEY ?? '';

