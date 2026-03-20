import React from 'react';
import { useTranslation } from 'react-i18next';

import CloseIcon from '@mui/icons-material/Close';
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { SETTINGS_LABEL_MAP } from '../../shared/lib/settingsLabelMap';

interface EditSettingDialogProps {
  open: boolean;
  isSaving: boolean;
  editingField: {
    name: string;
    label: string;
    unit: string;
    minValue: number;
    maxValue: number;
  } | null;
  editValue: number;
  errors: Record<string, string[]>;
  handleCloseModal: (
    event: Record<string, never>,
    reason: 'backdropClick' | 'escapeKeyDown' | 'buttonClick',
  ) => void;
  handleEditValueChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  handleSave: () => void;
  getDayWord: (count: number) => string;
  getAttemptWord: (count: number) => string;
  getSecondWord: (count: number) => string;
  getMinuteWord: (count: number) => string;
}

export const EditSettingDialog: React.FC<EditSettingDialogProps> = ({
  open,
  isSaving,
  editingField,
  editValue,
  errors,
  handleCloseModal,
  handleEditValueChange,
  handlePaste,
  handleSave,
  getDayWord,
  getAttemptWord,
  getSecondWord,
  getMinuteWord,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={handleCloseModal}
      PaperProps={{
        sx: {
          padding: '20px',
          borderRadius: '8px',
          minWidth: '400px',
          maxWidth: 'calc(100vw - 32px)',
          margin: '16px',
          overflowX: 'hidden',
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
        },
      }}>
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.modal + 1,
        }}
        open={isSaving}>
        <CircularProgress color="inherit" />
      </Backdrop>

      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 0 16px 0',
          position: 'relative',
          marginBottom: '16px',
        }}>
        <Typography component="span" fontWeight={600} variant="h6">
          {t('modals.editParameter')}
        </Typography>
        <Tooltip title={t('common.closeWindow')}>
          <IconButton
            edge="end"
            onClick={() => handleCloseModal({}, 'buttonClick')}
            aria-label="close"
            sx={{
              color: (theme) => theme.palette.grey[500],
              '&:hover': {
                backgroundColor: 'transparent',
                color: (theme) => theme.palette.grey[700],
              },
            }}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      <DialogContent
        sx={{
          padding: '16px 0 !important',
          overflowX: 'hidden',
        }}>
        <Stack gap={3}>
          <Typography gutterBottom>
            {editingField?.label && SETTINGS_LABEL_MAP[editingField.label]
              ? t(SETTINGS_LABEL_MAP[editingField.label])
              : editingField?.label}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            type="number"
            fullWidth
            variant="outlined"
            value={editValue === 0 ? '' : editValue}
            onChange={handleEditValueChange}
            onPaste={handlePaste}
            error={errors[editingField?.name]?.length > 0}
            helperText={errors[editingField?.name]?.[0] || ''}
            InputProps={{
              endAdornment: (
                <Typography variant="body2" color="textSecondary">
                  {editingField?.unit === 'DAYS'
                    ? getDayWord(editValue)
                    : editingField?.unit === 'MINUTES'
                      ? getMinuteWord(editValue)
                      : editingField?.unit === 'SECONDS'
                        ? getSecondWord(editValue)
                        : getAttemptWord(editValue)}
                </Typography>
              ),
              inputProps: {
                min: editingField?.minValue,
                max: editingField?.maxValue,
              },
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          padding: '16px 0 0 0',
          marginTop: '16px',
        }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title={t('form.saveChanges')}>
            <Button
              variant="outlined"
              onClick={handleSave}
              disabled={isSaving || errors[editingField?.name]?.length > 0}
              sx={{
                '&&': {
                  background: 'transparent !important',
                  border: '1px solid grey !important',
                  color: 'black !important',
                  minWidth: '100px !important',
                },
                '&:hover': {
                  background: 'rgba(0, 0, 0, 0.04) !important',
                  border: '1px solid grey !important',
                },
              }}>
              {t('common.save')}
            </Button>
          </Tooltip>
          <Tooltip title={t('common.cancel')}>
            <Button
              variant="outlined"
              onClick={() => handleCloseModal({}, 'buttonClick')}
              disabled={isSaving}
              sx={{
                '&&': {
                  background: 'transparent !important',
                  border: '1px solid grey !important',
                  color: 'black !important',
                  minWidth: '100px !important',
                },
                '&:hover': {
                  background: 'rgba(0, 0, 0, 0.04) !important',
                  border: '1px solid grey !important',
                },
              }}>
              {t('common.cancel')}
            </Button>
          </Tooltip>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
