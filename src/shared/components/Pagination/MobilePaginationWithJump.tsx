import { useEffect, useState } from 'react';
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
}

/**
 * Мобильная пагинация: назад / вперёд + тап по счётчику страниц → диалог быстрого перехода.
 */
export const MobilePaginationWithJump = ({
  page,
  pageSize,
  totalCount,
  onPageChange,
  buttonClassName,
  infoClassName = '',
}: MobilePaginationWithJumpProps) => {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(page + 1));

  useEffect(() => {
    if (open) {
      setDraft(String(page + 1));
    }
  }, [open, page]);

  const applyDialog = () => {
    const n = parseInt(String(draft).trim(), 10);
    if (!Number.isFinite(n)) {
      return;
    }
    const p = Math.min(totalPages, Math.max(1, n));
    onPageChange(p - 1);
    setOpen(false);
  };

  const infoClass = infoClassName || undefined;

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
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
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textUnderlineOffset: 3,
          textAlign: 'center',
          minWidth: infoClassName ? 0 : 120,
        }}>
        {t('pagination.pageOf', { page: page + 1, total: totalPages })}
      </button>

      <button
        type="button"
        className={buttonClassName}
        disabled={(page + 1) * pageSize >= totalCount}
        onClick={() => onPageChange(page + 1)}
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
            inputProps={{ min: 1, max: totalPages }}
            helperText={t('pagination.jumpHelper', { max: totalPages })}
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
};
