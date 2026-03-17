import React from 'react';

import {
  Autocomplete,
  type AutocompleteRenderGetTagProps,
  type AutocompleteRenderInputParams,
  Chip,
  TextField,
} from '@mui/material';

interface MultiSelectWithChipsViewProps {
  value: string[];
  label: string;
  options: string[];
}

export const MultiSelectWithChipsView: React.FC<MultiSelectWithChipsViewProps> = ({
  value,
  label,
  options,
}) => {
  const sortedOptions = [...options].sort();
  const sortedValue = [...value].sort();

  return (
    <Autocomplete
      multiple
      options={sortedOptions}
      value={sortedValue}
      readOnly
      disabled
      disableClearable // Убираем иконку очистки
      renderTags={(value: string[], getTagProps: AutocompleteRenderGetTagProps) =>
        [...value].sort().map((option: string, index: number) => (
          <Chip
            key={option}
            label={option}
            {...getTagProps({ index })}
            onDelete={undefined} // Отключаем возможность удаления
          />
        ))
      }
      renderInput={(params: AutocompleteRenderInputParams) => (
        <TextField
          {...params}
          label={label}
          sx={{
            '& .MuiInputBase-input.Mui-disabled': {
              WebkitTextFillColor: '#000000',
            },
          }}
        />
      )}
    />
  );
};
