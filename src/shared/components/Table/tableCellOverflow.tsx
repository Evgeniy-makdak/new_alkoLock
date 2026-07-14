import type { ReactElement, ReactNode } from 'react';

import { Box, Chip } from '@mui/material';

import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';

import style from './Table.module.scss';

const EMPTY_CELL_MARKERS = new Set(['—', '-', '']);

function formatTableCellTooltipTitle(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value
      .map((item) => (item == null ? '' : String(item).trim()))
      .filter(Boolean)
      .join(', ');
  }
  return String(value).trim();
}

function shouldOfferOverflowTooltip(title: string): boolean {
  return Boolean(title) && !EMPTY_CELL_MARKERS.has(title);
}

const ellipsisBoxSx = {
  display: 'block',
  width: '100%',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

function wrapWithOverflowTooltip(title: string, content: ReactElement): ReactNode {
  if (!shouldOfferOverflowTooltip(title)) {
    return content;
  }
  return <OverflowTooltip title={title}>{content}</OverflowTooltip>;
}

export function renderTableCellValue(value: unknown): ReactNode {
  const title = formatTableCellTooltipTitle(value);

  if (Array.isArray(value)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          width: '100%',
          minWidth: 0,
        }}>
        {value.map((item, index) => {
          const chipTitle = item == null ? '' : String(item).trim();
          const chip = (
            <Chip
              key={index}
              label={item}
              size="small"
              variant="outlined"
              sx={{
                maxWidth: '100%',
                borderColor: 'text.inherit',
                color: 'text.primary',
                backgroundColor: 'transparent',
                '& .MuiChip-label': {
                  px: 0.8,
                  py: 0.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              }}
            />
          );

          if (!shouldOfferOverflowTooltip(chipTitle)) {
            return chip;
          }

          return wrapWithOverflowTooltip(
            chipTitle,
            <span className={style.cellChipWrapper}>{chip}</span>,
          );
        })}
      </Box>
    );
  }

  return wrapWithOverflowTooltip(
    title,
    <span style={ellipsisBoxSx as React.CSSProperties}>{value as ReactNode}</span>,
  );
}
