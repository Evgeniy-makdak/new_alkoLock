/**
 * Шутка: мелкий «призрак» на странице «События» (блуждает, пока не кликнуть).
 * По клику — «взрыв» и стекающие вниз капли; затем шутка заканчивается до следующего захода на страницу.
 *
 * **`EVENTS_PAGE_GHOST_PRANK_ENABLED`** — значение по умолчанию, если в `localStorage` ещё не сохраняли выбор.
 *
 * **Переключение в рантайме:** **Ctrl+Alt+Shift+B** или **Ctrl+Alt+Shift+H** на «События» (в `localStorage`).
 *
 * Ключ `alcolock.eventsGhostPrank.enabled` используется только этим модулем и `EventsGhostPrank`; на авторизацию, API и прочий UI не влияет.
 * При `appStore.logout()` пишется `false`. Включение — только горячими клавишами на «События» (см. `AppStore.ts`).
 */
export const EVENTS_PAGE_GHOST_PRANK_ENABLED = false;

const STORAGE_KEY = 'alcolock.eventsGhostPrank.enabled';

/** Комбинация для переключения (документация / подсказки). */
export const EVENTS_GHOST_PRANK_TOGGLE_SHORTCUT = 'Ctrl+Alt+Shift+B' as const;

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
