export const getAuraCanvasSize = (width: number, height: number, pixelRatio: number) => ({
  drawingBufferWidth: Math.floor(width * pixelRatio),
  drawingBufferHeight: Math.floor(height * pixelRatio),
  cssWidth: width,
  cssHeight: height
});

export const getAuraCameraBounds = (width: number, height: number, viewportScale = 1) => {
  const aspect = width / height;

  return {
    left: -aspect * viewportScale,
    right: aspect * viewportScale,
    top: viewportScale,
    bottom: -viewportScale
  };
};
