/// <reference types="@cloudflare/workers-types" />

export interface Env {
  ASSETS: Fetcher;
}

type ProxyTarget = {
  url: string;
  buildRequest: (payload: Record<string, unknown>, apiKey: string) => RequestInit;
};

const MAX_BODY_BYTES = 64 * 1024;

const targets: Record<string, ProxyTarget> = {
  '/api/openrouter/chat': {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    buildRequest: (payload, apiKey) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(pick(payload, ['model', 'messages', 'max_tokens', 'temperature']))
    })
  },
  '/api/runninghub/run': {
    url: 'https://www.runninghub.cn/task/openapi/ai-app/run',
    buildRequest: (payload, apiKey) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webappId: payload.webappId,
        apiKey,
        nodeInfoList: payload.nodeInfoList
      })
    })
  },
  '/api/runninghub/outputs': {
    url: 'https://www.runninghub.cn/task/openapi/outputs',
    buildRequest: (payload, apiKey) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: payload.taskId,
        apiKey
      })
    })
  },
  '/api/minimax/voice-design': {
    url: 'https://api.minimaxi.com/v1/voice_design',
    buildRequest: (payload, apiKey) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(pick(payload, ['prompt', 'preview_text', 'aigc_watermark']))
    })
  },
  '/api/minimax/t2a': {
    url: 'https://api.minimaxi.com/v1/t2a_v2',
    buildRequest: (payload, apiKey) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(pick(payload, ['model', 'text', 'stream', 'voice_setting', 'audio_setting']))
    })
  }
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const target = targets[url.pathname];
    if (!target) {
      return jsonError(request, 'NOT_FOUND', '未知的代理接口', 404);
    }

    const guard = validateRequest(request);
    if (guard) return jsonError(request, guard.code, guard.message, guard.status);

    try {
      const payload = await readJsonBody(request);
      const apiKey = request.headers.get('X-User-Api-Key')?.trim() || '';

      if (!apiKey) {
        return jsonError(request, 'MISSING_API_KEY', '缺少对应的 API Key', 400);
      }

      const startedAt = Date.now();
      const upstream = await fetch(target.url, target.buildRequest(payload, apiKey));
      const contentType = upstream.headers.get('Content-Type') || '';
      const data = contentType.includes('application/json') ? await upstream.json() : await upstream.text();

      if (!upstream.ok) {
        console.warn(JSON.stringify({
          endpoint: url.pathname,
          status: upstream.status,
          durationMs: Date.now() - startedAt
        }));
        return jsonError(request, 'UPSTREAM_ERROR', normalizeUpstreamError(data, upstream.status), upstream.status);
      }

      return jsonResponse(request, { ok: true, data }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : '代理请求失败';
      return jsonError(request, 'PROXY_ERROR', message, 500);
    }
  }
};

function validateRequest(request: Request): { code: string; message: string; status: number } | null {
  if (request.method !== 'POST') {
    return { code: 'METHOD_NOT_ALLOWED', message: '只允许 POST 请求', status: 405 };
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return { code: 'UNSUPPORTED_MEDIA_TYPE', message: '只接受 application/json 请求', status: 415 };
  }

  const contentLength = Number(request.headers.get('Content-Length') || '0');
  if (contentLength > MAX_BODY_BYTES) {
    return { code: 'PAYLOAD_TOO_LARGE', message: '请求体过大', status: 413 };
  }

  const origin = request.headers.get('Origin');
  if (origin && !isSameOrigin(origin, request.url)) {
    return { code: 'FORBIDDEN_ORIGIN', message: '请求来源不被允许', status: 403 };
  }

  return null;
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    throw new Error('请求体过大');
  }
  const parsed: unknown = body ? JSON.parse(body) : {};
  if (!isRecord(parsed)) {
    throw new Error('请求体必须是 JSON 对象');
  }
  return parsed;
}

function isSameOrigin(origin: string, requestUrl: string): boolean {
  try {
    const originUrl = new URL(origin);
    const currentUrl = new URL(requestUrl);
    if (originUrl.origin === currentUrl.origin) return true;
    return originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Api-Key',
    'Access-Control-Max-Age': '86400'
  };

  if (origin && isSameOrigin(origin, request.url)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function jsonResponse(request: Request, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request)
    }
  });
}

function jsonError(request: Request, code: string, message: string, status: number): Response {
  return jsonResponse(request, { ok: false, error: { code, message } }, status);
}

function pick(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeUpstreamError(data: unknown, status: number): string {
  if (typeof data === 'string') {
    return data.slice(0, 300) || `上游接口返回 HTTP ${status}`;
  }
  if (isRecord(data)) {
    const nestedError = isRecord(data.error) ? data.error.message : null;
    const message = nestedError || data.message || data.msg;
    return typeof message === 'string' ? message : `上游接口返回 HTTP ${status}`;
  }
  return `上游接口返回 HTTP ${status}`;
}
