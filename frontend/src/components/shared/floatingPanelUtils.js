const VIEWPORT_PADDING = 16;

export function clampPointToViewport(x, y, width, height) {
  return {
    left: Math.min(window.innerWidth - width - VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, x)),
    top: Math.min(window.innerHeight - height - VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, y)),
  };
}
