export const DESKTOP_CLOSE_UI_OVERLAYS_EVENT = 'desktop:close-ui-overlays';

export function dispatchDesktopCloseUiOverlays(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DESKTOP_CLOSE_UI_OVERLAYS_EVENT));
}

/** Клик по открытому списку Autocomplete — не закрываем (выбор пункта). */
export function isDesktopAutocompletePopperTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('.MuiAutocomplete-popper') ||
    target.closest('.MuiAutocomplete-listbox') ||
    target.closest('.MuiPopper-root.MuiAutocomplete-popper'),
  );
}

export function isElectronDesktopShell(): boolean {
  return typeof window !== 'undefined' && Boolean(window.alcolockDesktop);
}
