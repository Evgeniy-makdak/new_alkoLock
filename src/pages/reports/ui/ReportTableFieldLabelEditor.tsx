import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TextField, Typography } from '@mui/material';

type ReportTableFieldLabelEditorProps = {
  value: string;
  label: string;
  disabled: boolean;
  onChange: (nextLabel: string) => void;
  dense?: boolean;
};

export function ReportTableFieldLabelEditor({
  value,
  label,
  disabled,
  onChange,
  dense = false,
}: ReportTableFieldLabelEditorProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);

  if (editing && !disabled) {
    return (
      <TextField
        autoFocus
        size="small"
        fullWidth
        value={label}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            setEditing(false);
          }
        }}
        inputProps={{ 'aria-label': t('reports.tableFieldRenameAria', { field: value }) }}
        sx={{ flex: 1, minWidth: 0 }}
      />
    );
  }

  return (
    <Typography
      component="span"
      variant={dense ? 'caption' : 'body2'}
      onClick={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        setEditing(true);
      }}
      sx={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'text.disabled' : 'text.primary',
        borderBottom: disabled ? 'none' : '1px dashed',
        borderColor: 'divider',
        py: dense ? 0 : 0.25,
      }}>
      {label || value}
    </Typography>
  );
}
