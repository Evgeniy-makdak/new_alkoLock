/* eslint-disable @typescript-eslint/no-explicit-any */
import { type JSX, type ReactNode } from 'react';

import PropTypes from 'prop-types';

import { Chip, type ChipOwnProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

import { ChipCopyTextIcon } from '@shared/ui/copy_text_icon/ChipCopyTextIcon';
import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';

import style from '../ui/Info.module.scss';

export type GetTypeOfRowIconValueOptions = {
  isMobile?: boolean;
  /** Чип по ширине контента, а не на всю колонку значения */
  compact?: boolean;
};

export interface GetTypeOfRowIconValueProps extends ChipOwnProps {
  copyble?: boolean;
  /** @deprecated Туллтип только при обрезке текста; флаг игнорируется (обратная совместимость). */
  tooltip?: boolean;
  element?: string | number | ReactNode | JSX.Element;
  copyText?: string | number;
  customStyled?: boolean;
}

const buildCommonChipStyles = (
  hasSemanticColor: boolean,
  theme?: Theme,
  compact = false,
) => {
  const isDark = theme?.palette.mode === 'dark';
  return {
    flex: compact ? '0 1 auto' : 1,
    width: compact ? 'auto' : '100%',
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
    tooltip: _tooltip = false,
    element = null,
    copyText,
    customStyled = false,
    ...rest
  }: GetTypeOfRowIconValueProps,
  theme?: Theme,
  options?: GetTypeOfRowIconValueOptions,
) => {
  const compact = options?.compact ?? false;
  if (element) return element;
  const hasSemanticColor = Boolean(rest?.color && rest.color !== 'default');

  const { sx: customChipSx, ...chipRest } = rest;
  const commonChipStyles = buildCommonChipStyles(hasSemanticColor, theme, compact);
  const mergedChipSx: SxProps<Theme> = customChipSx
    ? ([commonChipStyles, customChipSx] as SxProps<Theme>)
    : commonChipStyles;

  // `copyText` иногда приходит как объект (например, для координат lat/lon).
  // Если оставить как есть — в тултип попадёт строка вида "object object".
  // В таком случае берём отображаемый `label`, который уже должен быть строкой.
  const tooltipTitle =
    copyText != null && typeof copyText === 'object'
      ? ({ ...rest }.label || '')
      : copyText ?? ({ ...rest }.label || '');

  const chip = copyble ? (
    <ChipCopyTextIcon
      copyText={copyText}
      {...chipRest}
      compact={compact}
      style={style.labelText}
      sx={mergedChipSx}
    />
  ) : (
    <Chip {...chipRest} className={style.labelText} sx={mergedChipSx} />
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
        compact={compact}
        sx={mergedChipSx}
        {...chipRest}
      />
    ) : (
      <Chip {...chipRest} sx={mergedChipSx} />
    );

  const wrapperClass = `${style.wrapperText}${copyble ? ` ${style.wrapperTextCopyble}` : ''}${
    compact ? ` ${style.wrapperTextCompact}` : ''
  }`;
  const fullText = String(tooltipTitle ?? '');
  const inner = (
    <div className={wrapperClass}>{customStyled && shouldApplyCustomChip ? castomChip : chip}</div>
  );

  // Единое правило: tooltip / PWA-модалка только если текст не помещается в чип.
  return <OverflowTooltip title={fullText}>{inner}</OverflowTooltip>;
};

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
