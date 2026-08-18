/** Эффективный layout-viewport с учётом zoom (Electron «Вид», pinch, visualViewport). */
export function getLayoutViewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  const innerW = Math.max(1, window.innerWidth || 0);
  const innerH = Math.max(1, window.innerHeight || 0);

  const vv = window.visualViewport;
  const vvW = vv && Number.isFinite(vv.width) ? vv.width : 0;
  const vvH = vv && Number.isFinite(vv.height) ? vv.height : 0;
  const scale = vv && Number.isFinite(vv.scale) && vv.scale > 0 ? vv.scale : 1;
  const offsetTop = vv && Number.isFinite(vv.offsetTop) ? vv.offsetTop : 0;
  const offsetLeft = vv && Number.isFinite(vv.offsetLeft) ? vv.offsetLeft : 0;

  const isZoomOrObscured =
    Math.abs(scale - 1) > 0.02 || offsetTop > 1 || offsetLeft > 1;

  // Pinch-zoom / клавиатура: visualViewport меньше layout — клампим по видимой области.
  if (isZoomOrObscured && vvW >= 2 && vvH >= 2) {
    return {
      width: Math.max(1, Math.round(vvW)),
      height: Math.max(1, Math.round(vvH)),
    };
  }

  // Обычный desktop: visualViewport на первом кадре иногда занижен (без zoom/offset).
  // Кламп панели по нему даёт «приплюснутые» 520×531 вместо 520×660 и уже не отрастает.
  return {
    width: Math.max(1, Math.round(Math.max(innerW, vvW))),
    height: Math.max(1, Math.round(Math.max(innerH, vvH))),
  };
}
