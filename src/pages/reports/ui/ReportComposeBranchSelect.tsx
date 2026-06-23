import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box } from '@mui/material';

import { SearchMultipleSelect, type Values } from '@shared/ui/search_multiple_select';

import { fetchBranchOfficesForReport } from '../lib/branchOfficeReportOptions';
import { normalizeReportBranchIds } from '../lib/buildReportBranchQueryParams';

import composeStyles from './ReportComposeModal.module.scss';

type ReportComposeBranchSelectProps = {
  value: Values;
  onChange: (value: Values) => void;
};

export function reportComposeBranchValuesToIds(value: Values): number[] {
  return normalizeReportBranchIds(value.map((item) => item.value));
}

export function reportComposeBranchIdsToValues(
  branchIds: number[] | undefined,
  options: Values,
): Values {
  if (!branchIds?.length) return [];
  const labelById = new Map(options.map((item) => [String(item.value), item.label]));
  return branchIds.map((id) => ({
    value: id,
    label: labelById.get(String(id)) ?? String(id),
  }));
}

export function ReportComposeBranchSelect({ value, onChange }: ReportComposeBranchSelectProps) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<Values>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadOffices = useCallback(async (searchQuery = '') => {
    setIsLoading(true);
    try {
      const offices = await fetchBranchOfficesForReport(searchQuery);
      const nextOptions = offices
        .filter((office) => office.id != null)
        .map((office) => ({
          value: Number(office.id),
          label: (office.name ?? '').trim() || String(office.id),
        }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'));
      setOptions(nextOptions);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOffices('');
  }, [loadOffices]);

  useEffect(() => {
    if (!value.length || !options.length) return;
    const remapped = reportComposeBranchIdsToValues(reportComposeBranchValuesToIds(value), options);
    const needsLabelUpdate = value.some((item, index) => remapped[index]?.label !== item.label);
    if (needsLabelUpdate) {
      onChange(remapped);
    }
  }, [options, value, onChange]);

  const handleInputChange = useCallback(
    (searchQuery: string) => {
      void loadOffices(searchQuery);
    },
    [loadOffices],
  );

  return (
    <Box className={composeStyles.composeFooterBranch}>
      <SearchMultipleSelect
        name="reportComposeBranches"
        label={t('reports.composeBranchLabel')}
        placeholder={t('reports.composeBranchPlaceholder')}
        values={options}
        value={value}
        isLoading={isLoading}
        multiple
        serverFilter
        onInputChange={handleInputChange}
        setValueStore={(_, next) => onChange(next as Values)}
      />
    </Box>
  );
}
