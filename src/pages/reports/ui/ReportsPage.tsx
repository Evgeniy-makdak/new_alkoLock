import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BarChartIcon from '@mui/icons-material/BarChart';
import { Alert, Button, Typography, useMediaQuery } from '@mui/material';

import { PageWrapper } from '@layout/page_wrapper';
import { UsersApi } from '@shared/api/baseQuerys';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { breakpoints } from '@widgets/nav_bar/breakpoints';

import { type ReportAggregates, aggregateReportData } from '../lib/aggregateReportData';
import { buildReportsEventsQuery } from '../lib/buildReportsEventsQuery';
import { fetchAllDeviceEventsForReport } from '../lib/fetchAllDeviceEventsForReport';
import { reportsFiltersStore } from '../model/reportsFiltersStore';
import styles from './Reports.module.scss';
import { ReportsCharts } from './ReportsCharts';
import { ReportsFilterPanel } from './ReportsFilterPanel';

export function ReportsPage() {
  const { t } = useTranslation();
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);

  const [searchQuery, setSearchQuery] = useState('');

  const branchId = appStore((s) => s.selectedBranchState?.id);

  const startDate = reportsFiltersStore((s) => s.startDate);
  const endDate = reportsFiltersStore((s) => s.endDate);
  const resetAll = reportsFiltersStore((s) => s.resetAll);
  const setStartDate = reportsFiltersStore((s) => s.setStartDate);
  const setEndDate = reportsFiltersStore((s) => s.setEndDate);
  const clearDates = reportsFiltersStore((s) => s.clearDates);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [permission, setPermission] = useState<string[]>([]);
  const [role, setRole] = useState<number[]>([]);

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

  const [aggregates, setAggregates] = useState<ReportAggregates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const st = reportsFiltersStore.getState();
      const raw = await fetchAllDeviceEventsForReport((page) =>
        buildReportsEventsQuery({
          page,
          limit: 200,
          searchQuery,
          startDate: st.startDate,
          endDate: st.endDate,
          filters: st.filters,
          currentUserId,
          permission,
          role,
          branchId,
        }),
      );
      setAggregates(aggregateReportData(raw));
    } catch (e) {
      setAggregates(null);
      setError(e instanceof Error ? e.message : t('reports.loadError'));
    } finally {
      setLoading(false);
    }
  }, [branchId, currentUserId, permission, role, searchQuery, t]);

  const handleResetFilters = () => {
    resetAll();
    setSearchQuery('');
    setAggregates(null);
    setError(null);
  };

  return (
    <>
      {isMobile || isTablet ? <div style={{ height: '50px' }} /> : null}
      <PageWrapper>
        <div className={styles.wrapper}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{t('reports.pageTitle')}</h1>
          </div>

          <TableHeaderWrapper>
            <SearchInput
              testId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_SEARCH_INPUT}
              value={searchQuery}
              onClear={() => setSearchQuery('')}
              setState={setSearchQuery}
            />
            <InputsDates
              onClear={clearDates}
              inputStartTestId={
                testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FROM_DATE
              }
              inputEndTestId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_TO_DATE}
              onChangeStartDate={setStartDate}
              onChangeEndDate={setEndDate}
              valueStartDatePicker={startDate}
              valueEndDatePicker={endDate}
            />
            <TableHeaderEndToolbar>
              <Button
                variant="contained"
                size="small"
                startIcon={<BarChartIcon />}
                disabled={loading}
                onClick={() => void loadReport()}>
                {t('reports.createReport')}
              </Button>
              <ResetFilters reset={handleResetFilters} />
            </TableHeaderEndToolbar>
          </TableHeaderWrapper>

          <ReportsFilterPanel />

          <div className={styles.scrollArea}>
            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : null}
            {loading ? (
              <Typography color="text.secondary">{t('common.loading')}</Typography>
            ) : (
              <ReportsCharts data={aggregates} />
            )}
          </div>
        </div>
      </PageWrapper>
    </>
  );
}
