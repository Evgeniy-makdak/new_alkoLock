import { type FC, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { Chip, IconButton, Stack, Tooltip, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { Info } from '@entities/info';
import { getInfoLinkChipSx } from '@entities/info/lib/getInfoLinkChipSx';
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
  const isMobileLayout = useMediaQuery('(max-width:1024px)');
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, fields, car } = useVehiclesInfo(selectedCarId, closeTab);
  const isPlaceholderValue = (value: unknown) => {
    const normalized = String(value ?? '')
      .replace(/\u00A0/g, ' ')
      .trim();
    return !normalized || normalized === '-' || normalized === '—';
  };
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
        const firstData = first?.data as any;
        const firstContent: Array<{ id: ID }> = firstData?.content ?? [];
        if (firstContent.some((item) => String(item?.id) === String(alcolockId))) {
          navigate(RoutePaths.alkozamki, {
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
          const content: Array<{ id: ID }> = (response?.data as any)?.content ?? [];
          if (content.some((item) => String(item?.id) === String(alcolockId))) {
            navigate(RoutePaths.alkozamki, {
              state: { selectedId: alcolockId, targetPage: page, returnNavigation },
            });
            return;
          }
        }
      } catch {
        // fallback
      }
      navigate(RoutePaths.alkozamki, { state: { selectedId: alcolockId, returnNavigation } });
    },
    [navigate, returnNavigation],
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
              }}>
              <Tooltip title={t('tooltips.copy')}>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    copyContent(String(serial).trim(), () => {});
                  }}
                  sx={{ p: '2px' }}>
                  <ContentCopyOutlinedIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Chip
                clickable
                variant="outlined"
                size="small"
                label={serial}
                onClick={() => {
                  void handleNavigateToAlcolock(alcolockId);
                }}
                sx={getInfoLinkChipSx(theme, isMobileLayout)}
              />
            </div>
          ),
        },
      };
    });
  }, [car?.monitoringDevice, fields, handleNavigateToAlcolock, isMobileLayout, t, theme]);

  return (
    <Loader isLoading={isLoading}>
      <Stack padding={2}>
        <Info fields={preparedFields} />
      </Stack>
    </Loader>
  );
};
