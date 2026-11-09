import { useTranslation } from 'react-i18next';

import { Box, Typography } from '@mui/material';

import { isReportBetweenFilterOperation } from '@pages/reports/lib/mapReportQueryOperator';
import { reportFilterControlSx } from '@pages/reports/lib/reportFilterControlSx';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportYearTextField } from './ReportYearTextField';

import pageStyles from './Reports.module.scss';

type ReportYearFilterFieldProps = {
  label?: string;
  value: Values;
  onChange: (values: Values) => void;
  /** between → два инпута (год начала / год окончания). */
  operationCode?: string | null;
  operationNumberParameter?: number | null;
  sx?: import('@mui/material/styles').SxProps<import('@mui/material/styles').Theme>;
  overflowTooltip?: boolean;
};

function yearDigitsFromValues(values: Values, index: number): string {
  const raw = values[index]?.value;
  if (raw == null || raw === '') return '';
  return String(raw).replace(/\D/g, '').slice(0, 4);
}

/** Год выпуска: 4 цифры; при between — пара «начало / конец». Только фильтры отчётов. */
export function ReportYearFilterField({
  label,
  value,
  onChange,
  operationCode,
  operationNumberParameter = null,
  sx,
  overflowTooltip = false,
}: ReportYearFilterFieldProps) {
  const { t } = useTranslation();
  const controlSx = sx ?? reportFilterControlSx;
  const isRange = isReportBetweenFilterOperation(operationCode, operationNumberParameter);

  const commitSlot = (index: 0 | 1, digits: string) => {
    const entry = digits ? { value: digits, label: digits } : undefined;
    const slot0 = index === 0 ? entry : value[0];
    const slot1 = index === 1 ? entry : value[1];
    const next: Values = [];
    if (slot0) next[0] = slot0;
    if (slot1) next[1] = slot1;
    onChange(next);
  };

  if (isRange) {
    const startStr = yearDigitsFromValues(value, 0);
    const endStr = yearDigitsFromValues(value, 1);
    return (
      <Box className={pageStyles.reportFilterDateTimeRootRange}>
        <ReportYearTextField
          label={t('reports.dateRangeStart')}
          value={startStr}
          placeholder={t('reports.yearPlaceholder')}
          invalid={startStr.length > 0 && startStr.length < 4}
          errorMessage={t('reports.yearFormatError')}
          sx={controlSx}
          overflowTooltip={overflowTooltip}
          onChange={(raw) => {
            commitSlot(0, raw.replace(/\D/g, '').slice(0, 4));
          }}
        />
        <Typography
          component="span"
          className={pageStyles.reportFilterDateTimeRangeSep}
          color="text.secondary">
          —
        </Typography>
        <ReportYearTextField
          label={t('reports.dateRangeEnd')}
          value={endStr}
          placeholder={t('reports.yearPlaceholder')}
          invalid={endStr.length > 0 && endStr.length < 4}
          errorMessage={t('reports.yearFormatError')}
          sx={controlSx}
          overflowTooltip={overflowTooltip}
          onChange={(raw) => {
            commitSlot(1, raw.replace(/\D/g, '').slice(0, 4));
          }}
        />
      </Box>
    );
  }

  const yearStr = yearDigitsFromValues(value, 0);
  const invalid = yearStr.length > 0 && yearStr.length < 4;

  return (
    <ReportYearTextField
      label={label ?? t('form.yearOfManufacture')}
      value={yearStr}
      placeholder={t('reports.yearPlaceholder')}
      invalid={invalid}
      errorMessage={t('reports.yearFormatError')}
      sx={controlSx}
      overflowTooltip={overflowTooltip}
      onChange={(raw) => {
        const digits = raw.replace(/\D/g, '').slice(0, 4);
        onChange(digits ? [{ value: digits, label: digits }] : []);
      }}
    />
  );
}
