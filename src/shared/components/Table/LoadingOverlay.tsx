import { Box, LinearProgress, Tooltip } from '@mui/material';

interface LoadingOverlayProps {
  fullWidth?: boolean;
}

export const LoadingOverlay = ({ fullWidth = true }: LoadingOverlayProps) => {
  return (
    <Tooltip title="Выполняется обработка данных" placement="top" arrow>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          pointerEvents: 'none',
        }}>
        <LinearProgress
          color="primary"
          sx={{
            position: 'absolute',
            top: '50%',
            left: fullWidth ? 0 : '10%',
            right: fullWidth ? 0 : '10%',
            transform: 'translateY(-50%)',
            height: 1,
            opacity: 0.3,
            // borderRadius: 4,
          }}
        />
      </Box>
    </Tooltip>
  );
};
