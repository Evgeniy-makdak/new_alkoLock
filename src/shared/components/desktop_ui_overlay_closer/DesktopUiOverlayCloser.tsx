import { useEffect } from 'react';

import {
  DESKTOP_CLOSE_UI_OVERLAYS_EVENT,
  dispatchDesktopCloseUiOverlays,
  isDesktopAutocompletePopperTarget,
  isElectronDesktopShell,
} from '@shared/lib/desktopCloseUiOverlays';

/** Electron: закрытие выпадающих списков при клике вне popper (в т.ч. шапка/меню через IPC). */
export function DesktopUiOverlayCloser(): null {
  useEffect(() => {
    if (!isElectronDesktopShell()) return;

    const notify = () => dispatchDesktopCloseUiOverlays();

    const unsubscribeIpc = window.alcolockDesktop?.onCloseUiOverlays?.(notify);

    const onMouseDownCapture = (event: MouseEvent) => {
      if (isDesktopAutocompletePopperTarget(event.target)) return;
      notify();
    };

    document.addEventListener('mousedown', onMouseDownCapture, true);
    window.addEventListener('blur', notify);

    return () => {
      unsubscribeIpc?.();
      document.removeEventListener('mousedown', onMouseDownCapture, true);
      window.removeEventListener('blur', notify);
    };
  }, []);

  return null;
}

export { DESKTOP_CLOSE_UI_OVERLAYS_EVENT };
