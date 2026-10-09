import { useTranslation } from 'react-i18next';

import { MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { reportsStore } from '@pages/reports/model/reportsStore';
import type { ReportLogicOperator } from '@pages/reports/types/reportApiTypes';

import composeStyles from './ReportComposeModal.module.scss';

type ReportLogicOperatorConnectorProps = {
  value: ReportLogicOperator;
  onChange: (logicOperator: ReportLogicOperator) => void;
};

/** И/ИЛИ между карточками «Фильтрация» / «Группировка». */
export function ReportLogicOperatorConnector({
  value,
  onChange,
}: ReportLogicOperatorConnectorProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const secondaryColor = theme.palette.text.secondary;

  const handleChange = (event: SelectChangeEvent<ReportLogicOperator>) => {
    onChange(event.target.value as ReportLogicOperator);
  };

  return (
    <div className={composeStyles.filterLogicConnector}>
      <Select
        size="small"
        variant="standard"
        value={value}
        onChange={handleChange}
        disableUnderline
        className={composeStyles.filterLogicConnectorSelect}
        inputProps={{
          'aria-label': t('reports.addVariantLogicPlaceholder'),
        }}
        MenuProps={{
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          transformOrigin: { vertical: 'top', horizontal: 'center' },
          PaperProps: {
            sx: {
              '& .MuiMenuItem-root.Mui-selected': {
                backgroundColor: 'transparent',
              },
              '& .MuiMenuItem-root.Mui-selected:hover': {
                backgroundColor: 'action.hover',
              },
              '& .MuiMenuItem-root.Mui-selected .MuiSvgIcon-root': {
                color: secondaryColor,
              },
            },
          },
        }}>
        <MenuItem value="and">{t('reports.logicAnd')}</MenuItem>
        <MenuItem value="or">{t('reports.logicOr')}</MenuItem>
      </Select>
    </div>
  );
}

/** Коннектор фильтров: оператор из store (как раньше). */
export function ReportFilterLogicConnector() {
  const logicOperator = reportsStore((s) => s.logicOperator);
  const setLogicOperator = reportsStore((s) => s.setLogicOperator);
  return (
    <ReportLogicOperatorConnector value={logicOperator} onChange={setLogicOperator} />
  );
}