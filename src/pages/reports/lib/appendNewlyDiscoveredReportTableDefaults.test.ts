import { describe, expect, it } from '@jest/globals';
import type { Values } from '@shared/ui/search_multiple_select';

import { appendNewlyDiscoveredReportTableDefaults } from './appendNewlyDiscoveredReportTableDefaults';

const rootField: Values[number] = { value: 'timestamp', label: 'Дата' };
const nestedField: Values[number] = { value: 'user.fullName', label: 'Пользователь' };

describe('appendNewlyDiscoveredReportTableDefaults', () => {
  it('adds defaults discovered after changing the entity while editing', () => {
    expect(
      appendNewlyDiscoveredReportTableDefaults([rootField], [nestedField], 'edit', true),
    ).toEqual([rootField, nestedField]);
  });

  it('does not add defaults to an unchanged report during edit', () => {
    const current: Values = [rootField];
    expect(appendNewlyDiscoveredReportTableDefaults(current, [nestedField], 'edit', false)).toBe(
      current,
    );
  });

  it('keeps create-mode default discovery and avoids duplicate fields', () => {
    expect(
      appendNewlyDiscoveredReportTableDefaults(
        [rootField],
        [rootField, nestedField, nestedField],
        'create',
        false,
      ),
    ).toEqual([rootField, nestedField]);
  });
});
