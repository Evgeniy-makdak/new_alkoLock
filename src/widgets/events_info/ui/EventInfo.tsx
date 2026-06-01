/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { enqueueSnackbar } from 'notistack';

import { Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { Image } from '@entities/image';
import { Info } from '@entities/info';
import { InfoClickableChipValue } from '@entities/info/ui/InfoClickableChipValue';
import { TypeOfRows } from '@entities/info/lib/getTypeOfRowIconLabel';
import { AlcolocksApi, CarsApi, UsersApi } from '@shared/api/baseQuerys';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { copyContent } from '@shared/lib/copyText';
import { appStore } from '@shared/model/app_store/AppStore';
import { Loader } from '@shared/ui/loader';
import { Formatters } from '@shared/utils/formatters';

import { useEventInfo } from '../hooks/useEventInfo';

interface EventInfoProps {
  selectedEventId: string | number;
  onHasDeviceErrorChange?: (hasError: boolean) => void;
  isAdditionalDataTab?: boolean;
  onHasTemperatureSensor?: (hasSensor: boolean) => void; // Новый пропс
}

export const EventInfo = ({
  selectedEventId,
  onHasDeviceErrorChange,
  isAdditionalDataTab = false,
  onHasTemperatureSensor,
}: EventInfoProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, fields, hasTemperatureSensor } = useEventInfo(selectedEventId);
  const hasDeviceError = data?.events[0]?.eventType?.startsWith('Ошибка') || false;
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
  const ensureUserAccess = useCallback(
    async (userId: string | number) => {
      const response = await UsersApi.getUser(userId);
      if (isErrorResponse(response)) {
        showNavigateError(response);
        return false;
      }
      return true;
    },
    [t],
  );
  const ensureVehicleAccess = useCallback(
    async (vehicleId: string | number) => {
      const response = await CarsApi.getCar(vehicleId);
      if (isErrorResponse(response)) {
        showNavigateError(response);
        return false;
      }
      return true;
    },
    [t],
  );
  const ensureAlcolockAccess = useCallback(
    async (alcolockId: string | number) => {
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
        selectedEventId,
      },
    }),
    [location.hash, location.pathname, location.search, location.state, selectedEventId],
  );

  const handleNavigateToUser = useCallback(
    async (userId: string | number) => {
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
        const firstContent: Array<{ id: string | number }> = firstData?.content ?? [];
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
          const content: Array<{ id: string | number }> = (response?.data as any)?.content ?? [];
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

  const handleNavigateToVehicle = useCallback(
    async (registrationNumber: string) => {
      const selectedBranchId = appStore.getState().selectedBranchState?.id;
      const pageSize = 25;
      const normalizedRegNumber = String(registrationNumber || '').trim();
      if (!normalizedRegNumber) return;
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
        const firstContent: Array<{ id: string | number; registrationNumber?: string }> =
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
          const content: Array<{ id: string | number; registrationNumber?: string }> =
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
    [ensureVehicleAccess, navigate, returnNavigation],
  );

  const handleNavigateToAlcolock = useCallback(
    async (alcolockId: string | number) => {
      const selectedBranchId = appStore.getState().selectedBranchState?.id;
      const pageSize = 25;
      if (!alcolockId) return;
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
        const firstContent: Array<{ id: string | number }> = firstData?.content ?? [];
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
          const content: Array<{ id: string | number }> = (response?.data as any)?.content ?? [];
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
    if (!data) return fields;

    const userId = data?.userAction?.id ?? data?.events?.[0]?.user?.id;
    const userName = Formatters.nameFormatter(data?.userAction);
    const carString = Formatters.carNameFormatter(data?.vehicleRecord);
    const carForCopy = Formatters.carNameFormatter(data?.vehicleRecord, false, false);
    const regNumber = data?.vehicleRecord?.registrationNumber;
    const alcolockId = data?.device?.id;
    const alcolockSerialNumber = data?.device?.serialNumber;
    const alcolockSerialNumberText =
      alcolockSerialNumber != null ? String(alcolockSerialNumber) : '';
    const canNavigateUser = Boolean(userId && !isPlaceholderValue(userName));
    const canNavigateVehicle = Boolean(
      !isPlaceholderValue(regNumber) && !isPlaceholderValue(carString),
    );
    const canNavigateAlcolock = Boolean(
      alcolockId && !isPlaceholderValue(alcolockSerialNumberText),
    );

    const renderClickableChipValue = (
      label: string,
      onNavigate: () => void,
      onCopy: () => void,
    ) => (
      <InfoClickableChipValue
        label={label}
        onNavigate={onNavigate}
        onCopy={onCopy}
        theme={theme}
      />
    );
    return fields.map((field) => {
      const value = field?.value;
      if (!value || Array.isArray(value)) return field;

      if (field?.type === TypeOfRows.USER && field?.label === t('info.user') && canNavigateUser) {
        return {
          ...field,
          value: {
            ...value,
            copyble: false,
            element: renderClickableChipValue(
              userName,
              () => {
                void handleNavigateToUser(userId);
              },
              () => copyContent(String(userName).trim(), () => {}),
            ),
          },
        };
      }

      if (
        field?.type === TypeOfRows.CAR &&
        field?.label === t('info.vehicle') &&
        canNavigateVehicle
      ) {
        return {
          ...field,
          value: {
            ...value,
            copyble: false,
            element: renderClickableChipValue(
              carString,
              () => {
                void handleNavigateToVehicle(regNumber);
              },
              () => copyContent(carForCopy || carString, () => {}),
            ),
          },
        };
      }

      if (
        field?.type === TypeOfRows.SERIAL_NUMBER &&
        field?.label === t('info.alcolockSerialNumber') &&
        canNavigateAlcolock
      ) {
        return {
          ...field,
          value: {
            ...value,
            copyble: false,
            element: renderClickableChipValue(
              alcolockSerialNumberText,
              () => {
                void handleNavigateToAlcolock(alcolockId);
              },
              () => copyContent(alcolockSerialNumberText.trim(), () => {}),
            ),
          },
        };
      }

      return field;
    });
  }, [
    data,
    fields,
    handleNavigateToAlcolock,
    handleNavigateToUser,
    handleNavigateToVehicle,
    t,
    theme.palette.mode,
  ]);

  useEffect(() => {
    onHasDeviceErrorChange?.(hasDeviceError);
    onHasTemperatureSensor?.(hasTemperatureSensor); // Передаем информацию о датчике
  }, [hasDeviceError, hasTemperatureSensor]);

  return (
    <Loader isLoading={isLoading}>
      <Stack overflow={'auto'} padding={2}>
        {!isAdditionalDataTab && data?.summary?.photoFileName && (
          <Stack alignItems={'center'} justifyContent={'center'} width="100%" minHeight={410}>
            <Image url={data.summary.photoFileName} />
          </Stack>
        )}
        <Info fields={preparedFields} />
      </Stack>
    </Loader>
  );
};
