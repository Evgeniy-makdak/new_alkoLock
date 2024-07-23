import { ThemeProvider, createTheme } from '@mui/material';

import { useToggle } from '@shared/hooks/useToggle';
import { ImagePreview } from '@shared/ui/image_preview/ui/ImagePreview';
import { ImageView } from '@shared/ui/image_view';
import { Loader } from '@shared/ui/loader';

import { useImage } from '../hooks/useImage';
import style from './Image.module.scss';

const theme = createTheme({
  components: {
    MuiDialog: {
      styleOverrides: {
        root: {
          '.MuiDialog-paper': {
            backgroundColor: 'transparent',
          },
        },
      },
    },
  },
});

export const Image = ({ url }: { url: string }) => {
  const { img, isLoading } = useImage(url);
  const [open, toggle, reset] = useToggle(false);

  return (
    <Loader
      isLoading={isLoading}
      props={{
        className: style.wrapper,
      }}>
      {Boolean(img) && <ImageView onClick={toggle} src={img} styleImage={style.img} />}

      <ThemeProvider theme={theme}>
        <ImagePreview imgStyle={style.imgFull} close={reset} open={open} src={img} />
      </ThemeProvider>
    </Loader>
  );
};
