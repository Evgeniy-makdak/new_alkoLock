import { describe, expect, it } from '@jest/globals';

import {
  buildReportFilterOptionsFromComposition,
  isReportMetadataFilterField,
} from './reportFilterFieldEligibility';

import type { ReportEntityMetadata, ReportFieldDefinition } from '../types/reportApiTypes';

const t = ((key: string) => key) as unknown as import('i18next').TFunction;

const field = (
  partial: Partial<ReportFieldDefinition> & Pick<ReportFieldDefinition, 'fieldName'>,
): ReportFieldDefinition => ({
  label: partial.label ?? partial.fieldName,
  alias: null,
  type: partial.type ?? 'TEXT',
  referenceEntity: partial.referenceEntity ?? null,
  filterable: partial.filterable ?? true,
  sortable: true,
  groupable: true,
  selectable: partial.selectable ?? true,
  aggregation: null,
  availableOperations: [],
  availableFunctions: [],
  ...partial,
});

describe('reportFilterFieldEligibility', () => {
  it('selectable=false cancels filterable for the field itself', () => {
    expect(
      isReportMetadataFilterField(
        field({
          fieldName: 'assignment',
          label: 'Привязка к офису',
          type: 'ENTITY',
          referenceEntity: 'BranchAssignment',
          filterable: true,
          selectable: false,
        }),
      ),
    ).toBe(false);
  });

  it('builds filter options only from current table composition paths', () => {
    const root: ReportEntityMetadata = {
      entityName: 'MonitoringDevice',
      label: '',
      fields: [
        field({ fieldName: 'name', label: 'Имя', selectable: true, filterable: true }),
        field({
          fieldName: 'assignment',
          label: 'Привязка к офису',
          type: 'ENTITY',
          referenceEntity: 'BranchAssignment',
          filterable: true,
          selectable: false,
        }),
      ],
    };
    const nested = {
      BranchAssignment: {
        entityName: 'BranchAssignment',
        label: '',
        fields: [
          field({
            fieldName: 'branch',
            label: 'Офис',
            type: 'ENTITY',
            referenceEntity: 'BranchOffice',
            filterable: true,
            selectable: false,
          }),
        ],
      },
      BranchOffice: {
        entityName: 'BranchOffice',
        label: '',
        fields: [
          field({
            fieldName: 'name',
            label: 'Название',
            filterable: true,
            selectable: true,
          }),
        ],
      },
    };

    const options = buildReportFilterOptionsFromComposition(
      [
        { value: 'name', label: 'Отчет по алкозамкам -> Имя' },
        { value: 'assignment.branch.name', label: 'Офис -> Название' },
      ],
      root,
      nested,
      t,
    );

    expect(options.map((o) => String(o.value))).toEqual([
      'name',
      'assignment.branch.name',
    ]);
    // Поля вне состава не попадают, даже если есть в metadata.
    expect(options.find((o) => String(o.value) === 'assignment')).toBeUndefined();
  });
});
