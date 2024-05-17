import {
  IconButton,
  InputAdornment,
  TextField,
  TextFieldProps,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { ClearIcon } from '@mui/x-date-pickers';

import style from './SearchInput.module.scss';

const theme = createTheme({
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          padding: '10px 14px',
        },
        notchedOutline: {
          borderWidth: '2px',
        },
        root: {
          height: '30px',
          display: 'flex',
          alignItems: 'center',
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          width: '100%',
        },
      },
    },
  },
});

type SearchInputProps = TextFieldProps & {
  setState: React.Dispatch<React.SetStateAction<string>>;
  onClear: () => void;
  testId?: string;
};

export const SearchInput = ({ setState, onClear, testId, ...rest }: SearchInputProps) => {
  return (
    <ThemeProvider theme={theme}>
      <TextField
        data-testid={testId}
        placeholder={'Поиск'}
        onChange={(e) => setState(e.target.value)}
        {...rest}
        className={style.searchInput}
        variant="outlined"
        size={'medium'}
        focused={false}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton edge="end" onClick={onClear}>
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </ThemeProvider>
  );
};
