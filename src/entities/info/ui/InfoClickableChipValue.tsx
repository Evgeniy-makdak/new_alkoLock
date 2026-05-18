import { useTranslation } from 'react-i18next';

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { Chip, IconButton, Tooltip } from '@mui/material';
import type { Theme } from '@mui/material/styles';

import { getInfoLinkChipSx, getInfoPlainValueChipSx } from '../lib/getInfoLinkChipSx';

type InfoClickableChipValueProps = {
  label: string;
  onNavigate: () => void;
  onCopy: () => void;
  theme: Theme;
  isMobileLayout: boolean;
};

/** Значение в «Инфо» с копированием и переходом: десктоп — серый чип 16px; мобильный layout — как раньше. */
export function InfoClickableChipValue({
  label,
  onNavigate,
  onCopy,
  theme,
  isMobileLayout,
}: InfoClickableChipValueProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
      }}>
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
      <Chip
        clickable
        label={label}
        onClick={onNavigate}
        {...(isMobileLayout
          ? { variant: 'outlined' as const, size: 'small' as const, sx: getInfoLinkChipSx(theme, true) }
          : { sx: getInfoPlainValueChipSx(theme) })}
      />
    </div>
  );
}
