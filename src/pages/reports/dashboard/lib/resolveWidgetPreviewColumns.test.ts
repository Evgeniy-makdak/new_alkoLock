import { describe, expect, it, jest } from '@jest/globals';

import { formatReportCompositeCellValue } from '../../lib/reportEntityCompositeFields';
import type { ReportQueryRequest } from '../../types/reportApiTypes';
import { planWidgetPreviewColumns } from './resolveOpenReportColumnHeaderLabels';

jest.mock('../../lib/deviceActionReportOptions', () => ({
  formatDeviceNameSerialLabel: () => '',
}));
jest.mock('../../lib/buildReportTableFieldOptions', () => ({
  buildReportTableFieldLeafKey: (entity: string, field: string) => `${entity}:${field}`,
  collectReportContentColumnKeys: (content: Array<Record<string, unknown>>) => [
    ...new Set(content.flatMap((row) => Object.keys(row))),
  ],
  formatRootReportTableFieldLabel: (label: string) => label,
  isReportTableFieldLabelAutoQualified: (label: string) =>
    label.includes(' -> ') || label.includes(' · '),
  orderReportContentColumnKeys: (
    keys: string[],
    selectedFields: Array<{ fieldName?: string; alias?: string }>,
  ) => {
    const ordered = selectedFields.flatMap((field) =>
      [field.alias, field.fieldName].filter((key): key is string =>
        Boolean(key && keys.includes(key)),
      ),
    );
    return [...new Set([...ordered, ...keys])];
  },
}));
jest.mock('./resolveWidgetColumnHeaderLabels', () => ({
  resolveWidgetColumnHeaderLabels: async () => ({}),
}));

describe('dashboard widget preview columns', () => {
  const body: ReportQueryRequest = {
    selectedFields: [
      { fieldName: 'surname' },
      { fieldName: 'firstName' },
      { fieldName: 'middleName' },
    ],
    filters: [],
  };
  const content = [
    {
      surname: 'Иванов',
      firstName: 'Иван',
      middleName: 'Иванович',
    },
  ];

  it('renders the saved ФИО composition as one column and combines its member values', () => {
    const plan = planWidgetPreviewColumns(content, body, ['__composite.User']);

    expect(plan.displayColumnKeys).toEqual(['__composite.User']);
    expect(formatReportCompositeCellValue(plan.groups[0], content[0])).toBe('Иванов Иван Иванович');
  });

  it('keeps an extra Фамилия column alongside the saved ФИО composition', () => {
    const contentWithExtraSurname = [{ ...content[0], Фамилия: 'Петров' }];
    const bodyWithExtraSurname: ReportQueryRequest = {
      selectedFields: [...body.selectedFields, { fieldName: 'surname', alias: 'Фамилия' }],
      filters: [],
    };

    const plan = planWidgetPreviewColumns(contentWithExtraSurname, bodyWithExtraSurname, [
      '__composite.User',
    ]);

    expect(plan.displayColumnKeys).toEqual(['__composite.User', 'Фамилия']);
    expect(formatReportCompositeCellValue(plan.groups[0], contentWithExtraSurname[0])).toBe(
      'Иванов Иван Иванович',
    );
    expect(contentWithExtraSurname[0]['Фамилия']).toBe('Петров');
  });

  it('keeps separately selected name fields as separate columns', () => {
    const plan = planWidgetPreviewColumns(content, body);

    expect(plan.displayColumnKeys).toEqual(['surname', 'firstName', 'middleName']);
  });
});
