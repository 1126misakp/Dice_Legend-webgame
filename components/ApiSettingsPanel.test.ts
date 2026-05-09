import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isOpenRouterSettingDisabled } from './ApiSettingsPanel';

test('选择 MiMo 文案供应商时 OpenRouter 设置禁用', () => {
  assert.equal(isOpenRouterSettingDisabled('mimo'), true);
});

test('选择 OpenRouter 文案供应商时 OpenRouter 设置可编辑', () => {
  assert.equal(isOpenRouterSettingDisabled('openRouter'), false);
});
