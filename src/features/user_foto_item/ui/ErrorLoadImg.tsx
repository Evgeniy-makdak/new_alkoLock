import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { Stack } from '@mui/material';

export const ErrorLoadImg = () => {
  return (
    <Stack
      height={'100%'}
      bgcolor={'#80808052'}
      justifyContent={'center'}
      color={'black'}
      alignItems={'center'}
      borderRadius={'5px'}
      textAlign={'center'}>
      <ErrorOutlineOutlinedIcon />
      <span>Не удалось загрузить фотографию</span>
    </Stack>
  );
};
