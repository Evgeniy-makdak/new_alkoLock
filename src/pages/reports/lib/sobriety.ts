export type SobrietyOutcomeKey = 'passed' | 'failed' | 'interrupted';

/** Подпись типа события из DeviceAction / device-events (корень или events[0]). */
export function getEventTypeLabel(ev: unknown): string {
  if (ev == null || typeof ev !== 'object') return '';
  const record = ev as Record<string, unknown>;

  const fromEventsForFront = (raw: unknown): string => {
    if (raw == null || typeof raw !== 'object') return '';
    if ('label' in raw && typeof (raw as { label?: unknown }).label === 'string') {
      return String((raw as { label: string }).label);
    }
    return '';
  };

  const fromEventType = (raw: unknown): string => {
    if (typeof raw === 'string') return raw;
    if (raw != null && typeof raw === 'object' && 'label' in raw) {
      return String((raw as { label: string }).label);
    }
    return '';
  };

  const root = fromEventsForFront(record.eventsForFront) || fromEventType(record.eventType);
  if (root) return root;

  const events = record.events;
  if (Array.isArray(events) && events.length > 0 && events[0] != null && typeof events[0] === 'object') {
    const first = events[0] as Record<string, unknown>;
    return fromEventsForFront(first.eventsForFront) || fromEventType(first.eventType);
  }

  return '';
}

export function classifySobrietyLabel(label: string): SobrietyOutcomeKey | null {
  const s = label.toLowerCase();
  if (s.includes('тестирование пройдено') || s === 'passed' || s.includes('passed')) {
    return 'passed';
  }
  if (s.includes('тестирование не пройдено') || s === 'failed' || s.includes('failed')) {
    return 'failed';
  }
  if (s.includes('тестирование прервано') || s === 'interrupted' || s.includes('interrupted')) {
    return 'interrupted';
  }
  return null;
}
