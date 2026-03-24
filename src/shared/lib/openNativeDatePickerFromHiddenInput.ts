/**
 * Открывает нативный календарь для скрытого <input type="date">.
 * Не очищает value (важно для контролируемых инпутов в React).
 *
 * На Android при первом открытии с пустым value часто приходит ложный `change` с «сегодня»
 * и пикер сразу закрывается — такие события в первые ~280ms гасим (stopPropagation + откат value),
 * чтобы React не обновил стейт.
 *
 * Скрытый input остаётся «открытым» до реального выбора (change после окна) или cancel;
 * при сбросе фильтров вызывается closeNativeDatePickerSession() или событие resetFilters.
 */

let activeTeardown: (() => void) | null = null;

export function closeNativeDatePickerSession(): void {
  const fn = activeTeardown;
  activeTeardown = null;
  fn?.();
}

if (typeof window !== 'undefined') {
  window.addEventListener('resetFilters', () => closeNativeDatePickerSession());
}

const SPURIOUS_CHANGE_MS = 280;

export function openNativeDatePickerFromHiddenInput(input: HTMLInputElement | null): void {
  closeNativeDatePickerSession();
  if (!input) return;

  const openedAt = performance.now();
  const valueBeforeOpen = input.value;

  const clearPickerStyles = () => {
    input.style.display = 'none';
    input.style.position = '';
    input.style.top = '';
    input.style.left = '';
    input.style.transform = '';
    input.style.zIndex = '';
    input.style.opacity = '';
    input.style.width = '';
    input.style.height = '';
    input.style.pointerEvents = '';
  };

  input.style.display = 'block';
  input.style.position = 'fixed';
  input.style.top = '50%';
  input.style.left = '50%';
  input.style.transform = 'translate(-50%, -50%)';
  input.style.zIndex = '2147483646';
  input.style.opacity = '0.02';
  input.style.width = '120px';
  input.style.height = '48px';
  input.style.pointerEvents = 'auto';

  const teardown = () => {
    input.removeEventListener('change', onChange);
    input.removeEventListener('cancel', onCancel);
    clearPickerStyles();
  };

  const onChange = (e: Event) => {
    if (performance.now() - openedAt < SPURIOUS_CHANGE_MS) {
      e.stopPropagation();
      e.preventDefault();
      input.value = valueBeforeOpen;
      return;
    }
    activeTeardown = null;
    input.removeEventListener('change', onChange);
    input.removeEventListener('cancel', onCancel);
    setTimeout(clearPickerStyles, 0);
  };

  const onCancel = () => {
    closeNativeDatePickerSession();
  };

  input.addEventListener('change', onChange);
  input.addEventListener('cancel', onCancel);

  activeTeardown = () => {
    teardown();
  };

  const open = () => {
    const coarsePointer =
      typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

    if (coarsePointer) {
      input.focus({ preventScroll: true });
      input.click();
      return;
    }

    try {
      if (typeof input.showPicker === 'function') {
        void input.showPicker();
      } else {
        input.focus({ preventScroll: true });
        input.click();
      }
    } catch {
      input.focus({ preventScroll: true });
      input.click();
    }
  };

  open();
}
