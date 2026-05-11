import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAuraCanvasSize } from './threeAuraCanvas';

test('高 DPR 下 canvas CSS 尺寸保持等于挂载容器尺寸', () => {
  const size = getAuraCanvasSize(320, 80, 1.8);

  assert.equal(size.drawingBufferWidth, 576);
  assert.equal(size.drawingBufferHeight, 144);
  assert.equal(size.cssWidth, 320);
  assert.equal(size.cssHeight, 80);
});
