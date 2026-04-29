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
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { testids } from '@shared/const/testid';

import style from './Popup.module.scss';

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
}: PopupProps) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const handleClose = () => {
    (onCloseModal ?? toggleModal)();
  };

  const paperClassName = styles
    ? `${styles.size} ${styles.substr}`
    : `${style.size} ${style.substr}`;

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
          minWidth: 550,
          width: 'auto',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '99vh',
          borderRadius: '16px',
          backgroundImage: 'none',
          bgcolor: 'background.paper',
          color: 'text.primary',
          position: 'relative',
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          '@media (max-width:768px)': {
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
          sx={{
            px: 3.5,
            pt: 2.5,
            pr: 6,
            pb: 0,
            fontSize: 18,
            fontWeight: 'bold',
            borderBottom: 'none',
            boxShadow: 'none',
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
            overflow: 'visible',
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
