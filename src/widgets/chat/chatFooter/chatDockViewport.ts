/** Эффективный layout-viewport с учётом zoom (Electron «Вид», pinch, visualViewport). */
export function getLayoutViewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  const vv = window.visualViewport;
  if (vv) {
    return {
      width: Math.max(1, Math.round(vv.width)),
      height: Math.max(1, Math.round(vv.height)),
    };
  }

  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  };
}
