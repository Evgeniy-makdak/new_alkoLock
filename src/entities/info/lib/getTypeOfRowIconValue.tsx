/* eslint-disable @typescript-eslint/no-explicit-any */
import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react';

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

import style from '../ui/Info.module.scss';

export interface GetTypeOfRowIconValueProps extends ChipOwnProps {
  copyble?: boolean;
  tooltip?: boolean;
  element?: string | number | ReactNode | JSX.Element;
  copyText?: string | number;
  customStyled?: boolean;
}

const MobileExpandableValue = ({ text, copyValue }: { text: string; copyValue: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [copiedOpen, setCopiedOpen] = useState(false);
  const textRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const measureOverflow = () => {
      const node = textRef.current;
      if (!node) return;
      setIsTruncated(node.scrollWidth > node.clientWidth + 1);
    };

    measureOverflow();
    window.addEventListener('resize', measureOverflow);
    return () => window.removeEventListener('resize', measureOverflow);
  }, [text]);

  const fallbackCopy = (value: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  };

  const handleCopy = async () => {
    let copied = false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(copyValue);
        copied = true;
      } else {
        fallbackCopy(copyValue);
        copied = true;
      }
    } catch {
      try {
        fallbackCopy(copyValue);
        copied = true;
      } catch {
        copied = false;
      }
    }

    setIsOpen(false);
    setCopiedOpen(true);

    return copied;
  };

  return (
    <>
      <button
        type="button"
        className={style.mobileValueButton}
        onClick={() => {
          if (isTruncated) setIsOpen(true);
        }}>
        <span
          ref={textRef}
          className={`${style.labelText} ${style.mobileValueText} ${isTruncated ? style.mobileValueTextTruncated : ''}`}>
          {text}
        </span>
      </button>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        fullWidth
        maxWidth="sm"
        className={style.mobileValueDialog}>
        <Box className={style.mobileValueDialogContent}>
          <Typography className={style.mobileValueDialogTitle}>Полное значение</Typography>
          <Typography className={style.mobileValueDialogText}>{text}</Typography>
          <Box className={style.mobileValueDialogActions}>
            <Button
              variant="outlined"
              startIcon={<ContentCopyOutlinedIcon />}
              onClick={() => {
                void handleCopy();
              }}
              className={`${style.mobileValueDialogButton} ${style.mobileValueDialogButtonSecondary}`}>
              Копировать
            </Button>
            <Button
              variant="outlined"
              onClick={() => setIsOpen(false)}
              className={`${style.mobileValueDialogButton} ${style.mobileValueDialogButtonPrimary}`}>
              Закрыть
            </Button>
          </Box>
        </Box>
      </Dialog>
      <Snackbar
        open={copiedOpen}
        autoHideDuration={1500}
        onClose={() => setCopiedOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Box className={style.mobileCopiedToast} onClick={() => setCopiedOpen(false)}>
          Скопировано
        </Box>
      </Snackbar>
    </>
  );
};

const buildCommonChipStyles = (hasSemanticColor: boolean, theme?: Theme) => {
  const isDark = theme?.palette.mode === 'dark';
  return {
    maxWidth: '100%',
    height: '28px',
    borderRadius: '16px',
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
) => {
  if (element) return element;
  const label = { ...rest }?.label || '';
  const hasSemanticColor = Boolean(rest?.color && rest.color !== 'default');
  const count =
    typeof label === 'string' || typeof label === 'number' ? label?.toString().length : 33;

  // Определяем, является ли устройство мобильным
  const isMobile = window.innerWidth <= 768;

  const commonChipStyles = buildCommonChipStyles(hasSemanticColor, theme);

  const tooltipTitle = copyText ?? ({ ...rest }.label || '');

  // На мобильных устройствах показываем просто текст
  if (isMobile) {
    const labelAsText =
      typeof label === 'string' || typeof label === 'number' ? label.toString() : null;
    const copyValue = copyText != null ? String(copyText) : labelAsText || '';

    if (labelAsText) {
      return (
        <div className={style.wrapperText}>
          <MobileExpandableValue text={labelAsText} copyValue={copyValue} />
        </div>
      );
    }

    const textElement = (
      <span className={style.labelText} style={{ display: 'inline-block' }}>
        {label}
      </span>
    );

    return <div className={style.wrapperText}>{textElement}</div>;
  }

  // На десктопе показываем чипы
  const chip = copyble ? (
    <ChipCopyTextIcon copyText={copyText} {...rest} style={style.labelText} />
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
