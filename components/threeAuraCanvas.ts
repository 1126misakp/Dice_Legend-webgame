export const getAuraCanvasSize = (width: number, height: number, pixelRatio: number) => ({
  drawingBufferWidth: Math.floor(width * pixelRatio),
  drawingBufferHeight: Math.floor(height * pixelRatio),
  cssWidth: width,
  cssHeight: height
});
