import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ApiKeys } from './apiKeyStore';
import { proxyTextChat } from './apiClient';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
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
