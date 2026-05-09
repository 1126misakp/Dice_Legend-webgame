import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isKeyFieldDisabled, isOpenRouterSettingDisabled } from './ApiSettingsPanel';

test('选择 MiMo 文案供应商时 OpenRouter 设置禁用', () => {
  assert.equal(isOpenRouterSettingDisabled('mimo'), true);
});

test('选择 OpenRouter 文案供应商时 OpenRouter 设置可编辑', () => {
  assert.equal(isOpenRouterSettingDisabled('openRouter'), false);
});

test('不同文案供应商只启用当前生效的语音 Key', () => {
  assert.equal(isKeyFieldDisabled('mimo', 'mimo'), false);
  assert.equal(isKeyFieldDisabled('mimoVoice', 'mimo'), true);
  assert.equal(isKeyFieldDisabled('mimo', 'openRouter'), true);
  assert.equal(isKeyFieldDisabled('mimoVoice', 'openRouter'), false);
});
