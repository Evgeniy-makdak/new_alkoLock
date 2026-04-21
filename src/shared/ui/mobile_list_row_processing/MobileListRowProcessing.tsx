import { Box, LinearProgress } from '@mui/material';

/** Нижняя полоса «в обработке» для мобильных карточек списков (родитель с `position: relative`). */
export const MobileListRowProcessing = () => (
  <Box
    aria-hidden
    sx={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      zIndex: 2,
      pointerEvents: 'none',
      overflow: 'hidden',
      borderRadius: '0 0 4px 4px',
    }}>
    <LinearProgress
      variant="indeterminate"
      sx={{
        height: 3,
        borderRadius: 0,
      }}
    />
  </Box>
);
