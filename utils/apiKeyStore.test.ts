import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import {
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_TEXT_PROVIDER,
  clearApiKeys,
  getApiCapabilities,
  loadApiKeys,
  saveApiKeys
} from './apiKeyStore';

type WindowWithStorage = {
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
};

const originalWindow = globalThis.window;
let storage: Record<string, string>;

beforeEach(() => {
  storage = {};
  const testWindow: WindowWithStorage = {
    localStorage: {
      getItem: (key) => storage[key] ?? null,
      setItem: (key, value) => {
        storage[key] = value;
      },
      removeItem: (key) => {
        delete storage[key];
      }
    }
  };

  Object.defineProperty(globalThis, 'window', {
    value: testWindow,
    configurable: true
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true
  });
});

test('loadApiKeys 将旧 miniMax 本地配置迁移为 mimo 字段', () => {
  storage['diceLegend.apiKeys.v1'] = JSON.stringify({
    openRouter: ' openrouter-key ',
    runningHub: ' runninghub-key ',
    miniMax: ' old-minimax-key '
  });

  const keys = loadApiKeys();

  assert.deepEqual(keys, {
    openRouter: 'openrouter-key',
    openRouterModel: DEFAULT_OPENROUTER_MODEL,
    runningHub: 'runninghub-key',
    mimo: 'old-minimax-key',
    mimoVoice: '',
    textProvider: DEFAULT_TEXT_PROVIDER
  });
  assert.equal(keys.textProvider, 'mimo');
  assert.equal(getApiCapabilities(keys).mimo, true);
  assert.equal(getApiCapabilities(keys).text, true);
});

test('saveApiKeys 只保存新的 mimo 字段并清理旧字段', () => {
  const saved = saveApiKeys({
    openRouter: 'openrouter-key',
    openRouterModel: '',
    runningHub: 'runninghub-key',
    mimo: 'mimo-key',
    mimoVoice: 'official-voice-key',
    textProvider: 'openRouter'
  });

  assert.deepEqual(saved, {
    openRouter: 'openrouter-key',
    openRouterModel: DEFAULT_OPENROUTER_MODEL,
    runningHub: 'runninghub-key',
    mimo: 'mimo-key',
    mimoVoice: 'official-voice-key',
    textProvider: 'openRouter'
  });
  assert.deepEqual(JSON.parse(storage['diceLegend.apiKeys.v1']), saved);
  assert.equal('miniMax' in JSON.parse(storage['diceLegend.apiKeys.v1']), false);
});

test('clearApiKeys 清除本地配置并返回空 MiMo 配置', () => {
  storage['diceLegend.apiKeys.v1'] = JSON.stringify({ mimo: 'mimo-key' });

  const keys = clearApiKeys();

  assert.equal(storage['diceLegend.apiKeys.v1'], undefined);
  assert.equal(keys.mimo, '');
  assert.equal(keys.mimoVoice, '');
  assert.equal(getApiCapabilities(keys).mimo, false);
  assert.equal(getApiCapabilities(keys).text, false);
});

test('getApiCapabilities 根据文案供应商切换文案能力', () => {
  assert.equal(getApiCapabilities({
    openRouter: 'openrouter-key',
    openRouterModel: DEFAULT_OPENROUTER_MODEL,
    runningHub: '',
    mimo: '',
    mimoVoice: '',
    textProvider: 'openRouter'
  }).text, true);

  assert.equal(getApiCapabilities({
    openRouter: 'openrouter-key',
    openRouterModel: DEFAULT_OPENROUTER_MODEL,
    runningHub: '',
    mimo: '',
    mimoVoice: '',
    textProvider: 'mimo'
  }).text, false);
});

test('getApiCapabilities 根据文案供应商切换语音 Key 来源', () => {
  assert.equal(getApiCapabilities({
    openRouter: 'openrouter-key',
    openRouterModel: DEFAULT_OPENROUTER_MODEL,
    runningHub: '',
    mimo: '',
    mimoVoice: 'official-voice-key',
    textProvider: 'openRouter'
  }).mimo, true);

  assert.equal(getApiCapabilities({
    openRouter: 'openrouter-key',
    openRouterModel: DEFAULT_OPENROUTER_MODEL,
    runningHub: '',
    mimo: 'token-plan-key',
    mimoVoice: '',
    textProvider: 'openRouter'
  }).mimo, false);
});
