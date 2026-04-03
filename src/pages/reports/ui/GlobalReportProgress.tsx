import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Slide from '@mui/material/Slide';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, keyframes, useTheme } from '@mui/material/styles';

import { reportGenerationStore } from '../model/reportGenerationStore';

const pulseSoft = keyframes`
  0% { filter: brightness(1); }
  50% { filter: brightness(1.12); }
  100% { filter: brightness(1); }
`;

function formatEtaSeconds(seconds: number): string {
  const s = Math.max(1, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h} ч ${m} мин`;
  }
  if (m > 0) {
    return `${m} мин ${sec} с`;
  }
  return `${sec} с`;
}

/** Панель прогресса загрузки данных отчёта; не блокирует навигацию по приложению. */
export function GlobalReportProgress() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isGenerating = reportGenerationStore((s) => s.isGenerating);
  const progress = reportGenerationStore((s) => s.progress);
  const loaded = reportGenerationStore((s) => s.loaded);
  const total = reportGenerationStore((s) => s.total);
  const runStartedAt = reportGenerationStore((s) => s.runStartedAt);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isGenerating) {
      return;
    }
    const id = window.setInterval(() => setTick((n) => n + 1), 400);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  const etaText = useMemo(() => {
    if (loaded <= 0 || total <= loaded || runStartedAt == null) {
      return null;
    }
    const elapsedMs = Date.now() - runStartedAt;
    if (elapsedMs < 200) {
      return null;
    }
    const rate = loaded / elapsedMs;
    if (rate <= 0) {
      return null;
    }
    const remainingSec = ((total - loaded) / loaded) * (elapsedMs / 1000);
    return formatEtaSeconds(remainingSec);
  }, [loaded, total, runStartedAt, progress, isGenerating]);

  return (
    <Slide direction="up" in={isGenerating} mountOnEnter unmountOnExit timeout={380}>
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 16, sm: 24 },
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1400,
          px: 2,
        }}>
        <Paper
          elevation={12}
          sx={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: 440,
            p: 2,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
            background:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.97)
                : theme.palette.background.paper,
            boxShadow:
              theme.palette.mode === 'dark'
                ? `0 8px 32px ${alpha('#000', 0.45)}, 0 0 0 1px ${alpha(theme.palette.common.white, 0.06)}`
                : theme.shadows[8],
          }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1.5 }}>
            <AssessmentOutlinedIcon color="primary" sx={{ fontSize: 28, opacity: 0.9, mt: 0.25 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.25 }}>
                {t('reports.progressTitle')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {total > 0
                  ? t('reports.progressLoaded', { loaded, total })
                  : t('reports.progressConnecting')}
              </Typography>
            </Box>
            <Typography
              variant="h6"
              component="span"
              sx={{
                fontWeight: 800,
                color: 'primary.main',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}>
              {progress}%
            </Typography>
            <Tooltip title={t('reports.progressStop')}>
              <IconButton
                aria-label={t('reports.progressStop')}
                color="error"
                size="small"
                onClick={() => reportGenerationStore.getState().abortRun()}
                sx={{ flexShrink: 0, mt: -0.5 }}>
                <StopCircleOutlinedIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            sx={{
              borderRadius: 1,
              overflow: 'hidden',
              animation: `${pulseSoft} 2.2s ease-in-out infinite`,
            }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 12,
                borderRadius: 1,
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.common.white, 0.12)
                    : alpha(theme.palette.common.black, 0.08),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 1,
                  backgroundImage:
                    theme.palette.mode === 'dark'
                      ? `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.info.light})`
                      : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  transition: 'transform 160ms ease-out',
                },
              }}
            />
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1, fontStyle: etaText ? 'normal' : 'italic' }}>
            {etaText
              ? t('reports.progressEta', { time: etaText })
              : t('reports.progressEtaComputing')}
          </Typography>
        </Paper>
      </Box>
    </Slide>
  );
}
