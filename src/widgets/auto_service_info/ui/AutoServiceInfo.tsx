import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { enqueueSnackbar } from 'notistack';

import { useTheme } from '@mui/material/styles';

import { Info } from '@entities/info';
import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import { InfoClickableChipValue } from '@entities/info/ui/InfoClickableChipValue';
import { AlkozamkiServiceMode } from '@features/alkozamki_service_mode';
import { CarsApi, UsersApi } from '@shared/api/baseQuerys';
import { Permissions } from '@shared/config/permissionsEnums';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { copyContent } from '@shared/lib/copyText';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Loader } from '@shared/ui/loader';
import { Formatters } from '@shared/utils/formatters';

import { useAutoServiceInfo } from '../hooks/useAutoServiceInfo';
import style from './AutoServiceInfo.module.scss';

interface AutoServiceInfoProps {
  selectedId: string | number | null;
  handleCloseAside: () => void;
}

export const AutoServiceInfo = ({ selectedId, handleCloseAside }: AutoServiceInfoProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const stableHandleClose = useCallback(() => {
    handleCloseAside();
  }, [handleCloseAside]);

  const { deviceAction, fields, isLoading, activeDeviceIds } = useAutoServiceInfo(
    selectedId,
    stableHandleClose,
  );

  const permissions = appStore((state) => state.permissions);
  const isGlobalAdmin = permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);

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
  const returnNavigation = useMemo(
    () => ({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: {
        ...(typeof location.state === 'object' && location.state ? (location.state as object) : {}),
        selectedId,
      },
    }),
    [location.hash, location.pathname, location.search, location.state, selectedId],
  );

  const handleNavigateToVehicle = useCallback(
    async (registrationNumber: string) => {
      const selectedBranchId = appStore.getState().selectedBranchState?.id;
      const pageSize = 25;
      const normalizedRegNumber = String(registrationNumber || '').trim();
      if (!normalizedRegNumber) return;
      try {
        const baseOptions: any = {
          limit: pageSize,
          query: '&all.isActive.in=true',
        };
        // Для глобального администратора не используем фильтрацию по филиалу
        if (!isGlobalAdmin && selectedBranchId) {
          baseOptions.filterOptions = { branchId: selectedBranchId };
        }
        const first = await CarsApi.getCarsList({ ...baseOptions, page: 0 });
        if (isErrorResponse(first)) {
          return showNavigateError(first);
        }
        const firstData = first?.data as any;
        const firstContent: Array<{ id: ID; registrationNumber?: string }> =
          firstData?.content ?? [];
        const firstMatch = firstContent.find(
          (item) => String(item?.registrationNumber || '').trim() === normalizedRegNumber,
        );
        if (firstMatch?.id != null) {
          const hasAccess = await ensureVehicleAccess(firstMatch.id);
          if (!hasAccess) return;
          navigate(RoutePaths.transport, {
            state: { selectedId: firstMatch.id, targetPage: 0, returnNavigation },
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
          const response = await CarsApi.getCarsList({ ...baseOptions, page });
          if (isErrorResponse(response)) {
            return showNavigateError(response);
          }
          const content: Array<{ id: ID; registrationNumber?: string }> =
            (response?.data as any)?.content ?? [];
          const match = content.find(
            (item) => String(item?.registrationNumber || '').trim() === normalizedRegNumber,
          );
          if (match?.id != null) {
            const hasAccess = await ensureVehicleAccess(match.id);
            if (!hasAccess) return;
            navigate(RoutePaths.transport, {
              state: { selectedId: match.id, targetPage: page, returnNavigation },
            });
            return;
          }
        }
      } catch (error) {
        return showNavigateError(error);
      }
    },
    [ensureVehicleAccess, navigate, returnNavigation, isGlobalAdmin],
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

  const handleNavigateToUser = useCallback(
    async (userId: ID) => {
      const selectedBranchId = appStore.getState().selectedBranchState?.id;
      const pageSize = 25;
      if (!userId) return;
      try {
        const baseOptions: any = {
          limit: pageSize,
        };
        // Для глобального администратора не используем фильтрацию по филиалу
        if (!isGlobalAdmin && selectedBranchId) {
          baseOptions.filterOptions = { branchId: selectedBranchId };
        }
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
    [ensureUserAccess, navigate, returnNavigation, isGlobalAdmin],
  );

  const preparedFields = useMemo(() => {
    const vehicle = deviceAction?.vehicleRecord;
    const registrationNumber = vehicle?.registrationNumber;
    const car = vehicle ? Formatters.carNameFormatter(vehicle) : '';
    const carForCopy = vehicle ? Formatters.carNameFormatter(vehicle, false, false) : '';
    const linkedByUser = deviceAction?.userAction;
    const linkedByUserId = linkedByUser?.id;
    const linkedByName = linkedByUser ? Formatters.nameFormatter(linkedByUser) : '';
    const canNavigateVehicle = Boolean(registrationNumber && !isPlaceholderValue(car));
    const canNavigateUser = Boolean(linkedByUserId && !isPlaceholderValue(linkedByName));

    if (!canNavigateVehicle && !canNavigateUser) return fields;

    return fields.map((field) => {
      const value = field?.value;
      if (!value || Array.isArray(value)) {
        return field;
      }

      // Чип-переход для "Установлен на ТС"
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
                label={String(car)}
                onNavigate={() => {
                  void handleNavigateToVehicle(String(registrationNumber));
                }}
                onCopy={() => copyContent(String(carForCopy || car), () => {})}
                theme={theme}
              />
            ),
          },
        };
      }

      // Чип-переход для "Кем привязан"
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
                label={String(linkedByName)}
                onNavigate={() => {
                  void handleNavigateToUser(linkedByUserId);
                }}
                onCopy={() => copyContent(String(linkedByName).trim(), () => {})}
                theme={theme}
              />
            ),
          },
        };
      }

      return field;
    });
  }, [
    deviceAction?.vehicleRecord,
    deviceAction?.userAction,
    fields,
    handleNavigateToVehicle,
    handleNavigateToUser,
    t,
    theme,
  ]);

  return (
    <Loader isLoading={isLoading} props={{ className: 'asideInfoFillPanel' }}>
      <div className={style.autoServiceInfoFill}>
        <div className={style.autoServiceInfo}>
          <div className={style.autoServiceInfoBody}>
            <Info fields={preparedFields} />
          </div>

          {deviceAction?.device && (
            <div className={style.autoServiceInfoService}>
              <AlkozamkiServiceMode
                alkolock={deviceAction?.device}
                deviceAction={deviceAction}
                handleCloseAside={handleCloseAside}
                activeDeviceIds={activeDeviceIds}
              />
            </div>
          )}
        </div>
      </div>
    </Loader>
  );
};
