import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, TextField, Typography } from '@mui/material';

export interface PaginationJumpFieldProps {
  /** Текущая страница, 0-based */
  page: number;
  /** Число страниц (может быть 0 с бэка — для отображения нормализуем) */
  pageCount: number;
  onJump: (pageIndexZeroBased: number) => void;
  disabled?: boolean;
}

/**
 * Поле номера страницы (отдельная рамка) + текст «/ всего» рядом, без общего контейнера.
 */
export function PaginationJumpField({
  page,
  pageCount,
  onJump,
  disabled,
}: PaginationJumpFieldProps) {
  const { t } = useTranslation();
  const effectiveTotal = Math.max(1, pageCount);
  const isJumpDisabled = Boolean(disabled || effectiveTotal <= 1);
  const [value, setValue] = useState(String(page + 1));

  useEffect(() => {
    setValue(String(page + 1));
  }, [page]);

  const apply = () => {
    if (isJumpDisabled) {
      setValue(String(page + 1));
      return;
    }
    const n = parseInt(String(value).trim(), 10);
    if (!Number.isFinite(n)) {
      setValue(String(page + 1));
      return;
    }
    const targetHuman = Math.min(effectiveTotal, Math.max(1, n));
    onJump(targetHuman - 1);
    setValue(String(targetHuman));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        flexShrink: 0,
        mx: 0.5,
      }}>
      <TextField
        variant="outlined"
        size="small"
        value={value}
        disabled={isJumpDisabled}
        onChange={(e) => setValue(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
          }
        }}
        inputProps={{
          min: 1,
          max: effectiveTotal,
          'aria-label': t('pagination.jumpToPage'),
          style: { textAlign: 'center', padding: '5px 4px', fontSize: '0.8125rem' },
        }}
        sx={{
          width: 52,
          '& .MuiOutlinedInput-root': {
            minHeight: 32,
            fontSize: '0.8125rem',
            backgroundColor: 'background.paper',
          },
        }}
      />
      <Typography
        variant="body2"
        component="span"
        color="text.secondary"
        sx={{
          whiteSpace: 'nowrap',
          lineHeight: 1,
          fontSize: '0.8125rem',
          userSelect: 'none',
        }}>
        / {effectiveTotal}
      </Typography>
    </Box>
  );
}
