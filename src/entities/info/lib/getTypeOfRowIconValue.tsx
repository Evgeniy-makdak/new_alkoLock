/* eslint-disable @typescript-eslint/no-explicit-any */
import type { JSX, ReactNode } from 'react';

import PropTypes from 'prop-types';

import { Chip, type ChipOwnProps, Tooltip } from '@mui/material';

import { ChipCopyTextIcon } from '@shared/ui/copy_text_icon/ChipCopyTextIcon';

import style from '../ui/Info.module.scss';

export interface GetTypeOfRowIconValueProps extends ChipOwnProps {
  copyble?: boolean;
  tooltip?: boolean;
  element?: string | number | ReactNode | JSX.Element;
  copyText?: string | number;
  customStyled?: boolean;
}

export const getTypeOfRowIconValue = ({
  copyble = false,
  tooltip = false,
  element = null,
  copyText,
  customStyled = false,
  ...rest
}: GetTypeOfRowIconValueProps) => {
  if (element) return element;
  const label = { ...rest }?.label || '';
  const count =
    typeof label === 'string' || typeof label === 'number' ? label?.toString().length : 33;

  // Определяем, является ли устройство мобильным
  const isMobile = window.innerWidth <= 768;

  const commonChipStyles = {
    fontSize: '16px',
  };

  const tooltipTitle = copyText ?? ({ ...rest }.label || '');

  // На мобильных устройствах показываем просто текст
  if (isMobile) {
    const textElement = (
      <span className={style.labelText} style={{ display: 'inline-block' }}>
        {label}
      </span>
    );

    return tooltip || count >= 33 ? (
      <Tooltip title={tooltipTitle}>
        <div className={style.wrapperText}>{textElement}</div>
      </Tooltip>
    ) : (
      <div className={style.wrapperText}>{textElement}</div>
    );
  }

  // На десктопе показываем чипы
  const chip = copyble ? (
    <ChipCopyTextIcon copyText={copyText} {...rest} style={style.labelText} />
  ) : (
    <Chip {...rest} className={style.labelText} />
  );

  const shouldApplyCustomChip = [
    'Точка возникновения',
    'Код ответа блока интеграции',
    'Описание ошибки',
  ];

  const castomChip =
    customStyled && shouldApplyCustomChip ? (
      <ChipCopyTextIcon
        copyText={copyText}
        variant="outlined"
        sx={{
          backgroundColor: 'transparent',
          boxSizing: 'border-box',
          border: 'none',
          borderRadius: 0,
          padding: '2px',
          fontSize: '16px',
        }}
        {...rest}
      />
    ) : (
      <Chip {...rest} style={commonChipStyles} />
    );

  return tooltip || count >= 33 ? (
    <Tooltip title={tooltipTitle}>
      <div className={style.wrapperText}>{castomChip}</div>
    </Tooltip>
  ) : (
    <div className={style.wrapperText}>{chip}</div>
  );
};

// Добавляем prop-types для валидации
getTypeOfRowIconValue.propTypes = {
  copyble: PropTypes.bool,
  tooltip: PropTypes.bool,
  element: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.node,
    PropTypes.element,
  ]),
  copyText: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  customStyled: PropTypes.bool,
};
