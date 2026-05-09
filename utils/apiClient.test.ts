import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ApiKeys } from './apiKeyStore';
import { proxyMimoTTS, proxyTextChat } from './apiClient';

const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalSetTimeout;
});

const baseKeys: ApiKeys = {
  openRouter: '',
  openRouterModel: 'x-ai/grok-4.1-fast',
  runningHub: '',
  mimo: 'tp-mimo-key',
  textProvider: 'mimo'
};

test('proxyTextChat 使用 MiMo Token Plan 小写模型 ID', async () => {
  const requests: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ input, init });
    return Response.json({ ok: true, data: { choices: [{ message: { content: 'ok' } }] } });
  }) as typeof fetch;

  await proxyTextChat(baseKeys, {
    messages: [{ role: 'user', content: '生成一个角色' }],
    max_tokens: 1200,
    temperature: 0.8
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].input, '/api/mimo/chat');
  assert.equal((requests[0].init?.headers as Record<string, string>)['X-User-Api-Key'], 'tp-mimo-key');
  assert.deepEqual(JSON.parse(requests[0].init?.body as string), {
    messages: [{ role: 'user', content: '生成一个角色' }],
    temperature: 0.8,
    model: 'mimo-v2.5-pro',
    max_completion_tokens: 1200
  });
});

test('proxyTextChat 调用 MiMo 文案时给慢响应保留 120 秒超时', async () => {
  const timeoutValues: number[] = [];
  globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    timeoutValues.push(Number(timeout));
    return originalSetTimeout(handler, timeout, ...args);
  }) as typeof setTimeout;
  globalThis.fetch = (async () => Response.json({
    ok: true,
    data: { choices: [{ message: { content: 'ok' } }] }
  })) as typeof fetch;

  await proxyTextChat(baseKeys, {
    messages: [{ role: 'user', content: '生成一个角色' }],
    max_tokens: 1200,
    temperature: 0.8
  });

  assert.deepEqual(timeoutValues, [120000]);
});

test('proxyMimoTTS 给语音合成保留 120 秒超时', async () => {
  const timeoutValues: number[] = [];
  globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    timeoutValues.push(Number(timeout));
    return originalSetTimeout(handler, timeout, ...args);
  }) as typeof setTimeout;
  globalThis.fetch = (async () => Response.json({
    ok: true,
    data: { choices: [{ message: { audio: { data: 'base64-wav' } } }] }
  })) as typeof fetch;

  await proxyMimoTTS('tp-mimo-key', {
    model: 'mimo-v2.5-tts-voicedesign',
    messages: [
      { role: 'user', content: '清澈的少女声线' },
      { role: 'assistant', content: '命运选中了我。' }
    ],
    audio: { format: 'wav' },
    stream: false
  });

  assert.deepEqual(timeoutValues, [120000]);
});
