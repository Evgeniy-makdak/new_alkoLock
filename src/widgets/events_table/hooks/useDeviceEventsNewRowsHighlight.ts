import { useEffect, useRef, useState } from 'react';

import type { IDeviceAction } from '@shared/types/BaseQueryTypes';

/** Длительность подсветки строк с только что пришедшими событиями (мс). */
export const NEW_DEVICE_EVENT_HIGHLIGHT_MS = 5000;

/**
 * Сравнивает текущую страницу результатов с предыдущим снимком при авто-рефетче (refetchInterval).
 * Первый успешный ответ после смены фильтров/страницы — только базовая линия, без подсветки.
 */
export function useDeviceEventsNewRowsHighlight(
  content: IDeviceAction[] | undefined,
  baselineKey: string,
  isLoading: boolean,
) {
  const prevBaselineKeyRef = useRef<string | null>(null);
  const prevIdsRef = useRef<Set<string> | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!content || !Array.isArray(content)) return;

    const ids = content.map((item) => String(item.id));
    const idSet = new Set(ids);

    if (prevBaselineKeyRef.current !== baselineKey) {
      prevBaselineKeyRef.current = baselineKey;
      prevIdsRef.current = new Set(idSet);
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
      setHighlightedIds(new Set());
      return;
    }

    const prev = prevIdsRef.current;
    if (!prev) {
      prevIdsRef.current = new Set(idSet);
      return;
    }

    const newlyArrived = ids.filter((id) => !prev.has(id));
    prevIdsRef.current = new Set(idSet);

    if (newlyArrived.length === 0) return;

    setHighlightedIds((old) => {
      const next = new Set(old);
      for (const id of newlyArrived) next.add(id);
      return next;
    });

    for (const id of newlyArrived) {
      const existing = timersRef.current.get(id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setHighlightedIds((old) => {
          const next = new Set(old);
          next.delete(id);
          return next;
        });
      }, NEW_DEVICE_EVENT_HIGHLIGHT_MS);
      timersRef.current.set(id, timer);
    }
  }, [content, baselineKey, isLoading]);

  return highlightedIds;
}
