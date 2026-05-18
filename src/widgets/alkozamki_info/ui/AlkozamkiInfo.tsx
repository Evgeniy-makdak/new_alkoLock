import { type FC, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { enqueueSnackbar } from 'notistack';

import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { Info } from '@entities/info';
import { InfoClickableChipValue } from '@entities/info/ui/InfoClickableChipValue';
import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import { AlkozamkiServiceMode } from '@features/alkozamki_service_mode';
import { CarsApi, UsersApi } from '@shared/api/baseQuerys';
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
  const theme = useTheme();
  const isMobileLayout = useMediaQuery('(max-width:1024px)');
  const navigate = useNavigate();
  const location = useLocation();
  const { alkolock, fields, isLoading, activeDeviceIds } = useAlkozamkiInfo(
    selectedAlcolockId,
    closeTab,
  );

  // 👇 получаем autoServiceType из useAlkozamkiInfoApi
  const { autoServiceType } = useAlkozamkiInfoApi(selectedAlcolockId);
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
  const ensureVehicleAccess = useCallback(
    async (vehicleId: ID) => {
      const response = await CarsApi.getCar(vehicleId);
      if (isErrorResponse(response)) {
        showNavigateError(response);
        return false;
      }
      return true;
    },
    [t],
  );
  const ensureUserAccess = useCallback(
    async (userId: ID) => {
      const response = await UsersApi.getUser(userId);
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
        selectedId: selectedAlcolockId,
      },
    }),
    [location.hash, location.pathname, location.search, location.state, selectedAlcolockId],
  );

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
        if (isErrorResponse(first)) {
          return showNavigateError(first);
        }
        const firstData = first?.data as any;
        const firstContent: Array<{ id: ID }> = firstData?.content ?? [];
        if (firstContent.some((car) => String(car?.id) === String(vehicleId))) {
          const hasAccess = await ensureVehicleAccess(vehicleId);
          if (!hasAccess) return;
          navigate(RoutePaths.tc, {
            state: { selectedId: vehicleId, targetPage: 0, returnNavigation },
          });
          return;
        }

        const totalPages = Number(firstData?.totalPages);
        const maxPages = Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;

        for (let page = 1; page < maxPages; page++) {
          const response = await CarsApi.getCarsList({ ...baseOptions, page });
          if (isErrorResponse(response)) {
            return showNavigateError(response);
          }
          const content: Array<{ id: ID }> = (response?.data as any)?.content ?? [];
          if (content.some((car) => String(car?.id) === String(vehicleId))) {
            const hasAccess = await ensureVehicleAccess(vehicleId);
            if (!hasAccess) return;
            navigate(RoutePaths.tc, {
              state: { selectedId: vehicleId, targetPage: page, returnNavigation },
            });
            return;
          }
        }
      } catch (error) {
        return showNavigateError(error);
      }
      const hasAccess = await ensureVehicleAccess(vehicleId);
      if (!hasAccess) return;
      navigate(RoutePaths.tc, { state: { selectedId: vehicleId, returnNavigation } });
    },
    [ensureVehicleAccess, navigate, returnNavigation],
  );

  const handleNavigateToUser = useCallback(
    async (userId: ID) => {
      const selectedBranchId = appStore.getState().selectedBranchState?.id;
      const pageSize = 25;
      if (!userId) return;

      try {
        const baseOptions = {
          limit: pageSize,
          filterOptions: { branchId: selectedBranchId },
        };
        const first = await UsersApi.getList({ ...baseOptions, page: 0 });
        if (isErrorResponse(first)) {
          return showNavigateError(first);
        }
        const firstData = first?.data as any;
        const firstContent: Array<{ id: ID }> = firstData?.content ?? [];
        if (firstContent.some((item) => String(item?.id) === String(userId))) {
          const hasAccess = await ensureUserAccess(userId);
          if (!hasAccess) return;
          navigate(RoutePaths.users, {
            state: { selectedId: userId, targetPage: 0, returnNavigation },
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
          const response = await UsersApi.getList({ ...baseOptions, page });
          if (isErrorResponse(response)) {
            return showNavigateError(response);
          }
          const content: Array<{ id: ID }> = (response?.data as any)?.content ?? [];
          if (content.some((item) => String(item?.id) === String(userId))) {
            const hasAccess = await ensureUserAccess(userId);
            if (!hasAccess) return;
            navigate(RoutePaths.users, {
              state: { selectedId: userId, targetPage: page, returnNavigation },
            });
            return;
          }
        }
      } catch (error) {
        return showNavigateError(error);
      }
      const hasAccess = await ensureUserAccess(userId);
      if (!hasAccess) return;
      navigate(RoutePaths.users, { state: { selectedId: userId, returnNavigation } });
    },
    [ensureUserAccess, navigate, returnNavigation],
  );

  const preparedFields = useMemo(() => {
    const vehicle = alkolock?.vehicleBind?.vehicle;
    const vehicleId = vehicle?.id;

    const car = Formatters.carNameFormatter(vehicle);
    const carForCopy = Formatters.carNameFormatter(vehicle, false, false);
    const linkedByUserId = alkolock?.vehicleBind?.createdBy?.id;
    const linkedByName = Formatters.nameFormatter(alkolock?.vehicleBind?.createdBy);
    const canNavigateVehicle = Boolean(vehicleId && !isPlaceholderValue(car));
    const canNavigateUser = Boolean(linkedByUserId && !isPlaceholderValue(linkedByName));

    return fields.map((field) => {
      const value = field?.value;
      if (!value || Array.isArray(value)) {
        return field;
      }

      if (
        field?.type === TypeOfRows.CAR &&
        field?.label === t('tables.installedOnVehicle') &&
        canNavigateVehicle
      ) {
        return {
          ...field,
          value: {
            ...value,
            copyble: false,
                        element: (
              <InfoClickableChipValue
                label={car}
                onNavigate={() => {
                  void handleNavigateToVehicle(vehicleId);
                }}
                onCopy={() => copyContent(carForCopy || car, () => {})}
                theme={theme}
                isMobileLayout={isMobileLayout}
              />
            ),
          },
        };
      }

      if (
        field?.type === TypeOfRows.USER &&
        field?.label === t('tables.whoLinked') &&
        canNavigateUser
      ) {
        return {
          ...field,
          value: {
            ...value,
            copyble: false,
                        element: (
              <InfoClickableChipValue
                label={linkedByName}
                onNavigate={() => {
                  void handleNavigateToUser(linkedByUserId);
                }}
                onCopy={() => copyContent(String(linkedByName).trim(), () => {})}
                theme={theme}
                isMobileLayout={isMobileLayout}
              />
            ),
          },
        };
      }

      return field;
    });
  }, [
    alkolock?.vehicleBind?.createdBy,
    alkolock?.vehicleBind?.vehicle,
    fields,
    handleNavigateToUser,
    handleNavigateToVehicle,
    isMobileLayout,
    t,
    theme,
  ]);

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
