import { useEffect, useRef } from 'react';

export type NativeDateHiddenInputProps = {
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** YYYY-MM-DD или '' — синхронизация из стейта; без React `value`, иначе «Сбросить» в нативном пикере не работает. */
  syncedIso: string;
  onCommit: (iso: string) => void;
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
};

/**
 * Скрытый input type="date" для программного открытия нативного календаря.
 * Не использует контролируемый проп `value`: при `value` из React кнопка «Сбросить» в пикере
 * Android сразу откатывается к старой дате из пропса.
 */
export function NativeDateHiddenInput({
  inputRef,
  syncedIso,
  onCommit,
  className,
  style,
  'data-testid': dataTestId,
}: NativeDateHiddenInputProps) {
  const iso = syncedIso ?? '';
  const pendingValueRef = useRef('');
  const lastCommittedRef = useRef('');

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (el.value !== iso) {
      el.value = iso;
    }
    pendingValueRef.current = el.value;
    lastCommittedRef.current = iso;
  }, [iso, inputRef]);

  return (
    <input
      ref={inputRef}
      type="date"
      onChange={(e) => {
        pendingValueRef.current = e.target.value;
      }}
      onInput={(e) => {
        pendingValueRef.current = (e.target as HTMLInputElement).value;
      }}
      onBlur={(e) => {
        const next = pendingValueRef.current ?? e.target.value ?? '';
        if (next !== lastCommittedRef.current) {
          lastCommittedRef.current = next;
          onCommit(next);
        }
      }}
      className={className}
      style={style}
      aria-hidden="true"
      data-testid={dataTestId}
    />
  );
}
