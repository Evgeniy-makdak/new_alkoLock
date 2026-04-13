import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Stack, Typography } from '@mui/material';

import { AlcolockSelect } from '@entities/alcolock_select';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import type { ID } from '@shared/types/BaseQueryTypes';
import { AppAlert } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

import { useGroupAlcolocksAddForm } from '../hooks/useGroupAlcolocksAddForm';
import style from './GroupAlcolocksAddForm.module.scss';

type GroupAlcolockAddFormProps = {
  branchId: ID;
  close: () => void;
};

export const GroupAlcolocksAddForm: FC<GroupAlcolockAddFormProps> = ({ branchId, close }) => {
  const { t } = useTranslation();
  const { alcolocks, error, onSelect, onSubmit, showAlert, handleOpenAlert, closeAlert } =
    useGroupAlcolocksAddForm(branchId, close);
  const alertText = (
    <>
      {t('modals.addAlcolocksToGroupAlertP1a')} <b>{t('modals.addAlcolocksToGroupAlertP1b')}</b>.
      <br />
      <br />
      {t('modals.addAlcolocksToGroupAlertP2')}
    </>
  );
  return (
    <div className={style.group}>
      <Typography fontWeight={600} marginBottom={2} variant="h6">
        {t('modals.addAlcolocksToGroupTitle')}
      </Typography>
      <Stack gap={3}>
        <AlcolockSelect
          notInBranch={branchId}
          vieBranch
          multiple
          name="alcolockId"
          error={error}
          value={alcolocks}
          setValueStore={onSelect}
          label={t('filters.searchByAlcolock')}
        />
        {error && <span className={style.errorText}>{t('validation.required')}</span>}

        {!showAlert && (
          <ButtonFormWrapper>
            <Button onClick={handleOpenAlert}>{t('common.add')}</Button>
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
