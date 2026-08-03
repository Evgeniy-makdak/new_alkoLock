/* eslint-disable @typescript-eslint/no-unused-vars */
import { useTranslation } from 'react-i18next';

import { Stack, Typography } from '@mui/material';

import { ActivateForm } from '@entities/alkozamki_activate_form';
import { TimeCell } from '@entities/time_cell';
import {
  mobileFeaturesStore,
  selectMobileFeatureFlags,
} from '@shared/model/mobile_features_store/mobileFeaturesStore';
import type { IAlcolock, IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Button, ButtonsType } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';

import { useServiceMode } from '../hooks/ServiceModeContext';
import { useAlkozamkiServiceMode } from '../hooks/useAlkozamkiServiceMode';
import style from './AlkozamkiServiceMode.module.scss';

interface AlkozamkiServiceModeProps {
  deviceAction?: IDeviceAction;
  alkolock: IAlcolock;
  refetch?: () => void;
  handleCloseAside: () => void;
  activeDeviceIds?: number[];
  autoServiceType?: string; // 👈 добавляем новый пропс
}

export const AlkozamkiServiceMode = ({
  deviceAction,
  alkolock,
  refetch,
  handleCloseAside,
  activeDeviceIds,
  autoServiceType, // 👈 получаем autoServiceType из пропсов
}: AlkozamkiServiceModeProps) => {
  const { t } = useTranslation();
  const {
    getButtons,
    handleActivate,
    handleCloseActivatePopup,
    handleDeactivate,
    openActivatePopup,
    openDeactivatePopup,
    toggleActivatePopup,
    toggleDeactivatePopup,
    isLoadingActivateServiceModeMutation,
    modeResetAt,
    hasTime,
  } = useAlkozamkiServiceMode(deviceAction, alkolock, handleCloseAside);
  const { isServiceModeFromAlkolock } = useServiceMode();
  const { serviceModeDriverRequestsEnabled } = mobileFeaturesStore(selectMobileFeatureFlags);
  const initialTime = modeResetAt ? new Date(modeResetAt) : new Date();

  // Определяем, нужно ли показывать таймер (если есть modeResetAt, даже если режим "Сервисный")
  const shouldShowTimer = Boolean(modeResetAt) && alkolock.mode === 'Сервисный';
  const timerId = alkolock.id ?? 0;

  return (
    <>
      <div className={style.alcolockServiceMode}>
        <Stack spacing={2} direction="column" alignItems="center" width="100%">
          <span className={style.name}>{t('serviceMode.label')}</span>
          {shouldShowTimer && (
            <Stack
              spacing={2}
              direction="row"
              justifyContent="center"
              alignItems="center"
              width="100%">
              <Typography fontSize={22} fontWeight={600}>
                {t('serviceMode.turnOffIn')}
              </Typography>
              <Typography fontSize={22} fontWeight={400}>
                <TimeCell refetch={refetch} time={initialTime} id={timerId} />
              </Typography>
            </Stack>
          )}
          {alkolock.mode === 'Аварийный' && (
            <Typography fontSize={22} fontWeight={400} color="error">
              {t('serviceMode.emergencyModeActivated')}
            </Typography>
          )}
          {alkolock.mode === 'Сервисный' && !shouldShowTimer && (
            <Typography fontSize={22} fontWeight={400} color="primary">
              {t('serviceMode.activatedByServiceWorker')}
            </Typography>
          )}
          {!serviceModeDriverRequestsEnabled && (
            <Typography
              fontSize={22}
              fontWeight={400}
              color="error"
              sx={{
                maxWidth: 346,
                px: 2,
                boxSizing: 'border-box',
                textAlign: 'center',
                whiteSpace: 'pre-line',
              }}>
              {t('serviceMode.featureTemporarilyBlocked')}
            </Typography>
          )}
          {getButtons()}
        </Stack>
      </div>
      <Popup
        isOpen={openActivatePopup}
        headerTitle={t('serviceMode.activatePrompt')}
        toggleModal={toggleActivatePopup}
        body={
          <ActivateForm
            isLoading={isLoadingActivateServiceModeMutation}
            onValidSubmit={(duration) => {
              handleCloseActivatePopup();
              handleActivate(duration);
            }}
            handleClosePopup={handleCloseActivatePopup}
          />
        }
      />
      <Popup
        isOpen={openDeactivatePopup}
        headerTitle={t('serviceMode.deactivatePrompt')}
        toggleModal={toggleDeactivatePopup}
        buttons={[
          <Button
            key={'action_1'}
            typeButton={ButtonsType.action}
            onClick={() => {
              handleDeactivate();
              toggleDeactivatePopup();
            }}>
            {t('serviceMode.disable')}
          </Button>,
          <Button key={'action_2'} typeButton={ButtonsType.action} onClick={toggleDeactivatePopup}>
            {t('serviceMode.no')}
          </Button>,
        ]}
      />
    </>
  );
};
