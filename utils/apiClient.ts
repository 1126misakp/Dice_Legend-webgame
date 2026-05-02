import { ApiKeys } from './apiKeyStore';

type ApiEndpoint =
  | '/api/openrouter/chat'
  | '/api/runninghub/run'
  | '/api/runninghub/outputs'
  | '/api/minimax/voice-design'
  | '/api/minimax/t2a';

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

export class ApiClientError extends Error {
  code: string;

  constructor(message: string, code = 'PROXY_ERROR') {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
  }
}

async function callProxy<T>(endpoint: ApiEndpoint, apiKey: string, body: unknown): Promise<T> {
  if (!apiKey.trim()) {
    throw new ApiClientError('缺少对应的 API Key', 'MISSING_API_KEY');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Api-Key': apiKey.trim()
    },
    body: JSON.stringify(body)
  });

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

export function proxyOpenRouterChat(apiKey: string, body: unknown): Promise<any> {
  return callProxy('/api/openrouter/chat', apiKey, body);
}

export function proxyRunningHubRun(apiKey: string, body: unknown): Promise<any> {
  return callProxy('/api/runninghub/run', apiKey, body);
}

export function proxyRunningHubOutputs(apiKey: string, taskId: string): Promise<any> {
  return callProxy('/api/runninghub/outputs', apiKey, { taskId });
}

export function proxyMiniMaxVoiceDesign(apiKey: string, body: unknown): Promise<any> {
  return callProxy('/api/minimax/voice-design', apiKey, body);
}

export function proxyMiniMaxT2A(apiKey: string, body: unknown): Promise<any> {
  return callProxy('/api/minimax/t2a', apiKey, body);
}

export function getMissingApiKeyMessage(keys: ApiKeys): string | null {
  if (!keys.openRouter) return '未配置 OpenRouter API Key，角色文案将使用本地兜底。';
  if (!keys.runningHub) return '未配置 RunningHub API Key，立绘和动态化会缺失。';
  if (!keys.miniMax) return '未配置 MiniMax API Key，语音会缺失。';
  return null;
}
