import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

export interface MobilePaginationWithJumpProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  buttonClassName: string;
  /** Класс для текста «Страница N из M» (например из *.module.scss) */
  infoClassName?: string;
  /** Как у DataGrid: пока true — не доверяем кратковременным total из пропсов */
  loading?: boolean;
}

/**
 * Мобильная пагинация: назад / вперёд + тап по счётчику страниц → диалог быстрого перехода.
 */
function MobilePaginationWithJumpComponent({
  page,
  pageSize,
  totalCount,
  onPageChange,
  buttonClassName,
  infoClassName = '',
  loading = false,
}: MobilePaginationWithJumpProps) {
  const { t } = useTranslation();
  const lastStableTotalPagesRef = useRef<number | null>(null);

  const safePage =
    Number.isFinite(Number(page)) && Number(page) >= 0 ? Math.floor(Number(page)) : 0;
  const safePageSize =
    Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : 1;

  const rawTotalKnown =
    totalCount !== undefined && totalCount !== null && Number.isFinite(Number(totalCount));
  const rawTotal = rawTotalKnown ? Math.max(0, Number(totalCount)) : null;

  const computedPages = rawTotal !== null ? Math.max(1, Math.ceil(rawTotal / safePageSize)) : null;

  const impossibleSinglePage = computedPages !== null && computedPages === 1 && safePage > 0;

  const hasReliableTotal = !loading && rawTotal !== null && rawTotal >= 0 && !impossibleSinglePage;

  if (hasReliableTotal && computedPages !== null) {
    lastStableTotalPagesRef.current = computedPages;
  }

  const fallbackPagesFromProps =
    rawTotal !== null && !impossibleSinglePage && computedPages !== null ? computedPages : null;

  const displayTotalPages: number | null =
    loading && lastStableTotalPagesRef.current !== null
      ? lastStableTotalPagesRef.current
      : hasReliableTotal && computedPages !== null
        ? computedPages
        : (lastStableTotalPagesRef.current ?? fallbackPagesFromProps);

  const maxPagesForDialog =
    displayTotalPages !== null ? displayTotalPages : Math.max(safePage + 1, 1);

  const totalForI18n: string | number = displayTotalPages !== null ? displayTotalPages : '\u00a0';

  const canGoNext =
    displayTotalPages !== null
      ? safePage + 1 < displayTotalPages
      : rawTotal !== null
        ? (safePage + 1) * safePageSize < rawTotal
        : true;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(safePage + 1));

  useEffect(() => {
    if (open) {
      setDraft(String(safePage + 1));
    }
  }, [open, safePage]);

  const applyDialog = () => {
    const n = parseInt(String(draft).trim(), 10);
    if (!Number.isFinite(n)) {
      return;
    }
    const p = Math.min(maxPagesForDialog, Math.max(1, n));
    onPageChange(p - 1);
    setOpen(false);
  };

  const infoClass = infoClassName || undefined;

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        disabled={safePage === 0}
        onClick={() => onPageChange(safePage - 1)}
        aria-label={t('pagination.prevPage')}>
        <KeyboardArrowUp />
      </button>

      <button
        type="button"
        className={infoClass}
        onClick={() => setOpen(true)}
        aria-label={t('pagination.jumpToPage')}
        style={{
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: '4px 8px',
          font: 'inherit',
          color: infoClassName ? 'inherit' : '#777',
          fontSize: infoClassName ? 'inherit' : 14,
          fontVariantNumeric: 'tabular-nums',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textUnderlineOffset: 3,
          textAlign: 'center',
          minWidth: infoClassName ? 0 : 132,
        }}>
        {t('pagination.pageOf', { page: safePage + 1, total: totalForI18n })}
      </button>

      <button
        type="button"
        className={buttonClassName}
        disabled={!canGoNext}
        onClick={() => onPageChange(safePage + 1)}
        aria-label={t('pagination.nextPage')}>
        <KeyboardArrowDown />
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              m: 2,
              width: 'min(260px, calc(100vw - 32px))',
              maxWidth: 'min(260px, calc(100vw - 32px))',
            },
          },
        }}>
        <DialogTitle
          sx={{ py: 1.25, px: 2, fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.3 }}>
          {t('pagination.jumpToPage')}
        </DialogTitle>
        <DialogContent sx={{ px: 2, pt: 0, pb: 1 }}>
          <TextField
            autoFocus
            size="small"
            type="number"
            fullWidth
            label={t('pagination.pageNumber')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            inputProps={{ min: 1, max: maxPagesForDialog }}
            helperText={
              displayTotalPages !== null
                ? t('pagination.jumpHelper', { max: displayTotalPages })
                : t('pagination.jumpHelper', { max: '…' })
            }
            FormHelperTextProps={{ sx: { fontSize: '0.7rem', mt: 0.5, mx: 0 } }}
            InputLabelProps={{ sx: { fontSize: '0.8125rem' } }}
            sx={{
              '& .MuiInputBase-root': { minHeight: 36, fontSize: '0.875rem' },
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyDialog();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.25, pt: 0, gap: 1 }}>
          <Button size="small" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button size="small" variant="contained" onClick={applyDialog}>
            {t('pagination.go')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export const MobilePaginationWithJump = memo(MobilePaginationWithJumpComponent);
MobilePaginationWithJump.displayName = 'MobilePaginationWithJump';
