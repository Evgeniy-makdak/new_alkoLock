/* eslint-disable @typescript-eslint/no-unused-vars */
import { Stack, Typography } from '@mui/material';

import { ActivateForm } from '@entities/alkozamki_activate_form';
import { TimeCell } from '@entities/time_cell';
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
  const initialTime = modeResetAt ? new Date(modeResetAt) : new Date();

  // Определяем, нужно ли показывать таймер (если есть modeResetAt, даже если режим "Сервисный")
  const shouldShowTimer = Boolean(modeResetAt) && alkolock.mode === 'Сервисный';

  return (
    <>
      <div className={style.alcolockServiceMode}>
        <Stack spacing={2} direction="column" alignItems="center" width="100%">
          <span className={style.name}>Сервисный режим:</span>
          {shouldShowTimer && (
            <Stack
              spacing={2}
              direction="row"
              justifyContent="center"
              alignItems="center"
              width="100%">
              <Typography fontSize={22} fontWeight={600}>
                Выключение через
              </Typography>
              <Typography fontSize={22} fontWeight={400}>
                <TimeCell refetch={refetch} time={initialTime} id={alkolock.id} />
              </Typography>
            </Stack>
          )}
          {alkolock.mode === 'Аварийный' && (
            <Typography fontSize={22} fontWeight={400} color="error">
              Активирован аварийный режим
            </Typography>
          )}
          {alkolock.mode === 'Сервисный' && !shouldShowTimer && (
            <Typography fontSize={22} fontWeight={400} color="primary">
              Активирован сервисным работником
            </Typography>
          )}
          {getButtons()}
        </Stack>
      </div>
      <Popup
        isOpen={openActivatePopup}
        headerTitle={'Включить сервисный режим?'}
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
        headerTitle={'Выключить сервисный режим?'}
        toggleModal={toggleDeactivatePopup}
        buttons={[
          <Button
            key={'action_1'}
            typeButton={ButtonsType.action}
            onClick={() => {
              handleDeactivate();
              toggleDeactivatePopup();
            }}>
            {'Выключить'}
          </Button>,
          <Button key={'action_2'} typeButton={ButtonsType.action} onClick={toggleDeactivatePopup}>
            {'Нет'}
          </Button>,
        ]}
      />
    </>
  );
};
