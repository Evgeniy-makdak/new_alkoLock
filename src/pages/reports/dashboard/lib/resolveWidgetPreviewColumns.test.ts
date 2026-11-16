import { describe, expect, it, jest } from '@jest/globals';

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

  it('keeps backend-provided user fields as independent columns', () => {
    const contentWithBackendFullName = [{ ...content[0], fullName: 'Иванов Иван Иванович' }];
    const bodyWithBackendFullName: ReportQueryRequest = {
      selectedFields: [{ fieldName: 'fullName' }, ...body.selectedFields],
      filters: [],
    };

    const plan = planWidgetPreviewColumns(contentWithBackendFullName, bodyWithBackendFullName);

    expect(plan.displayColumnKeys).toEqual(['fullName', 'surname', 'firstName', 'middleName']);
  });

  it('keeps separately selected name fields as separate columns', () => {
    const plan = planWidgetPreviewColumns(content, body);

    expect(plan.displayColumnKeys).toEqual(['surname', 'firstName', 'middleName']);
  });
});
