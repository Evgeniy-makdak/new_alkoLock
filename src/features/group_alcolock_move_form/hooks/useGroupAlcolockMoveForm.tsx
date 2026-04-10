import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToggle } from '@shared/hooks/useToggle';
import { FormCheckbox } from '@shared/ui/form_checkbox';
import { Value, type Values } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useGroupAlcolockMoveFormApi } from '../api/useGroupAlcolockMoveFormApi';
import type { GroupAlcolockMoveFormProps } from '../ui/GroupAlcolockMoveForm';

type GroupAlcolockMoveFormHookInput = {
  alcolock: NonNullable<GroupAlcolockMoveFormProps['alcolock']>;
  close: GroupAlcolockMoveFormProps['close'];
};

export const useGroupAlcolockMoveForm = ({ alcolock, close }: GroupAlcolockMoveFormHookInput) => {
  const { t } = useTranslation();
  const [branchSelect, setBranchSelect] = useState<Values>([]);
  const [withVehicle, setWithVehicle] = useState(false);
  const [openAlert, toggleAlert, closeAlert] = useToggle(false);
  const [error, setError] = useState(false);

  const onSelect = (_type: string, value: string | Value | (string | Value)[]) => {
    setError(false);
    const values = ArrayUtils.getArrayValues(value);
    setBranchSelect(values);
    closeAlert();
  };
  const { moveAlcolock } = useGroupAlcolockMoveFormApi();
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
    moveAlcolock({ alcolockId: alcolock.id, branchId: branchSelect[0]?.value, withVehicle });
    close();
  };
  const alertText = (
    <>
      {t('modals.moveAlcolockAlertP1a')}
      <b>{t('modals.moveAlcolockAlertP1b')}</b>
      {t('modals.moveAlcolockAlertP1c')}
      <br />
      <FormCheckbox
        checkBox={{
          checked: withVehicle,
          onChange(_event, checked) {
            setWithVehicle(checked);
          },
        }}
        label={t('modals.moveAlcolockKeepVehicleLinks')}
      />
      <br />
      <br />
      {t('modals.moveAlcolockAlertP2')}
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
