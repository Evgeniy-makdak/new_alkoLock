import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import { IconButton } from '@mui/material';
import { GridPagination, useGridApiContext } from '@mui/x-data-grid';

const CustomPagination = () => {
  const apiRef = useGridApiContext();

  const handleFirstPageButtonClick = () => {
    if (apiRef.current) {
      apiRef.current.setPage(0);
    }
  };

  const handleLastPageButtonClick = () => {
    if (apiRef.current) {
      const { pageSize } = apiRef.current.state.pagination.paginationModel;
      const totalRows = apiRef.current.state.rows.totalRowCount;
      const totalPages = Math.ceil(totalRows / pageSize);
      apiRef.current.setPage(totalPages - 1);
    }
  };

  const { page, pageSize } = apiRef.current.state.pagination.paginationModel;
  const totalRows = apiRef.current.state.rows.totalRowCount;
  const totalPages = Math.ceil(totalRows / pageSize) - 1;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page">
        <FirstPageIcon />
      </IconButton>
      <GridPagination />
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= totalPages}
        aria-label="last page">
        <LastPageIcon />
      </IconButton>
    </div>
  );
};

export default CustomPagination;
