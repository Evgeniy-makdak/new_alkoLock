import i18n from 'i18next';

import { describe, expect, it, jest } from '@jest/globals';

import type { ReportEntityMetadata, ReportFieldDefinition } from '../types/reportApiTypes';
import { buildRootReportTableFieldOptions } from './buildReportTableFieldOptions';
import { applyReportEntityCompositeFieldGrouping } from './reportEntityCompositeFields';

jest.mock('./deviceActionReportOptions', () => ({
  formatDeviceNameSerialLabel: () => '',
}));
jest.mock('./eventsForFrontReportOptions', () => ({
  isEventsForFrontTypeListAttribute: () => false,
}));

describe('report entity fields from metadata', () => {
  it.each([
    {
      entity: 'User',
      fields: ['surname', 'firstName', 'middleName'] as string[],
    },
    {
      entity: 'MonitoringDevice',
      fields: ['name', 'serialNumber'] as string[],
    },
    {
      entity: 'Vehicle',
      fields: ['manufacturer', 'model', 'registrationNumber'] as string[],
    },
  ])(
    'does not synthesize aggregate columns for $entity',
    ({ entity, fields }: { entity: string; fields: string[] }) => {
      const drafts = fields.map((fieldName) => ({
        value: fieldName,
        baseLabel: fieldName,
        sourceLabel: entity,
        qualifyAs: 'nested' as const,
        leafKey: `${entity}:${fieldName}`,
      }));

      expect(applyReportEntityCompositeFieldGrouping(drafts, i18n.t.bind(i18n))).toEqual(drafts);
    },
  );

  it('keeps metadata-provided fullName and person-name fields as separate options', () => {
    const metadata: ReportEntityMetadata = {
      entityName: 'User',
      label: 'Отчет по пользователям',
      fields: ['fullName', 'surname', 'firstName', 'middleName'].map(
        (fieldName): ReportFieldDefinition => ({
          fieldName,
          label: fieldName,
          alias: null,
          type: 'TEXT',
          filterable: true,
          sortable: true,
          groupable: true,
          selectable: true,
          aggregation: null,
          availableOperations: [],
          availableFunctions: [],
        }),
      ),
    };

    const options = buildRootReportTableFieldOptions(metadata, [], [], i18n.t.bind(i18n));

    expect(options.map((option) => option.value)).toEqual([
      'fullName',
      'surname',
      'firstName',
      'middleName',
    ]);
  });
});
