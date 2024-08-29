import { ReactNode } from 'react';

import { type ButtonProps, CircularProgress, Button as MuiButton } from '@mui/material';

import style from './Button.module.scss';

type MyButtonProps = {
  children?: ReactNode;
  onClick?: () => void;
  typeButton?: ButtonsType;
  disabled?: boolean;
  isLoading?: boolean;
  testid?: string;
} & Omit<ButtonProps, 'className' | 'onClick' | 'disabled'>;

export enum ButtonsType {
  edit = 'edit',
  new = 'new',
  delete = 'delete',
  action = 'action',
}

const ButtonsTypeStyle = {
  [ButtonsType.edit]: style.edit,
  [ButtonsType.new]: style.newStyle,
  [ButtonsType.delete]: style.deleteStyle,
  [ButtonsType.action]: style.action,
};

export const Button = ({
  children,
  onClick,
  typeButton = ButtonsType.action,
  isLoading = false,
  disabled = false,
  testid,
  ...rest
}: MyButtonProps) => {
  return (
    <MuiButton
      disabled={disabled || isLoading}
      {...rest}
      data-testid={testid}
      className={`button ${ButtonsTypeStyle[typeButton]}`}
      onClick={() => {
        if (!onClick || isLoading) return;
        onClick();
      }}>
      {isLoading ? <CircularProgress size={25} /> : children}
    </MuiButton>
  );
};
