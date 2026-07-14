import React from 'react';

import {
  Autocomplete,
  type AutocompleteRenderGetTagProps,
  type AutocompleteRenderInputParams,
  Chip,
  TextField,
} from '@mui/material';

import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';

interface MultiSelectWithChipsProps {
  value: string[];
  onChange: (value: string[]) => void;
  label: string;
  options: string[];
  disabledOptions?: string[];
  error?: boolean;
  helperText?: string;
}

export const MultiSelectWithChips: React.FC<MultiSelectWithChipsProps> = ({
  value,
  onChange,
  label,
  options,
  disabledOptions = [],
  error = false,
  helperText,
}) => {
  const sortedOptions = [...options].sort();
  const sortedValue = [...value].sort();

  return (
    <Autocomplete
      multiple
      options={sortedOptions}
      value={sortedValue}
      onChange={(_, newValue) => {
        onChange([...newValue].sort());
      }}
      getOptionDisabled={(option) => disabledOptions.includes(option)}
      renderTags={(value: string[], getTagProps: AutocompleteRenderGetTagProps) =>
        [...value].sort().map((option: string, index: number) => {
          const { key: tagKey, ...tagProps } = getTagProps({ index });
          return (
            <OverflowTooltip key={option} title={option}>
              <Chip
                key={tagKey}
                label={option}
                {...tagProps}
                onDelete={() => {
                  const newValue = [...value];
                  newValue.splice(index, 1);
                  onChange(newValue);
                }}
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
        <TextField {...params} label={label} error={error} helperText={helperText} />
      )}
    />
  );
};
