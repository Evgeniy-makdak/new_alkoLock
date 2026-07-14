import React from 'react';

import {
  Autocomplete,
  type AutocompleteRenderGetTagProps,
  type AutocompleteRenderInputParams,
  Chip,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';

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
  const theme = useTheme();
  const sortedOptions = [...options].sort();
  const sortedValue = [...value].sort();

  return (
    <Autocomplete
      multiple
      options={sortedOptions}
      value={sortedValue}
      readOnly
      disabled
      disableClearable
      renderTags={(value: string[], getTagProps: AutocompleteRenderGetTagProps) =>
        [...value].sort().map((option: string, index: number) => {
          const { key: tagKey, ...tagProps } = getTagProps({ index });
          return (
            <OverflowTooltip key={option} title={option}>
              <Chip
                key={tagKey}
                label={option}
                {...tagProps}
                onDelete={undefined}
                sx={{
                  maxWidth: '100%',
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                }}
              />
            </OverflowTooltip>
          );
        })
      }
      renderInput={(params: AutocompleteRenderInputParams) => (
        <TextField
          {...params}
          label={label}
          sx={{
            '& .MuiInputBase-input.Mui-disabled': {
              WebkitTextFillColor: theme.palette.text.primary,
              color: theme.palette.text.primary,
            },
          }}
        />
      )}
    />
  );
};
