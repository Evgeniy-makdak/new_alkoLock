import type { JSX, ReactNode } from 'react';

import { Chip, type ChipOwnProps, Tooltip } from '@mui/material';

import { ChipCopyTextIcon } from '@shared/ui/copy_text_icon/ChipCopyTextIcon';

import style from '../ui/Info.module.scss';

export interface GetTypeOfRowIconValueProps extends ChipOwnProps {
  copyble?: boolean;
  tooltip?: boolean;
  element?: string | number | ReactNode | JSX.Element;
  copyText?: string | number;
}

export const getTypeOfRowIconValue = ({
  copyble = false,
  tooltip = false,
  element = null,
  copyText,
  ...rest
}: GetTypeOfRowIconValueProps) => {
  if (element) return element;
  const label = { ...rest }?.label || '';
  const count =
    typeof label === 'string' || typeof label === 'number' ? label?.toString().length : 31;

  const chip = copyble ? (
    <ChipCopyTextIcon copyText={copyText} {...rest} style={style.labelText} />
  ) : (
    <Chip {...rest} className={style.labelText} />
  );

  return tooltip || count >= 31 ? (
    <Tooltip title={{ ...rest }.label || ''}>
      <div className={style.wrapperText}>{chip}</div>
    </Tooltip>
  ) : (
    <div className={style.wrapperText}>{chip}</div>
  );
};
