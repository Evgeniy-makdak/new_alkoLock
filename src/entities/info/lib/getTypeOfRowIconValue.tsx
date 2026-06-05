/* eslint-disable @typescript-eslint/no-explicit-any */
import { type JSX, type ReactNode } from 'react';

import PropTypes from 'prop-types';

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import {
  Box,
  Button,
  Chip,
  type ChipOwnProps,
  Dialog,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';

import { ChipCopyTextIcon } from '@shared/ui/copy_text_icon/ChipCopyTextIcon';
import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';

import style from '../ui/Info.module.scss';

export type GetTypeOfRowIconValueOptions = {
  isMobile?: boolean;
};

export interface GetTypeOfRowIconValueProps extends ChipOwnProps {
  copyble?: boolean;
  tooltip?: boolean;
  element?: string | number | ReactNode | JSX.Element;
  copyText?: string | number;
  customStyled?: boolean;
}

const buildCommonChipStyles = (hasSemanticColor: boolean, theme?: Theme) => {
  const isDark = theme?.palette.mode === 'dark';
  return {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    height: '28px',
    borderRadius: '16px',
    justifyContent: 'flex-start',
    ...(hasSemanticColor
      ? {}
      : isDark
        ? {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: 'rgba(255, 255, 255, 0.92)',
          }
        : { backgroundColor: '#f5f5f5' }),
    '& .MuiChip-label': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      px: 1.25,
      fontSize: '16px',
      ...(!hasSemanticColor && isDark ? { color: 'rgba(255, 255, 255, 0.92)' } : {}),
    },
  };
};

export const getTypeOfRowIconValue = (
  {
    copyble = false,
    tooltip = false,
    element = null,
    copyText,
    customStyled = false,
    ...rest
  }: GetTypeOfRowIconValueProps,
  theme?: Theme,
  options?: GetTypeOfRowIconValueOptions,
) => {
  const isMobile = options?.isMobile ?? false;
  if (element) return element;
  const label = { ...rest }?.label || '';
  const hasSemanticColor = Boolean(rest?.color && rest.color !== 'default');
  const count =
    typeof label === 'string' || typeof label === 'number' ? label?.toString().length : 33;

  const commonChipStyles = buildCommonChipStyles(hasSemanticColor, theme);

  // `copyText` иногда приходит как объект (например, для координат lat/lon).
  // Если оставить как есть — в тултип попадёт строка вида "object object".
  // В таком случае берём отображаемый `label`, который уже должен быть строкой.
  const tooltipTitle =
    copyText != null && typeof copyText === 'object'
      ? ({ ...rest }.label || '')
      : copyText ?? ({ ...rest }.label || '');

  const chip = copyble ? (
    <ChipCopyTextIcon copyText={copyText} {...rest} style={style.labelText} sx={commonChipStyles} />
  ) : (
    <Chip {...rest} className={style.labelText} sx={commonChipStyles} />
  );

  const shouldApplyCustomChip = [
    'Точка возникновения',
    'Код ответа блока интеграции',
    'Описание ошибки',
  ];

  const castomChip =
    customStyled && shouldApplyCustomChip ? (
      <ChipCopyTextIcon copyText={copyText} variant="outlined" sx={commonChipStyles} {...rest} />
    ) : (
      <Chip {...rest} sx={commonChipStyles} />
    );

  const wrapperClass = `${style.wrapperText}${copyble ? ` ${style.wrapperTextCopyble}` : ''}`;
  const fullText = String(tooltipTitle);
  const inner = <div className={wrapperClass}>{customStyled && shouldApplyCustomChip ? castomChip : chip}</div>;

  if (isMobile) {
    return <OverflowTooltip title={fullText}>{inner}</OverflowTooltip>;
  }

  if (tooltip || count >= 33) {
    return (
      <Tooltip title={fullText}>
        <div className={wrapperClass}>{castomChip}</div>
      </Tooltip>
    );
  }

  return inner;
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
