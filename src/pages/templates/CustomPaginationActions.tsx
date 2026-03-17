import PropTypes from 'prop-types';

import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import { IconButton, Tooltip } from '@mui/material';
import { TablePaginationProps } from '@mui/material/TablePagination';

interface CustomPaginationActionsProps
  extends Pick<TablePaginationProps, 'page' | 'count' | 'rowsPerPage' | 'onPageChange'> {}

export const CustomPaginationActions: React.FC<CustomPaginationActionsProps> = ({
  page,
  count,
  rowsPerPage,
  onPageChange,
}) => {
  const handleFirstPage = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, 0);
  };

  const handleLastPage = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  const handlePrevPage = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, page - 1);
  };

  const handleNextPage = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, page + 1);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Tooltip title={page === 0 ? '' : 'Вернуться на первую страницу'}>
        <span>
          <IconButton onClick={handleFirstPage} disabled={page === 0}>
            <FirstPageIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={page === 0 ? '' : 'Предыдущая страница'}>
        <span>
          <IconButton onClick={handlePrevPage} disabled={page === 0}>
            <KeyboardArrowLeft />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={page >= Math.ceil(count / rowsPerPage) - 1 ? '' : 'Следующая страница'}>
        <span>
          <IconButton
            onClick={handleNextPage}
            disabled={page >= Math.ceil(count / rowsPerPage) - 1}>
            <KeyboardArrowRight />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip
        title={page >= Math.ceil(count / rowsPerPage) - 1 ? '' : 'Переход на последнюю страницу'}>
        <span>
          <IconButton
            onClick={handleLastPage}
            disabled={page >= Math.ceil(count / rowsPerPage) - 1}>
            <LastPageIcon />
          </IconButton>
        </span>
      </Tooltip>
    </div>
  );
};

CustomPaginationActions.propTypes = {
  page: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};
