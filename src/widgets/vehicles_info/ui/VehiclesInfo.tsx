import { type FC, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { Chip, IconButton, Stack, Tooltip } from '@mui/material';

import { Info } from '@entities/info';
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
  const navigate = useNavigate();
  const { isLoading, fields, car } = useVehiclesInfo(selectedCarId, closeTab);

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
          navigate(RoutePaths.alkozamki, { state: { selectedId: alcolockId, targetPage: 0 } });
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
            navigate(RoutePaths.alkozamki, { state: { selectedId: alcolockId, targetPage: page } });
            return;
          }
        }
      } catch {
        // fallback
      }
      navigate(RoutePaths.alkozamki, { state: { selectedId: alcolockId } });
    },
    [navigate],
  );

  const preparedFields = useMemo(() => {
    const alcolock = car?.monitoringDevice;
    const alcolockId = alcolock?.id;
    const serial = alcolock?.serialNumber;
    if (!alcolockId || !serial) return fields;

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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
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
                sx={{
                  maxWidth: '100%',
                  height: '28px',
                  borderRadius: '16px',
                  backgroundColor: '#f5f5f5',
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    px: 1.25,
                  },
                }}
              />
            </div>
          ),
        },
      };
    });
  }, [car?.monitoringDevice, fields, handleNavigateToAlcolock, t]);

  return (
    <Loader isLoading={isLoading}>
      <Stack padding={2}>
        <Info fields={preparedFields} />
      </Stack>
    </Loader>
  );
};
