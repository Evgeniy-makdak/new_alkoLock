import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import CloseIcon from '@mui/icons-material/Close';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { testids } from '@shared/const/testid';

import style from './Popup.module.scss';
import { usePopupDragResize } from './usePopupDragResize';

export type PopupDragResizeConfig = {
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
};

interface PopupProps {
  isOpen: boolean;
  headerTitle?: string;
  body?: string | ReactNode;
  toggleModal: () => void;
  buttons?: ReactNode[];
  closeonClickSpace?: boolean;
  closeOnEscapeKey?: boolean;
  onCloseModal?: () => void;
  styles?: { size: string; substr: string } | null;
  /** Перетаскивание за заголовок и ресайз за верхний/левый край (отключено на узких экранах). */
  dragResize?: PopupDragResizeConfig;
}

export const Popup = ({
  isOpen,
  headerTitle = '',
  body,
  toggleModal,
  buttons = [],
  closeonClickSpace = true,
  closeOnEscapeKey = true,
  onCloseModal,
  styles = null,
  dragResize,
}: PopupProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isNarrowViewport = useMediaQuery('(max-width:900px)');
  const dragResizeEnabled = Boolean(dragResize) && !isNarrowViewport;

  const { geometry, isInteracting, onTitlePointerDown, onResizePointerDown } = usePopupDragResize({
    enabled: dragResizeEnabled,
    isOpen,
    defaultWidth: dragResize?.defaultWidth ?? 900,
    defaultHeight: dragResize?.defaultHeight ?? 720,
    minWidth: dragResize?.minWidth ?? 560,
    minHeight: dragResize?.minHeight ?? 360,
  });

  const handleClose = () => {
    (onCloseModal ?? toggleModal)();
  };

  const paperClassName = [
    styles ? `${styles.size} ${styles.substr}` : `${style.size} ${style.substr}`,
    dragResizeEnabled ? style.interactivePaper : '',
    isInteracting ? style.interacting : '',
  ]
    .filter(Boolean)
    .join(' ');

  const paperPositionSx = dragResizeEnabled
    ? {
        position: 'fixed' as const,
        top: geometry.y,
        left: geometry.x,
        width: geometry.w,
        height: geometry.h,
        minWidth: dragResize?.minWidth ?? 560,
        maxWidth: 'none',
        margin: 0,
        transform: 'none',
      }
    : {};

  return (
    <Dialog
      data-testid={testids.POPUP}
      disableEnforceFocus
      disableEscapeKeyDown={!closeOnEscapeKey}
      open={isOpen}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' && !closeonClickSpace) return;
        if (reason === 'escapeKeyDown' && !closeOnEscapeKey) return;
        handleClose();
      }}
      maxWidth={false}
      sx={
        dragResizeEnabled
          ? {
              '& .MuiDialog-container': {
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
              },
            }
          : undefined
      }
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: alpha(
              theme.palette.common.black,
              theme.palette.mode === 'dark' ? 0.65 : 0.5,
            ),
          },
        },
      }}
      PaperProps={{
        className: paperClassName,
        sx: {
          minWidth: dragResizeEnabled ? undefined : 550,
          width: dragResizeEnabled ? undefined : 'auto',
          maxWidth: dragResizeEnabled ? 'none' : 'calc(100vw - 32px)',
          maxHeight: dragResizeEnabled ? 'none' : '99vh',
          borderRadius: '16px',
          backgroundImage: 'none',
          bgcolor: 'background.paper',
          color: 'text.primary',
          position: 'relative',
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          ...paperPositionSx,
          '@media (max-width:768px)': dragResizeEnabled
            ? undefined
            : {
                minWidth: 'unset',
                width: 'calc(100vw - 12px)',
                maxWidth: 'calc(100vw - 12px)',
                height: 'auto',
                maxHeight: 'calc(100dvh - 12px)',
                borderRadius: '12px',
                margin: '6px',
              },
        },
      }}>
      {dragResizeEnabled ? (
        <>
          <div
            className={`${style.resizeHandle} ${style.resizeN}`}
            data-resize-edge="n"
            onPointerDown={onResizePointerDown}
            aria-hidden
          />
          <div
            className={`${style.resizeHandle} ${style.resizeW}`}
            data-resize-edge="w"
            onPointerDown={onResizePointerDown}
            aria-hidden
          />
          <div
            className={`${style.resizeHandle} ${style.resizeNw}`}
            data-resize-edge="nw"
            onPointerDown={onResizePointerDown}
            aria-hidden
          />
        </>
      ) : null}

      <Tooltip title={t('common.closeWindow')}>
        <IconButton
          data-testid={`${testids.POPUP_CLOSE_BUTTON}`}
          aria-label={t('common.closeWindow')}
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
            color: 'text.secondary',
          }}>
          <CloseIcon />
        </IconButton>
      </Tooltip>

      {headerTitle ? (
        <DialogTitle
          className={dragResizeEnabled ? style.dragTitle : undefined}
          onPointerDown={dragResizeEnabled ? onTitlePointerDown : undefined}
          sx={{
            px: 3.5,
            pt: 2.5,
            pr: 6,
            pb: 0,
            fontSize: 18,
            fontWeight: 'bold',
            borderBottom: 'none',
            boxShadow: 'none',
            flexShrink: 0,
            '@media (max-width:768px)': {
              px: 2,
              pt: 1.5,
              pr: 5,
              fontSize: 16,
            },
          }}>
          {headerTitle}
        </DialogTitle>
      ) : null}

      <DialogContent
        sx={{
          px: 3.5,
          pt: headerTitle ? 1 : 3,
          pb: buttons?.length ? 1 : 2,
          overflow: 'auto',
          color: 'text.primary',
          borderTop: 'none',
          borderBottom: 'none',
          backgroundImage: 'none',
          boxShadow: 'none',
          flex: 1,
          minHeight: 0,
          '@media (max-width:768px)': {
            px: 2,
            pt: headerTitle ? 0.75 : 1.5,
            pb: 1.25,
            overflow: dragResizeEnabled ? 'auto' : 'visible',
          },
        }}>
        {body}
      </DialogContent>

      {buttons && buttons.length > 0 ? (
        <DialogActions
          sx={{
            px: 3.5,
            pb: 2,
            pt: 0,
            justifyContent: 'flex-end',
            gap: 1,
            flexShrink: 0,
            '& > button:first-of-type': { mr: 0 },
            '@media (max-width:768px)': {
              px: 2,
              pb: 1.5,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            },
          }}>
          {buttons}
        </DialogActions>
      ) : null}
    </Dialog>
  );
};
