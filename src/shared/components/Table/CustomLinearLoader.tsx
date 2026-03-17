import { Box, Tooltip, keyframes } from '@mui/material';

const progress = keyframes`
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 30px 0;
  }
`;

export const CustomLinearLoader = () => {
  return (
    <Tooltip
      title="Выполняется обработка данных"
      placement="top"
      arrow
      disableInteractive // Это предотвращает закрытие тултипа при наведении на него
      PopperProps={{
        sx: {
          pointerEvents: 'auto', // Разрешаем события только для тултипа
        },
      }}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          pointerEvents: 'none',
        }}>
        <Box
          sx={{
            width: '100%',
            height: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative',
          }}>
          <Box
            sx={{
              width: '100%',
              height: '100%',
              background: (theme) => `
                repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 10px,
                  ${theme.palette.primary.main} 10px,
                  ${theme.palette.primary.main} 20px
                )
              `,
              backgroundSize: '30px 30px',
              animation: `${progress} 1s linear infinite`,
              opacity: 0.3,
            }}
          />
        </Box>
      </Box>
    </Tooltip>
  );
};
