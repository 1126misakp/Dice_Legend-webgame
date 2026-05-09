import { ApiKeys, DEFAULT_OPENROUTER_MODEL } from './apiKeyStore';

type ApiEndpoint =
  | '/api/openrouter/chat'
  | '/api/runninghub/run'
  | '/api/runninghub/outputs'
  | '/api/mimo/tts'
  | '/api/mimo/chat';

interface ProxySuccess<T> {
  ok: true;
  data: T;
}

interface ProxyFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

type ProxyResponse<T> = ProxySuccess<T> | ProxyFailure;

export interface ApiClientOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export interface RunningHubProxyResponse {
  code?: number | string;
  msg?: string;
  data?: unknown;
}

export interface MimoTTSResponse {
  choices?: Array<{
    message?: {
      audio?: {
        data?: string;
      };
    };
  }>;
}

export type ChatCompletionResponse = OpenRouterChatResponse;

const MIMO_TEXT_MODEL = 'mimo-v2.5-pro';
const DEFAULT_TIMEOUT_MS = 30000;

export class ApiClientError extends Error {
  code: string;

  constructor(message: string, code = 'PROXY_ERROR') {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
  }
}

async function callProxy<T>(endpoint: ApiEndpoint, apiKey: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
  if (!apiKey.trim()) {
    throw new ApiClientError('缺少对应的 API Key', 'MISSING_API_KEY');
  }

  if (options.signal?.aborted) {
    throw new ApiClientError('请求已取消', 'REQUEST_CANCELLED');
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let isTimeout = false;
  const timeoutId = globalThis.setTimeout(() => {
    isTimeout = true;
    controller.abort();
  }, timeoutMs);
  const abortFromExternalSignal = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromExternalSignal, { once: true });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Api-Key': apiKey.trim()
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      if (!isTimeout) {
        throw new ApiClientError('请求已取消', 'REQUEST_CANCELLED');
      }
      throw new ApiClientError(`请求超时（${Math.round(timeoutMs / 1000)}秒无响应）`, 'REQUEST_TIMEOUT');
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', abortFromExternalSignal);
  }

  let payload: ProxyResponse<T> | null = null;
  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError(`代理响应解析失败：HTTP ${response.status}`, 'INVALID_PROXY_RESPONSE');
  }

  if (!response.ok || !payload.ok) {
    const error = payload && payload.ok === false ? payload.error : null;
    throw new ApiClientError(error?.message || `代理请求失败：HTTP ${response.status}`, error?.code || 'PROXY_ERROR');
  }

  return payload.data;
}

export function proxyOpenRouterChat(apiKey: string, body: unknown, options?: ApiClientOptions): Promise<OpenRouterChatResponse> {
  return callProxy('/api/openrouter/chat', apiKey, body, options);
}

export function proxyRunningHubRun(apiKey: string, body: unknown, options?: ApiClientOptions): Promise<RunningHubProxyResponse> {
  return callProxy('/api/runninghub/run', apiKey, body, options);
}

export function proxyRunningHubOutputs(apiKey: string, taskId: string, options?: ApiClientOptions): Promise<RunningHubProxyResponse> {
  return callProxy('/api/runninghub/outputs', apiKey, { taskId }, options);
}

export function proxyMimoTTS(apiKey: string, body: unknown, options?: ApiClientOptions): Promise<MimoTTSResponse> {
  return callProxy('/api/mimo/tts', apiKey, body, options);
}

export function proxyMimoChat(apiKey: string, body: unknown, options?: ApiClientOptions): Promise<ChatCompletionResponse> {
  return callProxy('/api/mimo/chat', apiKey, body, options);
}

export function proxyTextChat(keys: ApiKeys, body: Record<string, unknown>, options?: ApiClientOptions): Promise<ChatCompletionResponse> {
  if (keys.textProvider === 'openRouter') {
    return proxyOpenRouterChat(keys.openRouter, {
      ...body,
      model: keys.openRouterModel || DEFAULT_OPENROUTER_MODEL
    }, options);
  }

  const { max_tokens: maxTokens, ...rest } = body;
  return proxyMimoChat(keys.mimo, {
    ...rest,
    model: MIMO_TEXT_MODEL,
    max_completion_tokens: typeof maxTokens === 'number' ? maxTokens : 10000
  }, options);
}

export function getMissingApiKeyMessage(keys: ApiKeys): string | null {
  if (keys.textProvider === 'openRouter' && !keys.openRouter) return '未配置 OpenRouter API Key，角色文案将使用本地兜底。';
  if (keys.textProvider === 'mimo' && !keys.mimo) return '未配置 MiMo API Key，角色文案将使用本地兜底。';
  if (!keys.runningHub) return '未配置 RunningHub API Key，立绘和动态化会缺失。';
  if (!keys.mimo) return '未配置 MiMo API Key，语音会缺失。';
  return null;
}
