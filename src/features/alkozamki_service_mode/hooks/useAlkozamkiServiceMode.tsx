/* eslint-disable no-case-declarations */
import { useEffect } from 'react';

import { testids } from '@shared/const/testid';
import { useToggle } from '@shared/hooks/useToggle';
import {
  EventType,
  type IAlcolock,
  type ID,
  type IDeviceAction,
} from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';
import { SearchMethods } from '@shared/utils/global_methods';

import { useAlkozamkiServiceModeApi } from '../api/useAlkozamkiServiceModeApi';
import { ServiceModeInfoActionTypes } from '../lib/const';
import { serviceModeInfoMapper } from '../lib/serviceModeInfoMapper';
import style from '../ui/AlkozamkiServiceMode.module.scss';

export const useAlkozamkiServiceMode = (
  deviceAction: IDeviceAction,
  alkolock: IAlcolock,
  handleCloseAside: () => void,
) => {
  const {
    activateServiceModeMutation,
    cancelMutation,
    rejectActivateServiceMutate,
    seenMutate,
    acceptActivateServiceMutate,
    isLoadingActivateServiceModeMutation,
  } = useAlkozamkiServiceModeApi();

  const [openActivatePopup, toggleActivatePopup] = useToggle();
  const [openDeactivatePopup, toggleDeactivatePopup] = useToggle();
  useEffect(() => {
    if (!deviceAction || deviceAction?.seen) return;
    const lastEvent = SearchMethods.findMostRecentEvent(deviceAction?.events);
    const requestType = SearchMethods.findFirstRequestEvent(deviceAction?.events)?.eventType;
    const isAcknowledged = !!(deviceAction?.events ?? []).find(
      (event) => event.eventType === EventType.APP_ACKNOWLEDGED,
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
    setTimeout(() => {
      toggleDeactivatePopup();
    }, 100);
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

  const handleActivate = (duration: number) => {
    activateServiceModeMutation({
      duration: duration,
      deviceId: alkolock?.id,
      isDeactivate: false,
    });
  };
  const handleDeactivate = () => {
    activateServiceModeMutation({
      isDeactivate: true,
      deviceId: alkolock?.id,
      duration: 0,
    });
  };

  const getButtons = () => {
    try {
      const serviceModeInfo = serviceModeInfoMapper(deviceAction, alkolock);

      const isServiceMode = alkolock?.mode === 'Рабочий';
      if (serviceModeInfo.action) {
        const time = Formatters.parseISO8601Duration(serviceModeInfo.duration);
        const timeFormat = time ? `${time.hours}:${time.minutes}:${time.seconds}` : '-';

        switch (serviceModeInfo.type) {
          case EventType.SERVER_REQUEST:
            const servText =
              serviceModeInfo.action.type === ServiceModeInfoActionTypes.SERVICE_MODE_DEACTIVATE ? (
                <span>
                  <b>Выключение</b>
                </span>
              ) : serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_ACTIVATE ? (
                <span>
                  <b>Включение на {timeFormat}</b>
                </span>
              ) : (
                '-'
              );
            return (
              <>
                {servText}
                <div className={style.toggles}>
                  <button className={style.cursorDefault}>ожидание</button>
                  <button
                    className={style.cancel}
                    onClick={() => {
                      handleCancelActivate(serviceModeInfo.action?.id);
                      handleCloseAside();
                    }}>
                    Отменить
                  </button>
                </div>
              </>
            );
          case EventType.APP_REQUEST:
            const appText =
              serviceModeInfo.action.type === ServiceModeInfoActionTypes.SERVICE_MODE_DEACTIVATE ? (
                <span>
                  <b>Выключение</b>
                </span>
              ) : serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_ACTIVATE ? (
                <span>
                  <b>Включение на {timeFormat}</b>
                </span>
              ) : (
                '-'
              );
            return (
              <>
                {appText}
                <div className={style.toggles}>
                  <button
                    className={style.accept}
                    onClick={() => {
                      handleAcceptActivateService(serviceModeInfo.action?.id);
                      handleCloseAside();
                    }}>
                    Принять
                  </button>

                  <button
                    className={style.cancel}
                    onClick={() => {
                      handleRejectActivateService(serviceModeInfo.action?.id);
                      handleCloseAside();
                    }}>
                    Отклонить
                  </button>
                </div>
              </>
            );
          case EventType.REJECTED:
            if (serviceModeInfo.requestType === 'Запрос сервера') {
              return serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_DEACTIVATE ? (
                <span>
                  <b>Выключение отклонено</b> водителем
                </span>
              ) : serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_ACTIVATE ? (
                <span>
                  <b>Включение отклонено</b> водителем
                </span>
              ) : (
                '-'
              );
            } else if (serviceModeInfo.requestType === 'Запрос приложения') {
              if (serviceModeInfo.isAcknowledged) {
                return <span>Отклонение подтверждено приложением</span>;
              } else {
                return <span>Ожидание подтверждения приложения</span>;
              }
            } else {
              return <span>Ожидание подтверждения приложения</span>;
            }
          case EventType.ACCEPTED:
            if (serviceModeInfo.requestType === EventType.SERVER_REQUEST) {
              return serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_ACTIVATE ? (
                <span>
                  <b>Включение подтверждено</b> водителем
                </span>
              ) : serviceModeInfo.action.type ===
                ServiceModeInfoActionTypes.SERVICE_MODE_DEACTIVATE ? (
                <span>
                  <b>Выключение подтверждено</b> водителем
                </span>
              ) : (
                '-'
              );
            } else if (serviceModeInfo.requestType === EventType.APP_REQUEST) {
              if (serviceModeInfo.isAcknowledged) {
                return <span>Подтверждено приложением</span>;
              } else {
                return <span>Ожидание подтверждения приложения</span>;
              }
            } else {
              return <span>Ожидание подтверждения приложения</span>;
            }
          case EventType.OFFLINE_DEACTIVATION:
            return <span>Выключен в оффлайн-режиме</span>;
          case EventType.OFFLINE_ACTIVATION:
            return <span>Включен в оффлайн-режиме на {timeFormat}</span>;
          default:
            return null;
        }
      } else {
        return (
          <div className={style.toggles}>
            <button
              data-testid={
                testids.page_alcolocks.alcolocks_widget_info
                  .ALCOLOCKS_WIDGET_INFO_AVTOSERVISE_BUTTON_ON
              }
              className={isServiceMode ? style.active : style.disabled}
              onClick={isServiceMode ? toggleActivatePopup : null}>
              Включить
            </button>
            <button
              data-testid={
                testids.page_alcolocks.alcolocks_widget_info
                  .ALCOLOCKS_WIDGET_INFO_AVTOSERVISE_BUTTON_OFF
              }
              className={!isServiceMode ? style.active : style.disabled}
              onClick={!isServiceMode ? toggleDeactivatePopup : null}>
              Выключить
            </button>
          </div>
        );
      }
    } catch (err) {
      return <>Ошибка в отображении сервисного режима</>;
    }
  };

  const modeResetAt = alkolock?.modeResetAt || null;
  const hasTime = modeResetAt && alkolock?.mode === EventType.MAINTENANCE;
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
