/* eslint-disable @typescript-eslint/no-explicit-any */
import { type JSX, type ReactNode, useState } from 'react';

import PropTypes from 'prop-types';

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { Box, Button, Chip, type ChipOwnProps, Dialog, Tooltip, Typography } from '@mui/material';

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue);
    } catch {
      // Ignore clipboard errors silently for unsupported environments.
    }
  };

  return (
    <>
      <button type="button" className={style.mobileValueButton} onClick={() => setIsOpen(true)}>
        <span className={style.labelText}>{text}</span>
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
              onClick={handleCopy}
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
    </>
  );
};

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
    const labelAsText =
      typeof label === 'string' || typeof label === 'number' ? label.toString() : null;
    const copyValue = copyText != null ? String(copyText) : labelAsText || '';

    if (labelAsText && (tooltip || count >= 33)) {
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
