import { useTranslation } from 'react-i18next';

import { reportFilterControlSx } from '@pages/reports/lib/reportFilterControlSx';
import type { Values } from '@shared/ui/search_multiple_select';

import { ReportYearTextField } from './ReportYearTextField';

type ReportYearFilterFieldProps = {
  label?: string;
  value: Values;
  onChange: (values: Values) => void;
};

/** Год выпуска: только 4 цифры, без даты и времени. */
export function ReportYearFilterField({ label, value, onChange }: ReportYearFilterFieldProps) {
  const { t } = useTranslation();
  const yearStr = value[0]?.value != null ? String(value[0].value).replace(/\D/g, '').slice(0, 4) : '';
  const invalid = yearStr.length > 0 && yearStr.length < 4;

  return (
    <ReportYearTextField
      label={label ?? t('form.yearOfManufacture')}
      value={yearStr}
      placeholder={t('reports.yearPlaceholder')}
      invalid={invalid}
      errorMessage={t('reports.yearFormatError')}
      sx={reportFilterControlSx}
      onChange={(raw) => {
        const digits = raw.replace(/\D/g, '').slice(0, 4);
        onChange(digits ? [{ value: digits, label: digits }] : []);
      }}
    />
  );
}
