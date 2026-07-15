/* eslint-disable prettier/prettier */

/* eslint-disable no-console */

/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable no-case-declarations */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { testids } from '@shared/const/testid';
import { useToggle } from '@shared/hooks/useToggle';
import { appStore } from '@shared/model/app_store/AppStore';
import {
  mobileFeaturesStore,
  selectMobileFeatureFlags,
} from '@shared/model/mobile_features_store/mobileFeaturesStore';
import {
  EventType,
  type IAlcolock,
  type ID,
  type IDeviceAction,
} from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';
import { SearchMethods } from '@shared/utils/global_methods';
import { useDeviceStatus } from '@widgets/alkozamki_info/DeviceStatusContext';

import { useAlkozamkiServiceModeApi } from '../api/useAlkozamkiServiceModeApi';
import { ServiceModeInfoActionTypes } from '../lib/const';
import { serviceModeInfoMapper } from '../lib/serviceModeInfoMapper';
import style from '../ui/AlkozamkiServiceMode.module.scss';
import { useServiceMode } from './ServiceModeContext';

export const useAlkozamkiServiceMode = (
  deviceAction: IDeviceAction,
  alkolock: IAlcolock,
  handleCloseAside: () => void,
) => {
  const { t } = useTranslation();
  const { deviceStatuses, deviceIds, deviceStatusMap } = useDeviceStatus(); // 👈 получение статусов, ID и карты из контекста
  const prevDeviceStatusesRef = useRef<string[]>([]); // 👈 для отслеживания предыдущего значения статусов
  const prevDeviceIdsRef = useRef<number[]>([]); // 👈 для отслеживания предыдущего значения ID
  const prevDeviceStatusMapRef = useRef<Map<number, string>>(new Map()); // 👈 для отслеживания предыдущей карты
  const [isActivateButtonClicked, setIsActivateButtonClicked] = useState(false); // 👈 для отслеживания статуса нажатия кнопки Включить
  const [isDeactivateButtonClicked, setIsDeactivateButtonClicked] = useState(false); // 👈 для отслеживания статуса нажатия кнопки Выключить

  useEffect(() => {
    // Сравниваем текущие статусы с предыдущими
    const hasStatusChanged =
      JSON.stringify(deviceStatuses) !== JSON.stringify(prevDeviceStatusesRef.current);

    if (hasStatusChanged) {
      prevDeviceStatusesRef.current = deviceStatuses;
    }

    // Сравниваем текущие ID с предыдушими
    const hasIdsChanged = JSON.stringify(deviceIds) !== JSON.stringify(prevDeviceIdsRef.current);

    if (hasIdsChanged) {
      prevDeviceIdsRef.current = deviceIds;
    }

    // Сравниваем текущую карту с предыдущей
    const hasMapChanged =
      JSON.stringify(Array.from(deviceStatusMap.entries())) !==
      JSON.stringify(Array.from(prevDeviceStatusMapRef.current.entries()));

    if (hasMapChanged) {
      prevDeviceStatusMapRef.current = new Map(deviceStatusMap);
    }
  }, [deviceStatuses, deviceIds, deviceStatusMap]);

  const {
    activateServiceModeMutation,
    cancelMutation,
    rejectActivateServiceMutate,
    seenMutate,
    acceptActivateServiceMutate,
    isLoadingActivateServiceModeMutation,
  } = useAlkozamkiServiceModeApi();

  // 👇 добавлены состояния для отслеживания режимов устройства
  const [isServiceModeFromAlkolock, setIsServiceModeFromAlkolockState] = useState(false);
  const [isCrushModeFromAlkolock, setIsCrushModeFromAlkolockState] = useState(false);

  const hasCreatePermission = appStore((state) =>
    state.permissions?.includes('PERMISSION_SERVICE_MODE_CREATE'),
  );
  const { serviceModeRequestsEnabled } = mobileFeaturesStore(selectMobileFeatureFlags);

  const [openActivatePopup, toggleActivatePopup] = useToggle();
  const [openDeactivatePopup, toggleDeactivatePopup] = useToggle();
  const { setIsServiceModeFromAlkolock } = useServiceMode(); // Деструктуризация из контекста
  const { permissions: storePermissionsFromServiceMode } = appStore();
  const devicePermissions =
    storePermissionsFromServiceMode?.filter((p) => p.includes('SERVICE_MODE')) || [];
  const hasServiceModeEdit = devicePermissions.includes('PERMISSION_SERVICE_MODE_EDIT');
  const hasServiceModeCreate = devicePermissions.includes('PERMISSION_SERVICE_MODE_CREATE');

  useEffect(() => {
    const isServiceMode = alkolock?.mode === 'Рабочий';
    const isCrushMode = alkolock?.mode === 'Аварийный';

    setIsServiceModeFromAlkolockState(isServiceMode);
    setIsCrushModeFromAlkolockState(isCrushMode);
    setIsServiceModeFromAlkolock(isServiceMode);
  }, [alkolock?.mode, setIsServiceModeFromAlkolock]);

  useEffect(() => {
    if (!deviceAction || deviceAction?.seen) return;
    const lastEvent = SearchMethods.findMostRecentEvent(deviceAction?.events);
    const requestType = SearchMethods.findFirstRequestEvent(deviceAction?.events)?.eventType;
    const isAcknowledged = !!(deviceAction?.events ?? []).find(
      (event) => event.eventType === EventType.ACCEPTED,
    );

    if (
      [EventType.OFFLINE_DEACTIVATION, EventType.OFFLINE_ACTIVATION].includes(
        lastEvent?.eventType,
      ) ||
      isAcknowledged ||
      ([EventType.REJECTED, EventType.ACCEPTED].includes(lastEvent?.eventType) &&
        requestType === EventType.SERVER_REQUEST)
    ) {
      seenMutate(deviceAction?.id);
    }
  }, [deviceAction]);

  const handleCloseActivatePopup = () => {
    toggleActivatePopup();
  };

  const handleCancelActivate = (id: ID) => {
    if (!id) {
      return;
    }
    cancelMutation(id);
  };

  const handleRejectActivateService = (id: ID) => {
    if (!id) {
      return;
    }
    rejectActivateServiceMutate(id);
  };

  const handleAcceptActivateService = (id: ID) => {
    if (!id) {
      return;
    }
    acceptActivateServiceMutate(id);
  };

  const clickTimeRef = useRef(0);
  const deactivateClickTimeRef = useRef(0); // 👈 отдельный ref для кнопки Выключить

  const handleActivate = (duration: number) => {
    setIsActivateButtonClicked(true);
    clickTimeRef.current = Date.now(); // Запоминаем время нажатия
    activateServiceModeMutation({
      duration: duration,
      deviceId: alkolock?.id,
      isDeactivate: false,
    });
  };

  const handleDeactivate = () => {
    setIsDeactivateButtonClicked(true);
    deactivateClickTimeRef.current = Date.now(); // 👈 запоминаем время нажатия для кнопки Выключить
    activateServiceModeMutation({
      isDeactivate: true,
      deviceId: alkolock?.id,
      duration: 0,
    });
  };

  // Сервисный режим, активированный сервисным работником (без таймера от оператора)
  const isActivatedByServiceWorker =
    alkolock?.mode === 'Сервисный' && !alkolock?.modeResetAt;

  // 👇 проверка совпадения id (преобразуем alkolock.id в число для сравнения)
  const alkolockIdNumber = alkolock?.id ? Number(alkolock.id) : null;

  // 👇 проверка статуса устройства для активации кнопки (используем карту статусов)
  const currentDeviceStatus =
    alkolockIdNumber !== null ? deviceStatusMap.get(alkolockIdNumber) : null;

  // 👇 ИСПРАВЛЕННАЯ ЛОГИКА: проверяем наличие активной заявки для данного устройства
  const hasActiveRequest = currentDeviceStatus === 'ACTIVE';

  // 👇 ПРАВИЛЬНАЯ логика блокировки кнопки Включить:
  // Кнопка должна быть ЗАБЛОКИРОВАНА если:
  // 1. Есть активная заявка (ACTIVE) ИЛИ
  // 2. Кнопка уже нажата (isActivateButtonClicked)
  const shouldDisableActivateButton =
    hasActiveRequest || isActivateButtonClicked || isActivatedByServiceWorker;

  // 👇 Логика для отображения надписи о активной заявке
  const shouldShowRequestMessage = hasActiveRequest;

  // 👇 ПРАВИЛЬНАЯ логика блокировки кнопки Выключить:
  // Кнопка должна быть ЗАБЛОКИРОВАНА если:
  // 1. Есть активная заявка (ACTIVE) ИЛИ
  // 2. Устройство в рабочем режиме (isServiceModeFromAlkolock) ИЛИ
  // 3. Кнопка уже нажата (isDeactivateButtonClicked) ИЛИ
  // 4. Сервисный режим активирован сервисным работником
  const shouldDisableDeactivateButton =
    hasActiveRequest ||
    isServiceModeFromAlkolock ||
    isDeactivateButtonClicked ||
    isActivatedByServiceWorker;

  // 👇 СБРОС СОСТОЯНИЙ КНОПОК ПРИ ИЗМЕНЕНИИ СТАТУСА УСТРОЙСТВА
  useEffect(() => {
    // Если активной заявки больше нет, сбрасываем состояния кнопок
    if (!hasActiveRequest) {
      setIsActivateButtonClicked(false);
      setIsDeactivateButtonClicked(false);
    }
  }, [hasActiveRequest]);

  const initialStatusRef = useRef<string | null | undefined>(null);

  useEffect(() => {
    if (isActivateButtonClicked && initialStatusRef.current === null) {
      initialStatusRef.current = currentDeviceStatus;
    }

    if (!isActivateButtonClicked) return;

    // Разблокируем только если прошло больше 100мс с момента нажатия
    // Это гарантирует, что кнопка успеет заблокироваться визуально
    if (
      (currentDeviceStatus === 'COMPLETED' || currentDeviceStatus === 'INVALID') &&
      Date.now() - clickTimeRef.current > 100
    ) {
      setIsActivateButtonClicked(false);
      initialStatusRef.current = null;
    }
  }, [currentDeviceStatus, isActivateButtonClicked]);

  useEffect(() => {
    if (!isDeactivateButtonClicked) return;

    // Разблокируем если статус COMPLETED или INVALID И прошло больше 100мс с момента нажатия
    // Это гарантирует, что кнопка успеет заблокироваться визуально
    if (
      (currentDeviceStatus === 'COMPLETED' || currentDeviceStatus === 'INVALID') &&
      Date.now() - deactivateClickTimeRef.current > 100
    ) {
      setIsDeactivateButtonClicked(false);
    }
  }, [currentDeviceStatus, isDeactivateButtonClicked]);

  const getButtons = () => {
    try {
      const serviceModeInfo = serviceModeInfoMapper(deviceAction, alkolock);

      if (serviceModeInfo.action) {
        const time = Formatters.parseISO8601Duration(serviceModeInfo.duration);
        const timeFormat = time ? `${time.hours}:${time.minutes}:${time.seconds}` : '-';

        switch (serviceModeInfo.type) {
          case EventType.SERVER_REQUEST:
            // Если аварийный режим, скрываем текст и показываем только кнопку отмены
            if (isCrushModeFromAlkolock) {
              return (
                <>
                  <span>{t('serviceMode.deviceInEmergencyMode')}</span>
                  <div className={style.toggles}>
                    <button
                      className={hasServiceModeCreate ? style.cancel : style.disabled}
                      onClick={() => {
                        if (!hasServiceModeCreate) return;
                        handleCancelActivate(serviceModeInfo.action?.id);
                        handleCloseAside();
                      }}
                      disabled={!hasServiceModeCreate}>
                      {t('serviceMode.cancel')}
                    </button>
                  </div>
                </>
              );
            }

            const servText =
              serviceModeInfo.action.type === ServiceModeInfoActionTypes.SERVICE_MODE_DEACTIVATE ? (
                <span>
                  <b>{t('serviceMode.deactivation')}</b>
                </span>
              ) : serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_ACTIVATE ? (
                <span>
                  <b>{t('serviceMode.activationOn', { time: timeFormat })}</b>
                </span>
              ) : (
                '-'
              );
            return (
              <>
                {servText}
                <div className={style.toggles}>
                  <button
                    className={hasServiceModeCreate ? style.cancel : style.disabled}
                    onClick={() => {
                      if (!hasServiceModeCreate) return;
                      handleCancelActivate(serviceModeInfo.action?.id);
                      handleCloseAside();
                    }}
                    disabled={!hasServiceModeCreate}>
                    {t('serviceMode.cancel')}
                  </button>
                </div>
              </>
            );
          case EventType.APP_REQUEST:
            // Если аварийный режим, блокируем только кнопку "Принять", кнопку "Отклонить" оставляем активной
            if (isCrushModeFromAlkolock) {
              const appTextCrush =
                serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_DEACTIVATE ? (
                  <span>
                    <b>{t('serviceMode.deactivation')}</b>
                  </span>
                ) : serviceModeInfo.action.type ===
                  ServiceModeInfoActionTypes.SERVICE_MODE_ACTIVATE ? (
                  <span>{/* <b>{t('serviceMode.activationOn', { time: timeFormat })}</b> */}</span>
                ) : (
                  '-'
                );
              return (
                <>
                  {appTextCrush}
                  <div className={style.toggles}>
                    <button className={style.disabled} disabled={true}>
                      {t('serviceMode.accept')}
                    </button>
                    <button
                      className={hasServiceModeEdit ? style.cancel : style.disabled}
                      onClick={() => {
                        handleRejectActivateService(serviceModeInfo.action?.id);
                        handleCloseAside();
                      }}
                      disabled={!hasServiceModeEdit}>
                      {t('serviceMode.reject')}
                    </button>
                  </div>
                </>
              );
            }

            const appText =
              serviceModeInfo.action.type === ServiceModeInfoActionTypes.SERVICE_MODE_DEACTIVATE ? (
                <span>
                  <b>{t('serviceMode.deactivation')}</b>
                </span>
              ) : serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_ACTIVATE ? (
                <span>
                  <b>{t('serviceMode.activationOn', { time: timeFormat })}</b>
                </span>
              ) : (
                '-'
              );
            return (
              <>
                {appText}
                <div className={style.toggles}>
                  <button
                    className={hasServiceModeEdit ? style.accept : style.disabled}
                    onClick={() => {
                      if (isCrushModeFromAlkolock) return; // Защита от клика
                      handleAcceptActivateService(serviceModeInfo.action?.id);
                      handleCloseAside();
                    }}
                    disabled={!hasServiceModeEdit || isCrushModeFromAlkolock}>
                    {t('serviceMode.accept')}
                  </button>

                  <button
                    className={hasServiceModeEdit ? style.cancel : style.disabled}
                    onClick={() => {
                      if (isCrushModeFromAlkolock) return; // Защита от клика
                      handleRejectActivateService(serviceModeInfo.action?.id);
                      handleCloseAside();
                    }}
                    disabled={!hasServiceModeEdit || isCrushModeFromAlkolock}>
                    {t('serviceMode.reject')}
                  </button>
                </div>
              </>
            );
          case EventType.REJECTED:
            if (serviceModeInfo.requestType === 'Запрос сервера') {
              return serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_DEACTIVATE ? (
                <span>{t('serviceMode.deactivationRejected')}</span>
              ) : serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_ACTIVATE ? (
                <span>{t('serviceMode.activationRejected')}</span>
              ) : (
                '-'
              );
            } else if (serviceModeInfo.requestType === 'Запрос приложения') {
              if (serviceModeInfo.isAcknowledged) {
                return <span>{t('serviceMode.rejectionConfirmed')}</span>;
              } else {
                return <span>{t('serviceMode.awaitingAppConfirmation')}</span>;
              }
            } else {
              return <span>{t('serviceMode.awaitingAppConfirmation')}</span>;
            }
          case EventType.ACCEPTED:
            if (serviceModeInfo.requestType === EventType.SERVER_REQUEST) {
              return serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_ACTIVATE ? (
                <span>{t('serviceMode.activationConfirmed')}</span>
              ) : serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_DEACTIVATE ? (
                <span>{t('serviceMode.deactivationConfirmed')}</span>
              ) : (
                '-'
              );
            } else if (serviceModeInfo.requestType === EventType.APP_REQUEST) {
              if (serviceModeInfo.isAcknowledged) {
                return <span>{t('serviceMode.confirmedByApp')}</span>;
              } else {
                return <span>{t('serviceMode.awaitingAppConfirmation')}</span>;
              }
            } else {
              return <span>{t('serviceMode.awaitingAppConfirmation')}</span>;
            }
          case EventType.OFFLINE_DEACTIVATION:
            return <span>{t('serviceMode.deactivatedOffline')}</span>;
          case EventType.OFFLINE_ACTIVATION:
            return <span>{t('serviceMode.activatedOffline')}</span>;
          default:
            return null;
        }
      } else {
        const disableButtons = !hasCreatePermission;
        const disableEnableByFeature = !serviceModeRequestsEnabled;
        // const disableOffButton = !hasTime || disableButtons;

        return (
          <div
            className={style.toggles}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
              <button
                data-testid={
                  testids.page_alcolocks.alcolocks_widget_info
                    .ALCOLOCKS_WIDGET_INFO_AVTOSERVISE_BUTTON_ON
                }
                className={
                  isServiceModeFromAlkolock &&
                  !disableButtons &&
                  !disableEnableByFeature &&
                  !shouldDisableActivateButton &&
                  !isCrushModeFromAlkolock
                    ? style.active
                    : style.disabled
                }
                onClick={
                  isServiceModeFromAlkolock &&
                  !disableButtons &&
                  !disableEnableByFeature &&
                  !shouldDisableActivateButton &&
                  !isCrushModeFromAlkolock
                    ? () => {
                        toggleActivatePopup();
                      }
                    : null
                }
                disabled={
                  disableButtons ||
                  disableEnableByFeature ||
                  shouldDisableActivateButton ||
                  isCrushModeFromAlkolock
                }>
                {t('serviceMode.enable')}
              </button>
              <button
                data-testid={
                  testids.page_alcolocks.alcolocks_widget_info
                    .ALCOLOCKS_WIDGET_INFO_AVTOSERVISE_BUTTON_OFF
                }
                className={
                  !shouldDisableDeactivateButton && !isCrushModeFromAlkolock
                    ? style.active
                    : style.disabled
                }
                onClick={
                  !shouldDisableDeactivateButton && !isCrushModeFromAlkolock
                    ? () => {
                        toggleDeactivatePopup();
                      }
                    : null
                }
                disabled={shouldDisableDeactivateButton}>
                {t('serviceMode.disable')}
              </button>
            </div>
            {shouldShowRequestMessage && (
              <div
                style={{
                  color: '#ff6b00',
                  fontSize: '14px',
                  fontWeight: '500',
                  textAlign: 'center',
                  padding: '8px 12px',
                  backgroundColor: '#fff8f0',
                  border: '1px solid #ffd9b3',
                  borderRadius: '6px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}>
                {t('serviceMode.activeRequestMessage')}
              </div>
            )}
          </div>
        );
      }
    } catch (err) {
      return <>{t('serviceMode.displayError')}</>;
    }
  };

  const modeResetAt = alkolock?.modeResetAt || null;
  const hasTime = Boolean(modeResetAt);

  return {
    getButtons,
    handleDeactivate,
    openActivatePopup,
    openDeactivatePopup,
    handleCloseActivatePopup,
    handleActivate,
    toggleActivatePopup,
    toggleDeactivatePopup,
    isLoadingActivateServiceModeMutation,
    modeResetAt,
    hasTime,
  };
};
