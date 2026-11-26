import { describe, expect, it } from '@jest/globals';

import {
  REPORT_ROLLING_DATE_PRESETS,
  resolveReportRollingDateRange,
} from './reportRelativeDatePresets';

describe('resolveReportRollingDateRange', () => {
  const now = new Date('2026-11-26T12:17:45.123Z');

  it('resolves last 1 hour with seconds cleared', () => {
    const { from, to } = resolveReportRollingDateRange('last_1_hour', now);
    expect(to).toBe(new Date('2026-11-26T12:17:00.000Z').toISOString());
    expect(from).toBe(new Date('2026-11-26T11:17:00.000Z').toISOString());
  });

  it('resolves last 24 hours', () => {
    const { from, to } = resolveReportRollingDateRange('last_24_hours', now);
    expect(to).toBe(new Date('2026-11-26T12:17:00.000Z').toISOString());
    expect(from).toBe(new Date('2026-11-25T12:17:00.000Z').toISOString());
  });

  it('resolves last 7 days', () => {
    const { from, to } = resolveReportRollingDateRange('last_7_days', now);
    expect(to).toBe(new Date('2026-11-26T12:17:00.000Z').toISOString());
    expect(from).toBe(new Date('2026-11-19T12:17:00.000Z').toISOString());
  });

  it('resolves last 30 days', () => {
    const { from, to } = resolveReportRollingDateRange('last_30_days', now);
    expect(to).toBe(new Date('2026-11-26T12:17:00.000Z').toISOString());
    expect(from).toBe(new Date('2026-10-27T12:17:00.000Z').toISOString());
  });

  it('exposes four UI presets', () => {
    expect(REPORT_ROLLING_DATE_PRESETS.map((p) => p.id)).toEqual([
      'last_1_hour',
      'last_24_hours',
      'last_7_days',
      'last_30_days',
    ]);
  });
});
