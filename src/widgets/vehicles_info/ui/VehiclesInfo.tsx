import { type FC, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { enqueueSnackbar } from 'notistack';

import { Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { Info } from '@entities/info';
import { InfoClickableChipValue } from '@entities/info/ui/InfoClickableChipValue';
import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import { AlcolocksApi } from '@shared/api/baseQuerys';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { copyContent } from '@shared/lib/copyText';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Loader } from '@shared/ui/loader';

import { useVehiclesInfo } from '../hooks/useVehiclesInfo';

type VehiclesInfoProps = {
  selectedCarId: ID;
  closeTab: () => void;
};

export const VehiclesInfo: FC<VehiclesInfoProps> = ({ selectedCarId, closeTab }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, fields, car } = useVehiclesInfo(selectedCarId, closeTab);
  const isPlaceholderValue = (value: unknown) => {
    const normalized = String(value ?? '')
      .replace(/\u00A0/g, ' ')
      .trim();
    return !normalized || normalized === '-' || normalized === '—';
  };
  const showNavigateError = (error: unknown) => {
    const detail =
      (error as any)?.detail ||
      (error as any)?.message ||
      (error as any)?.data?.detail ||
      (error as any)?.data?.message ||
      (error as any)?.response?.data?.detail ||
      (error as any)?.response?.data?.message ||
      (error as Error)?.message ||
      t('errors.accessDenied');
    enqueueSnackbar(` ${detail}`, { variant: 'error' });
  };
  const isErrorResponse = (response: unknown) => {
    const status = (response as any)?.status;
    return Boolean((response as any)?.isError || (typeof status === 'number' && status >= 400));
  };
  const ensureAlcolockAccess = useCallback(
    async (alcolockId: ID) => {
      const response = await AlcolocksApi.getAlkolock(alcolockId);
      if (isErrorResponse(response)) {
        showNavigateError(response);
        return false;
      }
      return true;
    },
    [t],
  );
  const returnNavigation = useMemo(
    () => ({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: {
        ...(typeof location.state === 'object' && location.state ? (location.state as object) : {}),
        selectedId: selectedCarId,
      },
    }),
    [location.hash, location.pathname, location.search, location.state, selectedCarId],
  );

  const handleNavigateToAlcolock = useCallback(
    async (alcolockId: ID) => {
      const selectedBranchId = appStore.getState().selectedBranchState?.id;
      const pageSize = 25;
      if (!alcolockId) {
        return;
      }
      try {
        const baseOptions = {
          limit: pageSize,
          filterOptions: { branchId: selectedBranchId },
        };
        const first = await AlcolocksApi.getListAlcolocks({ ...baseOptions, page: 0 });
        if (isErrorResponse(first)) {
          return showNavigateError(first);
        }
        const firstData = first?.data as any;
        const firstContent: Array<{ id: ID }> = firstData?.content ?? [];
        if (firstContent.some((item) => String(item?.id) === String(alcolockId))) {
          const hasAccess = await ensureAlcolockAccess(alcolockId);
          if (!hasAccess) return;
          navigate(RoutePaths.alcolocks, {
            state: { selectedId: alcolockId, targetPage: 0, returnNavigation },
          });
          return;
        }

        const totalPages = Number(firstData?.totalPages);
        const totalElements = Number(firstData?.totalElements);
        const maxPages =
          Number.isFinite(totalPages) && totalPages > 0
            ? totalPages
            : Number.isFinite(totalElements) && totalElements > 0
              ? Math.ceil(totalElements / pageSize)
              : 1;
        for (let page = 1; page < maxPages; page++) {
          const response = await AlcolocksApi.getListAlcolocks({ ...baseOptions, page });
          if (isErrorResponse(response)) {
            return showNavigateError(response);
          }
          const content: Array<{ id: ID }> = (response?.data as any)?.content ?? [];
          if (content.some((item) => String(item?.id) === String(alcolockId))) {
            const hasAccess = await ensureAlcolockAccess(alcolockId);
            if (!hasAccess) return;
            navigate(RoutePaths.alcolocks, {
              state: { selectedId: alcolockId, targetPage: page, returnNavigation },
            });
            return;
          }
        }
      } catch (error) {
        return showNavigateError(error);
      }
      const hasAccess = await ensureAlcolockAccess(alcolockId);
      if (!hasAccess) return;
      navigate(RoutePaths.alcolocks, { state: { selectedId: alcolockId, returnNavigation } });
    },
    [ensureAlcolockAccess, navigate, returnNavigation],
  );

  const preparedFields = useMemo(() => {
    const alcolock = car?.monitoringDevice;
    const alcolockId = alcolock?.id;
    const serial = alcolock?.serialNumber;
    const serialText = serial != null ? String(serial).trim() : '';
    const canNavigateAlcolock = Boolean(alcolockId && !isPlaceholderValue(serialText));
    if (!canNavigateAlcolock) return fields;

    return fields.map((field) => {
      const value = field?.value;
      if (
        field?.type !== TypeOfRows.SERIAL_NUMBER ||
        field?.label !== t('tables.installedAlcolock') ||
        !value ||
        Array.isArray(value)
      ) {
        return field;
      }

      return {
        ...field,
        value: {
          ...value,
          copyble: false,
                    element: (
            <InfoClickableChipValue
              label={serial}
              onNavigate={() => {
                void handleNavigateToAlcolock(alcolockId);
              }}
              onCopy={() => copyContent(String(serial).trim(), () => {})}
              theme={theme}
            />
          ),
        },
      };
    });
  }, [car?.monitoringDevice, fields, handleNavigateToAlcolock, t, theme]);

  return (
    <Loader isLoading={isLoading}>
      <Stack padding={2}>
        <Info fields={preparedFields} />
      </Stack>
    </Loader>
  );
};
