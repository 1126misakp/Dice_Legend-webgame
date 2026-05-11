import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getButtonAuraFrameClass, getContainedButtonAuraClass, isOverflowAuraRarity } from './auraLayout';

test('SSR 和 UR 使用溢出光环', () => {
  assert.equal(isOverflowAuraRarity('SSR'), true);
  assert.equal(isOverflowAuraRarity('UR'), true);
  assert.equal(isOverflowAuraRarity('SR'), false);
  assert.equal(isOverflowAuraRarity('R'), false);
});

test('按钮外光环以按钮中心为锚点', () => {
  const className = getButtonAuraFrameClass('SSR', 'bottomMain');

  assert.match(className, /left-1\/2/);
  assert.match(className, /-translate-x-1\/2/);
  assert.doesNotMatch(className, /-inset-x-16/);
});

test('奖励选择抽卡特效限制在按钮内部', () => {
  const className = getContainedButtonAuraClass('SSR');

  assert.match(className, /inset-0/);
  assert.doesNotMatch(className, /-inset/);
  assert.doesNotMatch(className, /calc/);
});

test('底部召唤按钮光环不会依赖整排按钮宽度', () => {
  const className = getButtonAuraFrameClass('UR', 'bottomMain');

  assert.match(className, /left-1\/2/);
  assert.match(className, /w-\[calc\(100%\+2\.5rem\)\]/);
  assert.doesNotMatch(className, /right-/);
});
