import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Stack, Typography } from '@mui/material';

import { BranchSelect } from '@entities/branch_select';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import type { ID } from '@shared/types/BaseQueryTypes';
import { AppAlert } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

import { useGroupCarMoveForm } from '../hooks/useGroupCarMoveForm';
import style from './GroupCarMoveForm.module.scss';

export type GroupCarMoveFormProps = {
  close: () => void;
  car: { id: ID; text: string } | null;
  targetBranch?: ID;
};

const GroupCarMoveFormInner: FC<{
  car: { id: ID; text: string };
  close: () => void;
  targetBranch?: ID;
}> = ({ car, close, targetBranch }) => {
  const { t } = useTranslation();
  const {
    error,
    branchSelect,
    onSelect,
    handleOpenAlert,
    showAlert,
    closeAlert,
    onSubmit,
    alertText,
  } = useGroupCarMoveForm({
    car,
    close,
  });

  return (
    <>
      <Typography fontSize={16} fontWeight={600} marginBottom={2} variant="h6">
        {t('modals.moveVehicleTitle')} <span className={style.carText}>{car.text}</span>
      </Typography>
      <Stack gap={3}>
        <BranchSelect
          name="branchId"
          error={error}
          value={branchSelect}
          setValueStore={onSelect}
          label={t('modals.searchGroups')}
          filter={targetBranch}
        />
        {error && <span className={style.errorText}>{t('validation.required')}</span>}

        {!showAlert && (
          <ButtonFormWrapper>
            <Button disabled={branchSelect.length === 0} onClick={handleOpenAlert}>
              {t('common.move')}
            </Button>
            <Button onClick={close}>{t('common.cancel')}</Button>
          </ButtonFormWrapper>
        )}
      </Stack>
      <AppAlert
        severity="warning"
        title={t('tooltips.attention')}
        text={alertText}
        onClose={closeAlert}
        onSubmit={onSubmit}
        open={showAlert}
        className={style.alert}
      />
    </>
  );
};

export const GroupCarMoveForm: FC<GroupCarMoveFormProps> = ({ car, close, targetBranch }) => {
  if (!car) return null;
  return <GroupCarMoveFormInner car={car} close={close} targetBranch={targetBranch} />;
};
