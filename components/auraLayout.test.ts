import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getButtonAuraFrameClass, isOverflowAuraRarity } from './auraLayout';

test('SSR 和 UR 使用溢出光环', () => {
  assert.equal(isOverflowAuraRarity('SSR'), true);
  assert.equal(isOverflowAuraRarity('UR'), true);
  assert.equal(isOverflowAuraRarity('SR'), false);
  assert.equal(isOverflowAuraRarity('R'), false);
});

test('按钮外光环以按钮中心为锚点', () => {
  const className = getButtonAuraFrameClass('SSR', 'rewardChoice');

  assert.match(className, /left-1\/2/);
  assert.match(className, /-translate-x-1\/2/);
  assert.match(className, /w-\[calc\(100%\+8rem\)\]/);
  assert.match(className, /md:h-52/);
  assert.doesNotMatch(className, /-inset-x-16/);
});

test('底部召唤按钮光环扩大到能容纳远端轨迹', () => {
  const className = getButtonAuraFrameClass('UR', 'bottomMain');

  assert.match(className, /left-1\/2/);
  assert.match(className, /w-\[calc\(100%\+14rem\)\]/);
  assert.match(className, /md:h-64/);
  assert.doesNotMatch(className, /right-/);
});
