import React from 'react';
import { useTranslation } from 'react-i18next';

import ClearIcon from '@mui/icons-material/Clear';
import {
  IconButton,
  InputAdornment,
  TextField,
  TextFieldProps,
  ThemeProvider,
  Tooltip,
  createTheme,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { appStore } from '@shared/model/app_store/AppStore';
import { StatusFilter } from '@shared/ui/search_multiple_select/StatusFilter';

import style from './SearchInput.module.scss';

type SearchInputProps = TextFieldProps & {
  setState: React.Dispatch<React.SetStateAction<string>>;
  onClear: () => void;
  testId?: string;
  showStatusFilter?: boolean; // Управляет отображением фильтра на нужной вкладке (странице)
};

export const SearchInput = ({
  setState,
  onClear,
  testId,
  showStatusFilter = false,
  ...rest
}: SearchInputProps) => {
  const { t } = useTranslation();
  const outerTheme = useTheme();
  const fieldTheme = React.useMemo(
    () =>
      createTheme(outerTheme, {
        components: {
          MuiOutlinedInput: {
            styleOverrides: {
              input: { padding: '10px 14px' },
              notchedOutline: { borderWidth: '2px' },
              root: { height: '30px', display: 'flex', alignItems: 'center' },
            },
          },
          MuiFormControl: { styleOverrides: { root: { width: '100%' } } },
        },
      }),
    [outerTheme],
  );
  const [statusFilter, setStatusFilter] = React.useState<'Все' | 'Активные' | 'Неактивные'>('Все');

  const handleStatusChange = (newStatus: 'Все' | 'Активные' | 'Неактивные') => {
    setStatusFilter(newStatus);
  };

  const isAdmin = appStore().isAdmin;

  return (
    <ThemeProvider theme={fieldTheme}>
      <div className={style.SearchInput}>
        <TextField
          data-testid={testId}
          placeholder={t('common.search')}
          onChange={(e) => setState(e.target.value)}
          {...rest}
          className={style.searchInput}
          variant="outlined"
          size="medium"
          focused={false}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={t('map.clear')}>
                  <IconButton edge="end" onClick={onClear}>
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
        {showStatusFilter && isAdmin && (
          <div className={style.StatusFilter}>
            <StatusFilter statusFilter={statusFilter} onStatusChange={handleStatusChange} />
          </div>
        )}
      </div>
    </ThemeProvider>
  );
};
