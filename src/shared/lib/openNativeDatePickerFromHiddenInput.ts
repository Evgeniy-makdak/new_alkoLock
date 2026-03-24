/**
 * Открывает нативный календарь для скрытого <input type="date">.
 * Не очищает value (важно для контролируемых инпутов в React).
 * Скрывает input только после выбора даты (change) или отмены (cancel), без таймера —
 * иначе на мобильных пикер закрывается сразу и часто подставляется «сегодня».
 */
export function openNativeDatePickerFromHiddenInput(input: HTMLInputElement | null): void {
  if (!input) return;

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
  };

  input.style.display = 'block';
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  input.style.top = '0';
  input.style.width = '1px';
  input.style.height = '1px';
  input.style.opacity = '0';
  input.style.zIndex = '9999';
  input.style.transform = '';

  const finish = () => {
    clearPickerStyles();
  };

  const onChange = () => {
    input.removeEventListener('change', onChange);
    input.removeEventListener('cancel', onCancel);
    setTimeout(finish, 0);
  };

  const onCancel = () => {
    input.removeEventListener('change', onChange);
    input.removeEventListener('cancel', onCancel);
    finish();
  };

  input.addEventListener('change', onChange);
  input.addEventListener('cancel', onCancel);

  try {
    if (typeof input.showPicker === 'function') {
      void input.showPicker();
    } else {
      input.focus();
      input.click();
    }
  } catch {
    input.focus();
    input.click();
  }
}
