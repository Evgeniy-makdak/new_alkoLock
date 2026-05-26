import { useTranslation } from 'react-i18next';

import type { SxProps, Theme } from '@mui/material/styles';

import {
  formatReportCoordinateInput,
  isCompleteReportCoordinate,
  isValidReportCoordinateInput,
} from '@pages/reports/lib/formatReportCoordinateInput';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportTimeTextField } from './ReportTimeTextField';

type ReportCoordinateFilterFieldProps = {
  label: string;
  value: Values;
  onChange: (values: Values) => void;
  sx?: SxProps<Theme>;
};

export function ReportCoordinateFilterField({
  label,
  value,
  onChange,
  sx,
}: ReportCoordinateFilterFieldProps) {
  const { t } = useTranslation();
  const coordinateValue = value[0]?.value != null ? String(value[0].value) : '';
  const invalid =
    coordinateValue.length > 0 &&
    (!isValidReportCoordinateInput(coordinateValue) || !isCompleteReportCoordinate(coordinateValue));

  return (
    <ReportTimeTextField
      label={label}
      value={coordinateValue}
      placeholder={t('reports.coordinatePlaceholder')}
      invalid={invalid}
      errorMessage={t('reports.coordinateFormatError')}
      maxLength={8}
      inputMode="decimal"
      sx={sx}
      onChange={(raw) => {
        const formatted = formatReportCoordinateInput(raw);
        onChange(formatted ? [{ value: formatted, label: formatted }] : []);
      }}
    />
  );
}
