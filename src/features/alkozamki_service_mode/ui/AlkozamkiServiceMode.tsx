/* eslint-disable @typescript-eslint/no-unused-vars */
import { Stack, Typography } from '@mui/material';

import { ActivateForm } from '@entities/alkozamki_activate_form';
import { TimeCell } from '@entities/time_cell';
import type { IAlcolock, IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Button, ButtonsType } from '@shared/ui/button';
import { Popup } from '@shared/ui/popup';

import { useAlkozamkiServiceMode } from '../hooks/useAlkozamkiServiceMode';
import style from './AlkozamkiServiceMode.module.scss';

interface AlkozamkiServiceModeProps {
  deviceAction?: IDeviceAction;
  alkolock: IAlcolock;
  refetch?: () => void;
  handleCloseAside: () => void;
}

export const AlkozamkiServiceMode = ({
  deviceAction,
  alkolock,
  refetch,
  handleCloseAside,
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

  // Определение времени для TimeCell
  const initialTime = modeResetAt ? new Date(modeResetAt) : new Date();

  return (
    <>
      <div className={style.alcolockServiceMode}>
        <Stack spacing={2} direction={'column'}>
          <span className={style.name}>Сервисный режим: </span>
          {hasTime && (
            <Stack spacing={2} direction={'row'}>
              <Typography fontSize={22} fontWeight={600} sx={{ marginRight: '30px' }}>
                Выключение через
              </Typography>
              <Typography fontSize={22} fontWeight={400} sx={{ marginLeft: '36px' }}>
                <TimeCell refetch={refetch} time={initialTime} id={alkolock.id} />
              </Typography>
            </Stack>
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
          <Button
            key={'action_2'}
            typeButton={ButtonsType.action}
            onClick={toggleDeactivatePopup}
          >
            {'Нет'}
          </Button>,
        ]}
      />
    </>
  );
};
