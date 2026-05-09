/// <reference types="@cloudflare/workers-types" />

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import worker, { type Env } from './index';

type FetchRecord = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

type ProxyTestBody = {
  ok: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

const originalFetch = globalThis.fetch;
const originalConsoleWarn = console.warn;
const jsonHeaders = { 'Content-Type': 'application/json' };

beforeEach(() => {
  console.warn = () => undefined;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.warn = originalConsoleWarn;
});

function createEnv(): Env {
  return {
    ASSETS: {
      fetch: async () => new Response('asset')
    } as unknown as Fetcher
  };
}

async function callWorker(path: string, init: RequestInit = {}) {
  const request = new Request(`https://dice.example${path}`, init);
  const response = await worker.fetch(request, createEnv(), {} as ExecutionContext);
  const body = await response.json() as ProxyTestBody;
  return { response, body };
}

function postJson(body: unknown, apiKey = 'test-key'): RequestInit {
  const headers: Record<string, string> = { ...jsonHeaders };
  if (apiKey) headers['X-User-Api-Key'] = apiKey;

  return {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  };
}

function mockUpstream(response: Response, records: FetchRecord[] = []) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    records.push({ input, init });
    return response;
  }) as typeof fetch;
  return records;
}

function mockUnexpectedUpstream(records: FetchRecord[] = []) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    records.push({ input, init });
    throw new Error('不应调用上游接口');
  }) as typeof fetch;
  return records;
}

const validOpenRouterBody = {
  model: 'x-ai/grok-4.1-fast',
  messages: [{ role: 'user', content: 'hello' }],
  max_tokens: 100,
  temperature: 0.8
};

const validRunningHubRunBody = {
  webappId: 'webapp-1',
  nodeInfoList: [{ nodeId: '1', fieldName: 'text', fieldValue: 'prompt' }]
};

const validMimoTTSBody = {
  model: 'mimo-v2.5-tts-voicedesign',
  messages: [
    { role: 'user', content: '清澈的少女声线，语速从容清晰' },
    { role: 'assistant', content: '命运选中了我。' }
  ],
  stream: false,
  audio: { format: 'wav' }
};

const validMimoChatBody = {
  model: 'mimo-v2.5-pro',
  messages: [
    { role: 'system', content: '你是专业的游戏文案策划。' },
    { role: 'user', content: '生成一个角色设定。' }
  ],
  max_completion_tokens: 1000,
  temperature: 0.8
};

test('未知 /api/* 返回 NOT_FOUND', async () => {
  const { response, body } = await callWorker('/api/unknown', postJson({}));

  assert.equal(response.status, 404);
  assert.deepEqual(body, {
    ok: false,
    error: { code: 'NOT_FOUND', message: '未知的代理接口' }
  });
});

test('非 POST 请求返回 METHOD_NOT_ALLOWED', async () => {
  const { response, body } = await callWorker('/api/openrouter/chat', { method: 'GET' });

  assert.equal(response.status, 405);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'METHOD_NOT_ALLOWED');
});

test('非 JSON 请求返回 UNSUPPORTED_MEDIA_TYPE', async () => {
  const { response, body } = await callWorker('/api/openrouter/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'X-User-Api-Key': 'test-key' },
    body: 'hello'
  });

  assert.equal(response.status, 415);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
});

test('非法 JSON 返回 INVALID_JSON', async () => {
  const { response, body } = await callWorker('/api/openrouter/chat', {
    method: 'POST',
    headers: { ...jsonHeaders, 'X-User-Api-Key': 'test-key' },
    body: '{'
  });

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'INVALID_JSON');
});

test('无 Key 返回 MISSING_API_KEY', async () => {
  const { response, body } = await callWorker('/api/openrouter/chat', postJson({}, ''));

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'MISSING_API_KEY');
});

test('无 Content-Length 但实际超大 body 返回 PAYLOAD_TOO_LARGE', async () => {
  const oversizedBody = JSON.stringify({ value: 'x'.repeat(65 * 1024) });
  const { response, body } = await callWorker('/api/openrouter/chat', {
    method: 'POST',
    headers: { ...jsonHeaders, 'X-User-Api-Key': 'test-key' },
    body: oversizedBody
  });

  assert.equal(response.status, 413);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
});

test('OpenRouter 代理只转发白名单字段和用户 Key', async () => {
  const records = mockUpstream(
    Response.json({ choices: [{ message: { content: 'ok' } }] }, { status: 200 })
  );

  const { response, body } = await callWorker('/api/openrouter/chat', postJson({
    ...validOpenRouterBody,
    injected: 'should-not-forward'
  }, 'openrouter-key'));

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(records.length, 1);
  assert.equal(records[0].input, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal((records[0].init?.headers as Record<string, string>).Authorization, 'Bearer openrouter-key');
  assert.deepEqual(JSON.parse(records[0].init?.body as string), {
    model: 'x-ai/grok-4.1-fast',
    messages: [{ role: 'user', content: 'hello' }],
    max_tokens: 100,
    temperature: 0.8
  });
});

test('RunningHub run 代理把 Key 放入上游请求体', async () => {
  const records = mockUpstream(Response.json({ code: 0, data: { taskId: 'task-1' } }, { status: 200 }));

  const { response, body } = await callWorker('/api/runninghub/run', postJson({
    ...validRunningHubRunBody,
    other: 'should-not-forward'
  }, 'runninghub-key'));

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.deepEqual(JSON.parse(records[0].init?.body as string), {
    webappId: 'webapp-1',
    apiKey: 'runninghub-key',
    nodeInfoList: [{ nodeId: '1', fieldName: 'text', fieldValue: 'prompt' }]
  });
});

test('上游 JSON 错误返回统一 UPSTREAM_ERROR', async () => {
  mockUpstream(Response.json({ error: { message: '上游拒绝请求' } }, { status: 401 }));

  const { response, body } = await callWorker('/api/openrouter/chat', postJson(validOpenRouterBody));

  assert.equal(response.status, 401);
  assert.deepEqual(body, {
    ok: false,
    error: { code: 'UPSTREAM_ERROR', message: '上游拒绝请求' }
  });
});

test('上游文本错误返回统一 UPSTREAM_ERROR', async () => {
  mockUpstream(new Response('bad gateway', {
    status: 502,
    headers: { 'Content-Type': 'text/plain' }
  }));

  const { response, body } = await callWorker('/api/mimo/tts', postJson(validMimoTTSBody));

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    ok: false,
    error: { code: 'UPSTREAM_ERROR', message: 'bad gateway' }
  });
});

test('MiMo TTS 代理使用 Token Plan 专属域名并只转发白名单字段', async () => {
  const records = mockUpstream(Response.json({
    choices: [{ message: { audio: { data: 'abcd' } } }]
  }, { status: 200 }));

  const { response, body } = await callWorker('/api/mimo/tts', postJson({
    ...validMimoTTSBody,
    temperature: 0.7,
    injected: 'should-not-forward'
  }, 'mimo-key'));

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(records[0].input, 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions');
  assert.equal((records[0].init?.headers as Record<string, string>)['api-key'], 'mimo-key');
  assert.deepEqual(JSON.parse(records[0].init?.body as string), {
    model: 'mimo-v2.5-tts-voicedesign',
    messages: [
      { role: 'user', content: '清澈的少女声线，语速从容清晰' },
      { role: 'assistant', content: '命运选中了我。' }
    ],
    stream: false,
    audio: { format: 'wav' }
  });
});

test('MiMo 官方 TTS 代理使用官方域名并只转发白名单字段', async () => {
  const records = mockUpstream(Response.json({
    choices: [{ message: { audio: { data: 'base64-wav' } } }]
  }, { status: 200 }));

  const { response, body } = await callWorker('/api/mimo/tts-official', postJson({
    ...validMimoTTSBody,
    injected: 'should-not-forward'
  }, 'official-mimo-key'));

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(records[0].input, 'https://api.xiaomimimo.com/v1/chat/completions');
  assert.equal((records[0].init?.headers as Record<string, string>)['api-key'], 'official-mimo-key');
  assert.deepEqual(JSON.parse(records[0].init?.body as string), validMimoTTSBody);
});

test('MiMo 文案代理使用 Token Plan 专属域名和小写模型 ID', async () => {
  const records = mockUpstream(Response.json({
    choices: [{ message: { content: '{"name":"测试角色"}' } }]
  }, { status: 200 }));

  const { response, body } = await callWorker('/api/mimo/chat', postJson({
    ...validMimoChatBody,
    max_tokens: 9999,
    injected: 'should-not-forward'
  }, 'tp-mimo-key'));

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(records[0].input, 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions');
  assert.equal((records[0].init?.headers as Record<string, string>)['api-key'], 'tp-mimo-key');
  assert.deepEqual(JSON.parse(records[0].init?.body as string), validMimoChatBody);
});

test('OpenRouter payload 类型错误返回 INVALID_PAYLOAD 且不触发上游', async () => {
  const records = mockUnexpectedUpstream();
  const { response, body } = await callWorker('/api/openrouter/chat', postJson({
    model: '',
    messages: []
  }));

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'INVALID_PAYLOAD');
  assert.equal(records.length, 0);
});

test('OpenRouter 多模态 payload 校验通过并转发', async () => {
  const records = mockUpstream(Response.json({ choices: [] }, { status: 200 }));

  const { response, body } = await callWorker('/api/openrouter/chat', postJson({
    model: 'x-ai/grok-4.1-fast',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: 'https://example.com/image.png' } },
        { type: 'text', text: '描述这张图' }
      ]
    }]
  }));

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(records.length, 1);
});

test('RunningHub run 缺必填字段返回 INVALID_PAYLOAD 且不触发上游', async () => {
  const records = mockUnexpectedUpstream();
  const { response, body } = await callWorker('/api/runninghub/run', postJson({
    webappId: 'webapp-1',
    nodeInfoList: [{ nodeId: '1', fieldName: 'text' }]
  }));

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'INVALID_PAYLOAD');
  assert.equal(records.length, 0);
});

test('RunningHub outputs 缺 taskId 返回 INVALID_PAYLOAD 且不触发上游', async () => {
  const records = mockUnexpectedUpstream();
  const { response, body } = await callWorker('/api/runninghub/outputs', postJson({ taskId: '' }));

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'INVALID_PAYLOAD');
  assert.equal(records.length, 0);
});

test('MiMo TTS 缺音频格式返回 INVALID_PAYLOAD 且不触发上游', async () => {
  const records = mockUnexpectedUpstream();
  const { response, body } = await callWorker('/api/mimo/tts', postJson({
    model: 'mimo-v2.5-tts-voicedesign',
    messages: validMimoTTSBody.messages,
    audio: {}
  }));

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'INVALID_PAYLOAD');
  assert.equal(records.length, 0);
});

test('MiMo TTS 缺 assistant 台词返回 INVALID_PAYLOAD 且不触发上游', async () => {
  const records = mockUnexpectedUpstream();
  const { response, body } = await callWorker('/api/mimo/tts', postJson({
    model: 'mimo-v2.5-tts-voicedesign',
    messages: [{ role: 'user', content: '清澈的少女声线' }],
    stream: false,
    audio: { format: 'wav' }
  }));

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'INVALID_PAYLOAD');
  assert.equal(records.length, 0);
});

test('MiMo 文案代理缺 max_completion_tokens 返回 INVALID_PAYLOAD 且不触发上游', async () => {
  const records = mockUnexpectedUpstream();
  const { response, body } = await callWorker('/api/mimo/chat', postJson({
    model: 'mimo-v2.5-pro',
    messages: validMimoChatBody.messages,
    temperature: 0.8
  }));

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'INVALID_PAYLOAD');
  assert.equal(records.length, 0);
});
