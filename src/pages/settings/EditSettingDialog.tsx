import React from 'react';
import { useTranslation } from 'react-i18next';

import CloseIcon from '@mui/icons-material/Close';
import {
  Backdrop,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { Button } from '@shared/ui/button';

interface EditSettingDialogProps {
  open: boolean;
  isSaving: boolean;
  isSaveEnabled: boolean;
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
  isSaveEnabled,
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
  if (!open || !editingField) return null;

  const unitLabel =
    editingField.unit === 'DAYS'
      ? getDayWord(editValue)
      : editingField.unit === 'MINUTES'
        ? getMinuteWord(editValue)
        : editingField.unit === 'SECONDS'
          ? getSecondWord(editValue)
          : getAttemptWord(editValue);

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: 1300,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={() => handleCloseModal({}, 'buttonClick')}>
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          p: 3.5,
          width: '100%',
          maxWidth: 720,
          minWidth: { xs: 280, sm: 550 },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderRadius: '16px',
          boxShadow: 3,
          maxHeight: '99vh',
          overflow: 'auto',
        }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1,
            mb: 2,
          }}>
          <Typography fontWeight={600} variant="h6" color="text.primary" sx={{ flex: 1, pr: 1 }}>
            {t('modals.editParameter')}
          </Typography>
          <Tooltip title={t('common.closeWindow')}>
            <IconButton
              edge="end"
              onClick={() => handleCloseModal({}, 'buttonClick')}
              aria-label="close"
              sx={{
                mt: -0.5,
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  color: 'text.primary',
                },
              }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Stack gap={3}>
          <Typography gutterBottom sx={{ mb: 0 }}>
            {editingField.label}
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
            error={errors[editingField.name]?.length > 0}
            helperText={errors[editingField.name]?.[0] || ''}
            InputProps={{
              endAdornment: (
                <Typography variant="body2" color="textSecondary">
                  {unitLabel}
                </Typography>
              ),
              inputProps: {
                min: editingField.minValue,
                max: editingField.maxValue,
              },
            }}
          />
          <ButtonFormWrapper>
            <Button type="button" disabled={!isSaveEnabled || isSaving} onClick={handleSave}>
              {t('common.save')}
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={() => handleCloseModal({}, 'buttonClick')}>
              {t('common.cancel')}
            </Button>
          </ButtonFormWrapper>
        </Stack>
      </Box>

      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.modal + 1,
        }}
        open={isSaving}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Backdrop>
  );
};
