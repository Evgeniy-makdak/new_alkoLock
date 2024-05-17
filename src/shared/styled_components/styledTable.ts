import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EastIcon from '@mui/icons-material/East';
import EditIcon from '@mui/icons-material/Edit';
import RemoveIcon from '@mui/icons-material/Remove';
import { IconButton, TableCell, TableRow } from '@mui/material';

import styled from '@emotion/styled';

export class StyledTable {
  static HeaderRow = styled(TableRow)({
    width: '100%',
    display: 'flex',
    position: 'sticky',
    top: 0,
    justifyContent: 'space-between',
    background: '#F6F6F6',
    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
    borderTop: '1px solid rgba(0, 0, 0, 0.12)',
  });

  static HeaderCell = styled(TableCell)({
    background: '#F6F6F6',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '171.429%',
    letterSpacing: '0.1px',
    color: '#333',
    border: 'none',
  });

  static HeaderIconCell = styled(TableCell)({
    background: '#F6F6F6',
    padding: '4px 0',
    maxWidth: '114px',
    width: '114px',
  });

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

  static ExpandIcon = styled(AddIcon)({
    fill: '#00000099',
  });

  static CollapseIcon = styled(RemoveIcon)({
    fill: '#00000099',
  });

  static TableButton = styled(IconButton)({
    border: 'none',
    width: '40px',
    height: '40px',
    padding: '0',
  });

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
}
