import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, type AlertProps, AlertTitle, Collapse, Typography } from '@mui/material';

import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';

import { Button } from '../button';

type AppAlertProps = {
  title: string;
  text?: string | ReactNode;
  onSubmit?: () => void;
  onClose: () => void;
  open: boolean;
  type?: 'button' | 'submit' | 'reset';
} & AlertProps;

export const AppAlert: FC<AppAlertProps> = ({
  onClose,
  onSubmit,
  text,
  type = 'button',
  title,
  open,
  ...rest
}) => {
  const { t } = useTranslation();
  return (
    <Collapse in={open}>
      <Alert {...rest}>
        <AlertTitle>
          <Typography fontSize={16} fontWeight={600}>
            {title}
          </Typography>
        </AlertTitle>
        {text}
        <ButtonFormWrapper>
          <Button type={type} onClick={onSubmit}>
            {t('common.confirm')}
          </Button>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </ButtonFormWrapper>
      </Alert>
    </Collapse>
  );
};
