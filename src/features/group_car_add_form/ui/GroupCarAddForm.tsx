import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Stack, Typography } from '@mui/material';

import { CarsSelect } from '@entities/cars_select';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import type { ID } from '@shared/types/BaseQueryTypes';
import { AppAlert } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

import { useGroupCarAddForm } from '../hooks/useGroupCarAddForm';
import style from './GroupCarAddForm.module.scss';

type GroupCarAddFormProps = {
  branchId: ID;
  close: () => void;
};

export const GroupCarAddForm: FC<GroupCarAddFormProps> = ({ close, branchId }) => {
  const { t } = useTranslation();
  const { cars, error, onSelect, onSubmit, showAlert, handleOpenAlert, closeAlert } =
    useGroupCarAddForm(branchId, close);
  const alertText = (
    <>
      {t('modals.addVehicleToGroupAlertP1a')} <b>{t('modals.addVehicleToGroupAlertP1b')}</b>.
      <br />
      <br />
      {t('modals.addVehicleToGroupAlertP2')}
    </>
  );
  return (
    <div className={style.group}>
      <Typography fontWeight={600} marginBottom={2} variant="h6">
        {t('modals.addVehicleToGroupTitle')}
      </Typography>
      <Stack gap={3}>
        <CarsSelect
          notInBranch={branchId}
          vieBranch
          multiple
          name="carId"
          error={error}
          value={cars}
          setValueStore={onSelect}
          label={t('filters.searchByVehicle')}
          specified={undefined}
        />
        {error && <span className={style.errorText}>{t('validation.required')}</span>}

        {!showAlert && (
          <ButtonFormWrapper>
            <Button disabled={cars.length === 0} onClick={handleOpenAlert}>
              {t('common.add')}
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
    </div>
  );
};
