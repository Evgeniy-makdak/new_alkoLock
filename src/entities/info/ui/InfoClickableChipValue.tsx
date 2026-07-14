import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { Chip, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';

import {
  getInfoClickableValueChipSx,
  getReportTableCoordinateChipSx,
} from '../lib/getInfoLinkChipSx';
import { findOverflowTarget, isElementOverflowing } from '@shared/ui/overflow_tooltip/overflowMeasure';
import { MobileOverflowTextDialog } from '@shared/ui/overflow_tooltip/MobileOverflowTextDialog';
import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';
import styles from '@shared/ui/overflow_tooltip/OverflowTooltip.module.scss';
import style from './Info.module.scss';

const LONG_PRESS_MS = 500;

type InfoClickableChipValueProps = {
  label: string;
  onNavigate: () => void;
  onCopy: () => void;
  theme: Theme;
  /** Компактный вид для таблицы отчётов. */
  compact?: boolean;
};

/** Значение в «Инфо» с копированием и переходом: голубой чип 16px на всю ширину колонки. */
export function InfoClickableChipValue({
  label,
  onNavigate,
  onCopy,
  theme,
  compact = false,
}: InfoClickableChipValueProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width:768px)');
  const chipWrapRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressNavigateFiredRef = useRef(false);

  const [overflows, setOverflows] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const measure = useCallback(() => {
    const root = chipWrapRef.current;
    if (!root) return;
    setOverflows(isElementOverflowing(findOverflowTarget(root)));
  }, []);

  useEffect(() => {
    measure();
    const root = chipWrapRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;

    const ro = new ResizeObserver(measure);
    ro.observe(root);
    const target = findOverflowTarget(root);
    if (target !== root) {
      ro.observe(target);
    }
    return () => ro.disconnect();
  }, [measure, label]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => () => clearLongPressTimer(), []);

  const canExpandOnMobile = isMobile && overflows && Boolean(label.trim());

  const handleChipPointerDown = () => {
    if (!isMobile) return;
    clearLongPressTimer();
    longPressNavigateFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      longPressNavigateFiredRef.current = true;
      onNavigate();
    }, LONG_PRESS_MS);
  };

  const handleChipPointerEnd = () => {
    clearLongPressTimer();
  };

  const handleChipClick = (event: React.MouseEvent) => {
    if (!isMobile) {
      onNavigate();
      return;
    }

    if (longPressNavigateFiredRef.current) {
      longPressNavigateFiredRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (canExpandOnMobile) {
      event.preventDefault();
      event.stopPropagation();
      setDialogOpen(true);
      return;
    }

    onNavigate();
  };

  return (
    <>
      <div
        className={`${style.wrapperText} ${style.wrapperTextCopyble}${
          compact ? ` ${style.wrapperTextCompact}` : ''
        }`}>
        <Tooltip title={t('tooltips.copy')}>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onCopy();
            }}
            sx={{ p: compact ? '1px' : '2px', flexShrink: 0, fontSize: compact ? 16 : undefined }}>
            <ContentCopyOutlinedIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <div
          ref={chipWrapRef}
          className={canExpandOnMobile ? styles.mobileTruncatedLongPress : undefined}
          style={
            compact
              ? { flex: '0 1 auto', minWidth: 0, maxWidth: '100%' }
              : { flex: 1, minWidth: 0 }
          }>
          {isMobile ? (
            <Chip
              clickable
              label={label}
              onClick={handleChipClick}
              onPointerDown={handleChipPointerDown}
              onPointerUp={handleChipPointerEnd}
              onPointerCancel={handleChipPointerEnd}
              onPointerLeave={handleChipPointerEnd}
              aria-label={
                canExpandOnMobile
                  ? `${label}. ${t('info.tapToSeeFullText')}. ${t('info.holdToNavigate')}`
                  : label
              }
              sx={
                compact ? getReportTableCoordinateChipSx(theme) : getInfoClickableValueChipSx(theme)
              }
            />
          ) : (
            <OverflowTooltip title={label}>
              <Chip
                clickable
                label={label}
                onClick={handleChipClick}
                aria-label={label}
                sx={
                  compact
                    ? getReportTableCoordinateChipSx(theme)
                    : getInfoClickableValueChipSx(theme)
                }
              />
            </OverflowTooltip>
          )}
        </div>
      </div>
      <MobileOverflowTextDialog
        open={dialogOpen}
        text={label}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
