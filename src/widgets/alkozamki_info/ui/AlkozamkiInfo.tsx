import { type FC, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { Chip, IconButton, Tooltip } from '@mui/material';

import { Info } from '@entities/info';
import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import { AlkozamkiServiceMode } from '@features/alkozamki_service_mode';
import { CarsApi } from '@shared/api/baseQuerys';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { copyContent } from '@shared/lib/copyText';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Loader } from '@shared/ui/loader';
import { Formatters } from '@shared/utils/formatters';

import { useAlkozamkiInfoApi } from '../api/useAlkozamkiInfoApi';
import { useAlkozamkiInfo } from '../hooks/useAlkozamkiInfo';
// 👈 добавляем импорт
import style from './AlkozamkiInfo.module.scss';

type AlkozamkiInfoProps = {
  closeTab: () => void;
  selectedAlcolockId: ID;
};

export const AlkozamkiInfo: FC<AlkozamkiInfoProps> = ({ selectedAlcolockId, closeTab }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { alkolock, fields, isLoading, activeDeviceIds } = useAlkozamkiInfo(
    selectedAlcolockId,
    closeTab,
  );

  // 👇 получаем autoServiceType из useAlkozamkiInfoApi
  const { autoServiceType } = useAlkozamkiInfoApi(selectedAlcolockId);

  const handleNavigateToVehicle = useCallback(
    async (vehicleId: ID) => {
      const selectedBranchId = appStore.getState().selectedBranchState?.id;
      const pageSize = 25;
      try {
        const baseOptions = {
          limit: pageSize,
          filterOptions: { branchId: selectedBranchId },
          query: '&all.isActive.in=true',
        };
        const first = await CarsApi.getCarsList({ ...baseOptions, page: 0 });
        const firstData = first?.data as any;
        const firstContent: Array<{ id: ID }> = firstData?.content ?? [];
        if (firstContent.some((car) => String(car?.id) === String(vehicleId))) {
          navigate(RoutePaths.tc, { state: { selectedId: vehicleId, targetPage: 0 } });
          return;
        }

        const totalPages = Number(firstData?.totalPages);
        const maxPages = Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;

        for (let page = 1; page < maxPages; page++) {
          const response = await CarsApi.getCarsList({ ...baseOptions, page });
          const content: Array<{ id: ID }> = (response?.data as any)?.content ?? [];
          if (content.some((car) => String(car?.id) === String(vehicleId))) {
            navigate(RoutePaths.tc, { state: { selectedId: vehicleId, targetPage: page } });
            return;
          }
        }
      } catch {
        // fallback to original behavior
      }

      navigate(RoutePaths.tc, { state: { selectedId: vehicleId } });
    },
    [navigate],
  );

  const preparedFields = useMemo(() => {
    const vehicle = alkolock?.vehicleBind?.vehicle;
    const vehicleId = vehicle?.id;
    if (!vehicleId) return fields;

    const car = Formatters.carNameFormatter(vehicle);
    const carForCopy = Formatters.carNameFormatter(vehicle, false, false);
    if (!car || car === '-') return fields;

    return fields.map((field) => {
      const value = field?.value;
      if (
        field?.type !== TypeOfRows.CAR ||
        !value ||
        Array.isArray(value) ||
        field?.label !== t('tables.installedOnVehicle')
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
                    copyContent(carForCopy || car, () => {});
                  }}
                  sx={{ p: '2px' }}>
                  <ContentCopyOutlinedIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Chip
                clickable
                variant="outlined"
                size="small"
                label={car}
                onClick={() => {
                  void handleNavigateToVehicle(vehicleId);
                }}
                sx={{
                  maxWidth: '100%',
                  height: '28px',
                  borderRadius: '16px',
                  backgroundColor: '#eef5ff',
                  borderColor: '#b8d3ff',
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
  }, [alkolock?.vehicleBind?.vehicle, fields, handleNavigateToVehicle, t]);

  return (
    <Loader isLoading={isLoading}>
      <div className={style.alcolockInfo}>
        <Info fields={preparedFields} />

        {alkolock && !!alkolock.vehicleBind && (
          <AlkozamkiServiceMode
            key={selectedAlcolockId}
            alkolock={alkolock}
            handleCloseAside={closeTab} // 👈 передаем функцию закрытия
            activeDeviceIds={activeDeviceIds}
            autoServiceType={autoServiceType} // 👈 передаем autoServiceType
          />
        )}
      </div>
    </Loader>
  );
};
