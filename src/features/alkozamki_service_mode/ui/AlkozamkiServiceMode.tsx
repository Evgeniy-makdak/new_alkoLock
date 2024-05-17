/* eslint-disable @typescript-eslint/no-unused-vars */
import { Stack, Typography } from '@mui/material';

import { AppConstants } from '@app/index';
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
}

export const AlkozamkiServiceMode = ({
  deviceAction,
  alkolock,
  refetch,
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
  } = useAlkozamkiServiceMode(deviceAction, alkolock);

  return (
    <>
      <div className={style.alcolockServiceMode}>
        <Stack spacing={2} direction={'column'}>
          <span className={style.name}>Режим &quot;Автосервис&quot;: </span>
          {/* {getText()} */}
          {hasTime && (
            <Stack spacing={2} direction={'row'}>
              <Typography fontSize={22} fontWeight={600}>
                Выключение через
              </Typography>
              <Typography fontSize={22} fontWeight={400}>
                <TimeCell refetch={refetch} time={modeResetAt} id={alkolock.id} />
              </Typography>
            </Stack>
          )}
          {getButtons()}
        </Stack>
      </div>

      <Popup
        isOpen={openActivatePopup}
        headerTitle={'Включить режим “Автосервис”?'}
        toggleModal={toggleActivatePopup}
        body={
          <ActivateForm
            isLoading={isLoadingActivateServiceModeMutation}
            onValidSubmit={(duration) => (handleCloseActivatePopup(), handleActivate(duration))}
            handleClosePopup={handleCloseActivatePopup}
          />
        }
      />

      <Popup
        isOpen={openDeactivatePopup}
        headerTitle={'Отключить режим “Автосервис”?'}
        toggleModal={toggleDeactivatePopup}
        buttons={[
          <Button key={'action_1'} typeButton={ButtonsType.action} onClick={handleDeactivate}>
            {'Отключить'}
          </Button>,
          <Button key={'action_2'} typeButton={ButtonsType.action} onClick={toggleDeactivatePopup}>
            {AppConstants.cancelTxt}
          </Button>,
        ]}
      />
    </>
  );
};
