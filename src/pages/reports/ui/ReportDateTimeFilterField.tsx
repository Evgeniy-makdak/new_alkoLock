import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import dayjs, { type Dayjs } from 'dayjs';

import { Box, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import {
  combineDateAndTimeToIso,
  formatDateTimeDisplay,
  parseStoredDateTimeValue,
} from '@pages/reports/lib/formatReportDateTimeFilterValue';
import {
  formatReportTimeInput,
  isCompleteReportTime,
} from '@pages/reports/lib/formatReportTimeInput';
import { reportFilterDateTimeControlSx } from '@pages/reports/lib/reportFilterControlSx';
import { InputDate } from '@shared/ui/input_date/InputDate';
import type { Values } from '@shared/ui/search_multiple_select';

import pageStyles from './Reports.module.scss';

type ReportDateTimeFilterFieldProps = {
  value: Values;
  onChange: (values: Values) => void;
};

export function ReportDateTimeFilterField({ value, onChange }: ReportDateTimeFilterFieldProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const storedRaw = value[0]?.value;
  const storedKey = storedRaw == null ? '' : String(storedRaw);

  const parsed = useMemo(
    () => (storedKey ? parseStoredDateTimeValue(storedRaw as string | number) : null),
    [storedKey, storedRaw],
  );

  const [datePart, setDatePart] = useState<Dayjs | null>(parsed?.date ?? null);
  const [timePart, setTimePart] = useState(parsed?.time ?? '');

  useEffect(() => {
    if (!storedKey) {
      setDatePart(null);
      setTimePart('');
      return;
    }
    if (parsed) {
      setDatePart(parsed.date);
      setTimePart(parsed.time);
    }
  }, [storedKey, parsed]);

  const commit = (date: Dayjs | null, time: string) => {
    if (!date || !isCompleteReportTime(time)) {
      onChange([]);
      return;
    }
    const iso = combineDateAndTimeToIso(date, time);
    if (!iso) {
      onChange([]);
      return;
    }
    onChange([{ value: iso, label: formatDateTimeDisplay(dayjs(iso)) }]);
  };

  const timeInvalid = timePart.length > 0 && !isCompleteReportTime(timePart);

  return (
    <Box
      className={pageStyles.reportFilterDateTime}
      sx={{
        ...reportFilterDateTimeControlSx,
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: 1,
        alignItems: 'flex-start',
        '& > *': { flex: '1 1 0', minWidth: 100 },
      }}>
      <InputDate
        label={t('tables.date')}
        value={datePart}
        onChange={(next) => {
          const date = next ?? null;
          setDatePart(date);
          commit(date, timePart);
        }}
        slotProps={{
          textField: {
            size: 'small',
            fullWidth: true,
            placeholder: t('tables.date'),
          },
        }}
        theme={theme}
      />
      <TextField
        label={t('reports.timeOfDayLabel')}
        value={timePart}
        placeholder={t('reports.timePlaceholder')}
        error={timeInvalid}
        helperText={timeInvalid ? t('reports.timeFormatError') : undefined}
        inputProps={{ maxLength: 5, inputMode: 'numeric' }}
        size="small"
        fullWidth
        onChange={(e) => {
          const formatted = formatReportTimeInput(e.target.value);
          setTimePart(formatted);
          commit(datePart, formatted);
        }}
      />
    </Box>
  );
}
