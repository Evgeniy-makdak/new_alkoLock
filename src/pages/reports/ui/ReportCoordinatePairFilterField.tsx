import { useTranslation } from 'react-i18next';

import type { SxProps, Theme } from '@mui/material/styles';

import {
  REPORT_COORDINATE_PAIR_INPUT_MAX_LENGTH,
  formatReportCoordinatePairInput,
  isCompleteReportCoordinatePair,
  isValidReportCoordinatePairInput,
} from '@pages/reports/lib/formatReportCoordinateInput';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportTimeTextField } from './ReportTimeTextField';

type ReportCoordinatePairFilterFieldProps = {
  label: string;
  value: Values;
  onChange: (values: Values) => void;
  sx?: SxProps<Theme>;
  overflowTooltip?: boolean;
};

/** Ручной ввод пары «широта:долгота» с маской (точка и «:» подставляются автоматически). */
export function ReportCoordinatePairFilterField({
  label,
  value,
  onChange,
  sx,
  overflowTooltip = false,
}: ReportCoordinatePairFilterFieldProps) {
  const { t } = useTranslation();
  const pairValue = value[0]?.value != null ? String(value[0].value) : '';
  const invalid =
    pairValue.length > 0 &&
    (!isValidReportCoordinatePairInput(pairValue) || !isCompleteReportCoordinatePair(pairValue));

  const applyFormattedValue = (raw: string) => {
    const formatted = formatReportCoordinatePairInput(raw);
    onChange(formatted ? [{ value: formatted, label: formatted }] : []);
  };

  return (
    <ReportTimeTextField
      label={label}
      value={pairValue}
      placeholder={t('reports.coordinatePairPlaceholder')}
      invalid={invalid}
      errorMessage={t('reports.coordinatePairFormatError')}
      maxLength={REPORT_COORDINATE_PAIR_INPUT_MAX_LENGTH}
      inputMode="decimal"
      sx={sx}
      overflowTooltip={overflowTooltip}
      onChange={applyFormattedValue}
    />
  );
}
