import { useTranslation } from 'react-i18next';

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { Chip, IconButton, Tooltip } from '@mui/material';
import type { Theme } from '@mui/material/styles';

import { getInfoClickableValueChipSx } from '../lib/getInfoLinkChipSx';
import style from './Info.module.scss';

type InfoClickableChipValueProps = {
  label: string;
  onNavigate: () => void;
  onCopy: () => void;
  theme: Theme;
};

/** Значение в «Инфо» с копированием и переходом: голубой чип 16px на всю ширину колонки. */
export function InfoClickableChipValue({
  label,
  onNavigate,
  onCopy,
  theme,
}: InfoClickableChipValueProps) {
  const { t } = useTranslation();

  return (
    <div className={`${style.wrapperText} ${style.wrapperTextCopyble}`}>
      <Tooltip title={t('tooltips.copy')}>
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onCopy();
          }}
          sx={{ p: '2px', flexShrink: 0 }}>
          <ContentCopyOutlinedIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Chip clickable label={label} onClick={onNavigate} sx={getInfoClickableValueChipSx(theme)} />
    </div>
  );
}
