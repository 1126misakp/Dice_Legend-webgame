import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAuraCameraBounds, getAuraCanvasSize } from './threeAuraCanvas';

test('高 DPR 下 canvas CSS 尺寸保持等于挂载容器尺寸', () => {
  const size = getAuraCanvasSize(320, 80, 1.8);

  assert.equal(size.drawingBufferWidth, 576);
  assert.equal(size.drawingBufferHeight, 144);
  assert.equal(size.cssWidth, 320);
  assert.equal(size.cssHeight, 80);
});

test('放大显示框时相机视域同步扩大以保持光环本体尺寸', () => {
  const bounds = getAuraCameraBounds(800, 250, 1.6);

  assert.equal(bounds.top, 1.6);
  assert.equal(bounds.bottom, -1.6);
  assert.ok(Math.abs(bounds.left + 5.12) < 0.0001);
  assert.ok(Math.abs(bounds.right - 5.12) < 0.0001);
});
