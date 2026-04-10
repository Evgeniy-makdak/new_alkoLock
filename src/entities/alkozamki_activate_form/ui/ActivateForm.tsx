/* eslint-disable @typescript-eslint/no-unused-vars */
import { useTranslation } from 'react-i18next';

import { TextField } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { Button, ButtonsType } from '@shared/ui/button';
import { Loader } from '@shared/ui/loader';

import { useActivateForm } from '../hooks/useActivateForm';
import style from './ActivateForm.module.scss';

interface ActivateForm {
  onValidSubmit: (duration: number) => void;
  isLoading?: boolean;
  handleClosePopup: () => void;
}

export const ActivateForm = ({ onValidSubmit, isLoading, handleClosePopup }: ActivateForm) => {
  const { t } = useTranslation();
  const { error, duration, handleSubmit, register } = useActivateForm();
  return (
    <Loader isLoading={isLoading}>
      <form onSubmit={handleSubmit((data) => onValidSubmit(data?.duration))}>
        <InputsColumnWrapper>
          <TextField
            helperText={<span className={style.errorMessage}>{error}</span>}
            error={!!duration}
            label={t('serviceMode.activationPeriodHours')}
            {...register('duration')}
            type="number"
          />
        </InputsColumnWrapper>
        <ButtonFormWrapper>
          <Button
            key={'action_1'}
            type="submit"
            disabled={!!duration}
            typeButton={ButtonsType.action}>
            {t('serviceMode.enable')}
          </Button>
          <Button key={'action_2'} typeButton={ButtonsType.action} onClick={handleClosePopup}>
            {t('serviceMode.no')}
          </Button>
        </ButtonFormWrapper>
      </form>
    </Loader>
  );
};
