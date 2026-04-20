/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { Chip, IconButton, Stack, Tooltip, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { Image } from '@entities/image';
import { Info } from '@entities/info';
import { getInfoLinkChipSx } from '@entities/info/lib/getInfoLinkChipSx';
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
  /** Как в EventsMobileTable / мобильных таблицах — только здесь подстраиваем чипы под тёмную тему */
  const isMobileLayout = useMediaQuery('(max-width:1024px)');
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
        const firstData = first?.data as any;
        const firstContent: Array<{ id: string | number }> = firstData?.content ?? [];
        if (firstContent.some((item) => String(item?.id) === String(userId))) {
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
          const content: Array<{ id: string | number }> = (response?.data as any)?.content ?? [];
          if (content.some((item) => String(item?.id) === String(userId))) {
            navigate(RoutePaths.users, {
              state: { selectedId: userId, targetPage: page, returnNavigation },
            });
            return;
          }
        }
      } catch {
        // fallback
      }
      navigate(RoutePaths.users, { state: { selectedId: userId, returnNavigation } });
    },
    [navigate, returnNavigation],
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
        const firstData = first?.data as any;
        const firstContent: Array<{ id: string | number; registrationNumber?: string }> =
          firstData?.content ?? [];
        const firstMatch = firstContent.find(
          (item) => String(item?.registrationNumber || '').trim() === normalizedRegNumber,
        );
        if (firstMatch?.id != null) {
          navigate(RoutePaths.tc, {
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
          const content: Array<{ id: string | number; registrationNumber?: string }> =
            (response?.data as any)?.content ?? [];
          const match = content.find(
            (item) => String(item?.registrationNumber || '').trim() === normalizedRegNumber,
          );
          if (match?.id != null) {
            navigate(RoutePaths.tc, {
              state: { selectedId: match.id, targetPage: page, returnNavigation },
            });
            return;
          }
        }
      } catch {
        // fallback
      }
    },
    [navigate, returnNavigation],
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
        const firstData = first?.data as any;
        const firstContent: Array<{ id: string | number }> = firstData?.content ?? [];
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
          const content: Array<{ id: string | number }> = (response?.data as any)?.content ?? [];
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
              onCopy();
            }}
            sx={{ p: '2px' }}>
            <ContentCopyOutlinedIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        <Chip
          clickable
          variant="outlined"
          size="small"
          label={label}
          onClick={onNavigate}
          sx={getInfoLinkChipSx(theme, isMobileLayout)}
        />
      </div>
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
    isMobileLayout,
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
