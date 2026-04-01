/**
 * Шутка: мелкий «призрак» на странице «События» (блуждает, пока не кликнуть).
 * По клику — «взрыв» и стекающие вниз капли; затем шутка заканчивается до следующего захода на страницу.
 *
 * **`EVENTS_PAGE_GHOST_PRANK_ENABLED`** — значение по умолчанию, если в `localStorage` ещё не сохраняли выбор.
 *
 * **Переключение в рантайме:** **Ctrl+Alt+Shift+B** или **Ctrl+Alt+Shift+H** на «События» (в `localStorage`).
 *
 * **`EVENTS_GHOST_PRANK_IDLE_DELAY_MS`** — пауза «как скринсейвер»: после последней активности в окне до появления
 * призрака (только на странице «События», пока компонент смонтирован). `0` — показ сразу, максимум — 1 час
 * (см. `EVENTS_GHOST_PRANK_IDLE_DELAY_MAX_MS`).
 *
 * Ключ `alcolock.eventsGhostPrank.enabled` используется только этим модулем и `EventsGhostPrank`.
 * При `appStore.logout()` записывается `true` для следующей сессии (см. `AppStore.ts`).
 */
export const EVENTS_PAGE_GHOST_PRANK_ENABLED = true;

/** Задержка появления призрака после простоя, мс. `5400000` = 1 ч 30 мин — будет обрезано до максимума. */
export const EVENTS_GHOST_PRANK_IDLE_DELAY_MS = 2 * 60 * 1000;

/** Допустимый диапазон задержки (мс): от 0 (сразу) до 1 часа включительно. */
export const EVENTS_GHOST_PRANK_IDLE_DELAY_MIN_MS = 0;
export const EVENTS_GHOST_PRANK_IDLE_DELAY_MAX_MS = 60 * 60 * 1000;

const STORAGE_KEY = 'alcolock.eventsGhostPrank.enabled';

/** Комбинация для переключения (документация / подсказки). */
export const EVENTS_GHOST_PRANK_TOGGLE_SHORTCUT = 'Ctrl+Alt+Shift+B' as const;

export function clampGhostPrankIdleDelayMs(value: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return EVENTS_GHOST_PRANK_IDLE_DELAY_MIN_MS;
  return Math.min(
    EVENTS_GHOST_PRANK_IDLE_DELAY_MAX_MS,
    Math.max(EVENTS_GHOST_PRANK_IDLE_DELAY_MIN_MS, n),
  );
}

/** Эффективная задержка простоя с учётом границ диапазона. */
export function getGhostPrankIdleDelayMs(): number {
  return clampGhostPrankIdleDelayMs(EVENTS_GHOST_PRANK_IDLE_DELAY_MS);
}

export function readGhostPrankRuntimeEnabled(): boolean {
  if (typeof window === 'undefined') return EVENTS_PAGE_GHOST_PRANK_ENABLED;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return EVENTS_PAGE_GHOST_PRANK_ENABLED;
}

export function writeGhostPrankRuntimeEnabled(value: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, String(value));
}
