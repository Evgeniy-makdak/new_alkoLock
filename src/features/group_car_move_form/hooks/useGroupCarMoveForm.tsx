import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToggle } from '@shared/hooks/useToggle';
import { FormCheckbox } from '@shared/ui/form_checkbox';
import { Value, type Values } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useGroupCarMoveFormApi } from '../api/useGroupCarMoveFormApi';
import type { GroupCarMoveFormProps } from '../ui/GroupCarMoveForm';
import style from '../ui/GroupCarMoveForm.module.scss';

type GroupCarMoveFormHookInput = {
  car: NonNullable<GroupCarMoveFormProps['car']>;
  close: GroupCarMoveFormProps['close'];
};

export const useGroupCarMoveForm = ({ car, close }: GroupCarMoveFormHookInput) => {
  const { t } = useTranslation();
  const [branchSelect, setBranchSelect] = useState<Values>([]);
  const [widthDevice, setWidthDevice] = useState(false);
  const [openAlert, toggleAlert, closeAlert] = useToggle(false);
  const [error, setError] = useState(false);

  const onSelect = (_type: string, value: string | Value | (string | Value)[]) => {
    setError(false);
    const values = ArrayUtils.getArrayValues(value);
    setBranchSelect(values);
    closeAlert();
  };
  const { moveCar } = useGroupCarMoveFormApi();
  const handleOpenAlert = () => {
    if (branchSelect.length === 0) {
      setError(true);
      return;
    }
    toggleAlert();
  };

  const onSubmit = () => {
    if (branchSelect.length === 0) {
      setError(true);
      return;
    }
    closeAlert();
    moveCar({ carId: car.id, branchId: branchSelect[0]?.value, widthDevice });
    close();
  };
  const alertText = (
    <>
      {t('modals.moveVehicleAlertP1a')}
      <b>{t('modals.moveVehicleAlertP1b')}</b>
      {t('modals.moveVehicleAlertP1c')}
      <br />
      <FormCheckbox
        checkBox={{
          checked: widthDevice,
          onChange(_event, checked) {
            setWidthDevice(checked);
          },
        }}
        label={t('modals.moveVehicleKeepAlcolockLinks')}
      />
      <br />
      <b className={style.alertText}>{t('modals.moveVehicleDriverWarning')}</b>
      <br />
      <br />
      {t('modals.moveVehicleAlertP2')}
    </>
  );
  const showAlert = openAlert && !error && branchSelect.length > 0;
  return {
    onSubmit,
    onSelect,
    showAlert,
    handleOpenAlert,
    error,
    branchSelect,
    closeAlert,
    alertText,
  };
};
