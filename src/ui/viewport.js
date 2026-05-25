export function getVisibleGameArea(scaleManager) {
  const gameWidth = scaleManager.gameSize.width;
  const gameHeight = scaleManager.gameSize.height;
  const parentWidth = scaleManager.parentSize?.width || gameWidth;
  const parentHeight = scaleManager.parentSize?.height || gameHeight;
  const zoom = Math.max(parentWidth / gameWidth, parentHeight / gameHeight) || 1;
  const visibleWidth = Math.min(gameWidth, parentWidth / zoom);
  const visibleHeight = Math.min(gameHeight, parentHeight / zoom);

  return {
    left: (gameWidth - visibleWidth) / 2,
    top: (gameHeight - visibleHeight) / 2,
    right: (gameWidth + visibleWidth) / 2,
    bottom: (gameHeight + visibleHeight) / 2,
    width: visibleWidth,
    height: visibleHeight,
  };
}

