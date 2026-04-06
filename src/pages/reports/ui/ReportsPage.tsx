import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BarChartIcon from '@mui/icons-material/BarChart';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { type Theme, alpha, useTheme } from '@mui/material/styles';

import { PageWrapper } from '@layout/page_wrapper';
import { UsersApi } from '@shared/api/baseQuerys';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import { aggregateReportData } from '../lib/aggregateReportData';
import { buildReportsEventsQuery } from '../lib/buildReportsEventsQuery';
import {
  fetchAllDeviceEventsForReport,
  fetchReportEventsTotalCount,
  isReportFetchAbortError,
} from '../lib/fetchAllDeviceEventsForReport';
import { REPORT_OVERSIZE_THRESHOLD, reportGenerationStore } from '../model/reportGenerationStore';
import { reportsFiltersStore } from '../model/reportsFiltersStore';
import styles from './Reports.module.scss';
import { ReportsCharts } from './ReportsCharts';
import { ReportsFilterPanel } from './ReportsFilterPanel';
import { ReportsMobileToolbar } from './ReportsMobileToolbar';

const outlineModalButtonSx = (theme: Theme) => ({
  textTransform: 'uppercase' as const,
  borderRadius: 1,
  py: 1,
  px: 2,
  color: theme.palette.text.primary,
  borderColor: theme.palette.text.primary,
  '&:hover': {
    borderColor: theme.palette.text.primary,
    backgroundColor: alpha(theme.palette.text.primary, 0.04),
  },
});

export function ReportsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);

  const branchId = appStore((s) => s.selectedBranchState?.id);
  const userEmail = appStore((s) => s.email);

  const startDate = reportsFiltersStore((s) => s.startDate);
  const endDate = reportsFiltersStore((s) => s.endDate);
  const resetAll = reportsFiltersStore((s) => s.resetAll);
  const setStartDate = reportsFiltersStore((s) => s.setStartDate);
  const setEndDate = reportsFiltersStore((s) => s.setEndDate);
  const clearDates = reportsFiltersStore((s) => s.clearDates);

  const isGenerating = reportGenerationStore((s) => s.isGenerating);
  const lastAggregates = reportGenerationStore((s) => s.lastAggregates);
  const lastError = reportGenerationStore((s) => s.lastError);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [permission, setPermission] = useState<string[]>([]);
  const [role, setRole] = useState<number[]>([]);

  const [oversizeOpen, setOversizeOpen] = useState(false);
  const [oversizeCount, setOversizeCount] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const response = await UsersApi.getInfo();
        const roles =
          response.data?.groupMembership?.map((m) => Number(m?.group?.id)).filter(Boolean) || [];
        setPermission(response.data?.permissions || []);
        setCurrentUserId(Number(response.data?.id) || null);
        setRole(roles);
      } catch {
        setPermission([]);
        setCurrentUserId(null);
        setRole([]);
      }
    })();
  }, []);

  const buildQuery = useCallback(
    (page: number, limit: number) => {
      const st = reportsFiltersStore.getState();
      return buildReportsEventsQuery({
        page,
        limit,
        searchQuery: '',
        startDate: st.startDate,
        endDate: st.endDate,
        filters: st.filters,
        currentUserId,
        permission,
        role,
        branchId,
      });
    },
    [branchId, currentUserId, permission, role],
  );

  const executeReportLoad = useCallback(async () => {
    reportGenerationStore.getState().start();
    const signal = reportGenerationStore.getState().getAbortSignal();
    try {
      const raw = await fetchAllDeviceEventsForReport(
        (page) => buildQuery(page, 200),
        (loaded, total) => reportGenerationStore.getState().setProgress(loaded, total),
        signal,
      );
      reportGenerationStore.getState().completeSuccess(aggregateReportData(raw));
    } catch (e) {
      if (isReportFetchAbortError(e) || (e instanceof DOMException && e.name === 'AbortError')) {
        reportGenerationStore.getState().finishCancelled();
        return;
      }
      reportGenerationStore
        .getState()
        .completeError(e instanceof Error ? e.message : t('reports.loadError'));
    }
  }, [buildQuery, t]);

  const beginReportGeneration = useCallback(async () => {
    if (reportGenerationStore.getState().isGenerating) {
      return;
    }
    reportGenerationStore.getState().prepareNewReportView();
    try {
      const total = await fetchReportEventsTotalCount((page) => buildQuery(page, 1));
      if (total >= REPORT_OVERSIZE_THRESHOLD) {
        setOversizeCount(total);
        setOversizeOpen(true);
        return;
      }
      await executeReportLoad();
    } catch (e) {
      reportGenerationStore
        .getState()
        .completeError(e instanceof Error ? e.message : t('reports.loadError'));
    }
  }, [buildQuery, executeReportLoad, t]);

  const handleConfirmOversize = useCallback(() => {
    setOversizeOpen(false);
    void executeReportLoad();
  }, [executeReportLoad]);

  const handleResetFilters = () => {
    resetAll();
    reportGenerationStore.getState().clearResults();
  };

  const emailLabel = userEmail?.trim() || t('reports.emailUnknown');

  const isCompactHeader = isMobile || isTablet;

  return (
    <>
      {isMobile || isTablet ? <div style={{ height: '50px' }} /> : null}
      <PageWrapper>
        <div className={styles.wrapper}>
          <div className={styles.titleBlock}>
            <Typography component="h1" className={styles.title} sx={{ color: 'text.primary' }}>
              {isCompactHeader ? t('nav.reports') : t('reports.pageTitle')}
            </Typography>
          </div>

          {isCompactHeader ? (
            <ReportsMobileToolbar
              onCreateReport={() => void beginReportGeneration()}
              onResetFilters={handleResetFilters}
              isGenerating={isGenerating}
            />
          ) : (
            <>
              <TableHeaderWrapper>
                <InputsDates
                  onClear={clearDates}
                  inputStartTestId={
                    testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FROM_DATE
                  }
                  inputEndTestId={
                    testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_TO_DATE
                  }
                  onChangeStartDate={setStartDate}
                  onChangeEndDate={setEndDate}
                  valueStartDatePicker={startDate}
                  valueEndDatePicker={endDate}
                />
                <TableHeaderEndToolbar>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<BarChartIcon />}
                    disabled={isGenerating}
                    onClick={() => void beginReportGeneration()}
                    sx={{
                      textTransform: 'capitalize',
                      fontWeight: 500,
                      fontSize: '14px',
                      letterSpacing: '0.1px',
                      borderRadius: '10px',
                      height: '30px',
                      minWidth: '112px',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      borderColor:
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.16)' : '#e0e0e0',
                      color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.87)' : '#333333',
                      '& .MuiButton-startIcon svg': {
                        fill: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.87)' : '#333333',
                      },
                      '&:hover': {
                        bgcolor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.10)'
                            : 'rgba(0,0,0,0.04)',
                        borderColor:
                          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.22)' : '#bdbdbd',
                      },
                      '&.Mui-disabled': {
                        borderColor:
                          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e0e0e0',
                        color:
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.30)'
                            : 'rgba(0,0,0,0.26)',
                      },
                    }}>
                    {t('reports.createReport')}
                  </Button>
                  <ResetFilters reset={handleResetFilters} />
                </TableHeaderEndToolbar>
              </TableHeaderWrapper>

              <ReportsFilterPanel />
            </>
          )}

          <div className={styles.scrollArea}>
            {lastError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {lastError}
              </Alert>
            ) : null}
            {isGenerating && !lastAggregates ? (
              <Typography color="text.secondary">{t('common.loading')}</Typography>
            ) : (
              <ReportsCharts data={lastAggregates} />
            )}
          </div>
        </div>
      </PageWrapper>

      <Dialog
        open={oversizeOpen}
        disableEnforceFocus
        onClose={(_, reason) => {
          if (reason === 'backdropClick') return;
          setOversizeOpen(false);
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
          sx: {
            minWidth: { xs: 'min(100%, 520px)', sm: 550 },
            maxWidth: 560,
            borderRadius: '16px',
            backgroundImage: 'none',
            bgcolor: 'background.paper',
            color: 'text.primary',
            position: 'relative',
            p: 0,
          },
        }}>
        <Tooltip title={t('common.closeWindow')}>
          <IconButton
            aria-label={t('common.closeWindow')}
            onClick={() => setOversizeOpen(false)}
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

        <Typography
          component="div"
          sx={{
            px: 3.5,
            pt: 2.5,
            pr: 6,
            pb: 0,
            fontSize: 18,
            fontWeight: 'bold',
          }}>
          {t('reports.oversizeDialogTitle')}
        </Typography>

        <DialogContent
          sx={{
            px: 3.5,
            pt: 2,
            pb: 1,
            color: 'text.primary',
            typography: 'body1',
          }}>
          {t('reports.oversizeDialogBody', {
            count: oversizeCount,
            email: emailLabel,
          })}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3.5,
            pb: 2.5,
            pt: 1,
            justifyContent: 'flex-end',
            gap: 2,
          }}>
          <Button
            variant="outlined"
            onClick={handleConfirmOversize}
            sx={outlineModalButtonSx(theme)}>
            {t('reports.oversizeContinue')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setOversizeOpen(false)}
            sx={outlineModalButtonSx(theme)}>
            {t('common.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
