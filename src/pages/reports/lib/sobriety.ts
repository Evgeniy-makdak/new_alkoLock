import type { IDeviceAction } from '@shared/types/BaseQueryTypes';

export type SobrietyOutcomeKey = 'passed' | 'failed' | 'interrupted';

export function getEventTypeLabel(ev: IDeviceAction): string {
  const ef = ev?.eventsForFront;
  if (ef && typeof ef === 'object' && ef !== null && 'label' in ef) {
    return String((ef as { label?: string }).label ?? '');
  }
  if (typeof ev?.eventType === 'string') return ev.eventType;
  if (ev?.eventType && typeof ev.eventType === 'object' && 'label' in ev.eventType) {
    return String((ev.eventType as { label: string }).label);
  }
  return '';
}

export function classifySobrietyLabel(label: string): SobrietyOutcomeKey | null {
  const s = label.toLowerCase();
  if (s.includes('тестирование пройдено')) return 'passed';
  if (s.includes('тестирование не пройдено')) return 'failed';
  if (s.includes('тестирование прервано')) return 'interrupted';
  return null;
}
