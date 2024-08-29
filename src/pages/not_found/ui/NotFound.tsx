import { Box, Typography } from '@mui/material';

export const NotFound = () => {
  return (
    <Box height="100%" width="100%" display="flex" alignItems="center" justifyContent={'center'}>
      <Typography fontSize={20} fontWeight={600}>
        Вы перешли на несуществующую страницу :(
      </Typography>
    </Box>
  );
};
