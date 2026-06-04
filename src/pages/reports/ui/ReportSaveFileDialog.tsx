import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import {
  Backdrop,
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import type { ReportExportFormat } from '@pages/reports/api/reportsApi';
import { reportGenerationStore } from '@pages/reports/model/reportGenerationStore';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { Button, ButtonsType } from '@shared/ui/button';

type ReportSaveFileDialogProps = {
  open: boolean;
  exportFormat: ReportExportFormat;
  onClose: () => void;
};

export function ReportSaveFileDialog({ open, exportFormat, onClose }: ReportSaveFileDialogProps) {
  const { t } = useTranslation();
  const [reportName, setReportName] = useState('');
  const isExporting = reportGenerationStore((s) => s.isExporting);

  useEffect(() => {
    if (open) setReportName('');
  }, [open]);

  const handleSave = async () => {
    const ok = await reportGenerationStore
      .getState()
      .exportDisplayedReport(exportFormat, reportName.trim());
    if (ok) onClose();
  };

  if (!open) return null;

  return (
    <Backdrop
      open
      onClick={onClose}
      sx={{
        zIndex: 1300,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(0, 0, 0, 0.5)',
      }}>
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
            {t('reports.saveReportModalTitle')}
          </Typography>
          <Tooltip title={t('common.closeWindow')}>
            <IconButton
              edge="end"
              onClick={onClose}
              disabled={isExporting}
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
          <TextField
            fullWidth
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            label={
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5 }}>
                {t('reports.composeReportNameLabel')}
                <Box
                  component="span"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    color: 'text.secondary',
                    letterSpacing: 0,
                  }}>
                  {t('reports.filterFunctionOptionalBadge')}
                </Box>
              </Box>
            }
            placeholder={t('reports.composeReportNamePlaceholder')}
            disabled={isExporting}
            InputProps={{
              endAdornment: reportName ? (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setReportName('')}
                    edge="end"
                    disabled={isExporting}
                    aria-label={t('datePicker.clear')}>
                    <Tooltip title={t('datePicker.clear')}>
                      <ClearIcon />
                    </Tooltip>
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <ButtonFormWrapper>
            <Button
              type="button"
              typeButton={ButtonsType.action}
              disabled={isExporting}
              isLoading={isExporting}
              onClick={handleSave}>
              {t('common.save')}
            </Button>
            <Button type="button" disabled={isExporting} onClick={onClose}>
              {t('common.cancel')}
            </Button>
          </ButtonFormWrapper>
        </Stack>
      </Box>
    </Backdrop>
  );
}
