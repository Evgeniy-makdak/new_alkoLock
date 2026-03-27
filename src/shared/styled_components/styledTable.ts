import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EastIcon from '@mui/icons-material/East';
import EditIcon from '@mui/icons-material/Edit';
import RemoveIcon from '@mui/icons-material/Remove';
import { IconButton, TableCell, TableRow } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

const historyHeaderBg = (theme: Theme) => (theme.palette.mode === 'dark' ? '#1e1e1e' : '#F6F6F6');

const historyHeaderBorder = (theme: Theme) =>
  theme.palette.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.12)';

export class StyledTable {
  static HeaderRow = styled(TableRow)(({ theme }) => ({
    width: '100%',
    display: 'flex',
    position: 'sticky',
    top: 0,
    justifyContent: 'space-between',
    background: historyHeaderBg(theme),
    borderBottom: historyHeaderBorder(theme),
    borderTop: historyHeaderBorder(theme),
  }));

  static HeaderCell = styled(TableCell)(({ theme }) => ({
    background: historyHeaderBg(theme),
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '171.429%',
    letterSpacing: '0.1px',
    color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#333',
    border: 'none',
  }));

  static HeaderIconCell = styled(TableCell)(({ theme }) => ({
    background: historyHeaderBg(theme),
    padding: '4px 0',
    maxWidth: '114px',
    width: '114px',
  }));

  static AddIcon = styled(AddIcon)({
    fill: '#333',
  });

  static EditIcon = styled(EditIcon)({
    fill: '#333',
  });

  static DeleteIcon = styled(DeleteIcon)({
    fill: '#333',
  });

  static ShiftIcon = styled(EastIcon)({
    fill: '#333',
  });

  static ExpandIcon = styled(AddIcon)(({ theme }) => ({
    fill: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.78)' : 'rgba(0, 0, 0, 0.6)',
  }));

  static CollapseIcon = styled(RemoveIcon)(({ theme }) => ({
    fill: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.78)' : 'rgba(0, 0, 0, 0.6)',
  }));

  static TableButton = styled(IconButton)(({ theme }) => ({
    border: 'none',
    width: '40px',
    height: '40px',
    padding: '0',
    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.78)' : 'rgba(0, 0, 0, 0.54)',
    '&:hover': {
      backgroundColor:
        theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    },
  }));

  static BodyRow = styled(TableRow)({
    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
  });

  static BodyCell = styled(TableCell)({
    padding: '12px 16px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '171.429%',
    letterSpacing: '0.1px',
    color: '#333',
  });

  static ActionsCell = styled(TableCell)({
    padding: '4px 18px',
    maxWidth: '114px',
    width: '114px',
  });

  static DataCell = styled(TableCell)({
    padding: '7px 24px',
    background: '#0000000A',
  });

  /** Div-based variants for use inside Virtuoso (avoids validateDOMNesting: tr cannot be child of div) */
  static BodyRowDiv = styled('div')(({ theme }) => ({
    borderBottom:
      theme.palette.mode === 'dark'
        ? '1px solid rgba(255, 255, 255, 0.12)'
        : '1px solid rgba(0, 0, 0, 0.12)',
  }));

  static BodyCellDiv = styled('div')(({ theme }) => ({
    padding: '12px 16px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '171.429%',
    letterSpacing: '0.1px',
    color: theme.palette.text.primary,
  }));

  static DataCellDiv = styled('div')(({ theme }) => ({
    padding: '7px 24px',
    background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
  }));
}
