import type { ReactNode } from 'react';
import React from 'react';

import PropTypes from 'prop-types';

import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import CoPresentOutlinedIcon from '@mui/icons-material/CoPresentOutlined';
import ColorLensOutlinedIcon from '@mui/icons-material/ColorLensOutlined';
import CommuteOutlinedIcon from '@mui/icons-material/CommuteOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import DriveFileRenameOutlineOutlinedIcon from '@mui/icons-material/DriveFileRenameOutlineOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import FifteenMpOutlinedIcon from '@mui/icons-material/FifteenMpOutlined';
import Filter4Icon from '@mui/icons-material/Filter4';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import ModelTrainingOutlinedIcon from '@mui/icons-material/ModelTrainingOutlined';
import NumbersIcon from '@mui/icons-material/Numbers';
import PausePresentationOutlinedIcon from '@mui/icons-material/PausePresentationOutlined';
import PersonIcon from '@mui/icons-material/Person';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import ThermostatOutlinedIcon from '@mui/icons-material/ThermostatOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import { Chip, type ChipProps } from '@mui/material';

import style from '../ui/Info.module.scss';
import type { GetTypeOfRowIconValueProps } from './getTypeOfRowIconValue';

export enum TypeOfRows {
  SERIAL_NUMBER = 'SERIAL_NUMBER',
  USER = 'USER',
  CAR = 'CAR',
  CODE_ERROR = 'CODE_ERROR',
  ERROR = 'ERROR',
  COORDS = 'COORDS',
  MG_ON_LITER = 'MG_ON_LITER',
  RESULT = 'RESULT',
  BIRTHDAY = 'BIRTHDAY',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  ROLE = 'ROLE',
  ACCESS = 'ACCESS',
  DATE = 'DATE',
  TERM = 'TERM',
  CATEGORY = 'CATEGORY',
  NUMBER_VU = 'NUMBER_VU',
  MARK = 'MARK',
  GOS_NUMBER = 'GOS_NUMBER',
  COLOR = 'COLOR',
  NAMING = 'NAMING',
  MODE = 'MODE',
  STATUS = 'STATUS',
  POINT = 'POINT',
  HEADER = 'HEADER',
  TEMPERATURE = 'TEMPERATURE',
}

const TypeOfRowIcons: TypeOfRowIconsType = {
  MODE: <ModelTrainingOutlinedIcon color="info" />,
  NAMING: <DriveFileRenameOutlineOutlinedIcon color="info" />,
  COLOR: <ColorLensOutlinedIcon color="info" />,
  GOS_NUMBER: <FifteenMpOutlinedIcon color="info" />,
  MARK: <CommuteOutlinedIcon color="info" />,
  NUMBER_VU: <CoPresentOutlinedIcon color="info" />,
  SERIAL_NUMBER: <NumbersIcon color="info" />,
  USER: <PersonIcon color="info" />,
  CAR: <DirectionsCarOutlinedIcon color="info" />,
  CODE_ERROR: <Filter4Icon color="error" />,
  ERROR: <ErrorOutlineIcon color="error" />,
  COORDS: <MapOutlinedIcon color="info" />,
  MG_ON_LITER: <FormatColorFillIcon color={'info'} />,
  RESULT: <GppGoodOutlinedIcon color="info" />,
  BIRTHDAY: <CakeOutlinedIcon color="info" />,
  PHONE: <LocalPhoneOutlinedIcon color="info" />,
  EMAIL: <AlternateEmailOutlinedIcon color="info" />,
  ROLE: <SupervisorAccountOutlinedIcon color="info" />,
  ACCESS: <VpnKeyOutlinedIcon color="info" />,
  DATE: <CalendarMonthOutlinedIcon color="info" />,
  TERM: <GavelOutlinedIcon color="info" />,
  CATEGORY: <CategoryOutlinedIcon color="info" />,
  STATUS: <PausePresentationOutlinedIcon color="info" />,
  POINT: <PausePresentationOutlinedIcon color="info" />,
  HEADER: '',
  TEMPERATURE: <ThermostatOutlinedIcon color="info" />,
};

// Простой компонент для мобильного текста
const MobileText = ({ label, color }: { label: ReactNode; color?: string }) => {
  let textStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '17px',
    lineHeight: 1.35,
    fontWeight: 500,
  };

  if (color === 'success') {
    textStyle = { ...textStyle, color: '#2e7d32', backgroundColor: 'rgba(46, 125, 50, 0.1)' };
  } else if (color === 'error') {
    textStyle = { ...textStyle, color: '#d32f2f', backgroundColor: 'rgba(211, 47, 47, 0.1)' };
  } else if (color === 'warning') {
    textStyle = { ...textStyle, color: '#ed6c02', backgroundColor: 'rgba(237, 108, 2, 0.1)' };
  } else if (color === 'info') {
    textStyle = { ...textStyle, color: '#0288d1', backgroundColor: 'rgba(2, 136, 209, 0.1)' };
  }

  return <span style={textStyle}>{label}</span>;
};

MobileText.propTypes = {
  label: PropTypes.node.isRequired,
  color: PropTypes.string,
};

// Компонент для результата выдоха
const ExhaleResultChip = ({ color, label }: { color: string; label: string }) => {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    return <MobileText label={label} color={color} />;
  }

  return <Chip className={style.labelText} variant="filled" color={color as any} label={label} />;
};

ExhaleResultChip.propTypes = {
  color: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

export const summaryExhaleResult = {
  DEVICE_TEST_ERROR_HIGH_CONCENTRATION: (
    <ExhaleResultChip color="error" label={'Тестирование не пройдено'} />
  ),
  DEVICE_TEST_ERROR_INTERRUPTED: <ExhaleResultChip color="warning" label="Выдох прерван" />,
  TEST_FALSIFICATION: <ExhaleResultChip color="error" label={'Фальсификация выдоха'} />,
  FAILED: <ExhaleResultChip color="error" label={'Нетрезвый'} />,
  PASSED: <ExhaleResultChip color="success" label={'Трезвый'} />,
  // Подтипы "Тестирование прервано"
  INGESTION_FOREIGN_OBJECT_INTO_CUVETTE_DURING_EXHALATION: (
    <ExhaleResultChip
      color="warning"
      label="Попадание постороннего предмета в кювету во время выдоха"
    />
  ),
  SHORT_EXHALE: <ExhaleResultChip color="warning" label="Короткий выдох" />,
  WEAK_EXHALE: <ExhaleResultChip color="warning" label="Слабый выдох" />,
  ALCOHOL_BACKGROUND: <ExhaleResultChip color="warning" label="Обнаружен спиртовой фон" />,
};

export const getSummaryExhaleResult = (t: (key: string) => string) => ({
  DEVICE_TEST_ERROR_HIGH_CONCENTRATION: (
    <ExhaleResultChip color="error" label={t('info.summary.deviceTestErrorHighConcentration')} />
  ),
  DEVICE_TEST_ERROR_INTERRUPTED: (
    <ExhaleResultChip color="warning" label={t('info.summary.deviceTestErrorInterrupted')} />
  ),
  TEST_FALSIFICATION: (
    <ExhaleResultChip color="error" label={t('info.summary.testFalsification')} />
  ),
  FAILED: <ExhaleResultChip color="error" label={t('info.summary.failed')} />,
  PASSED: <ExhaleResultChip color="success" label={t('info.summary.passed')} />,
  INGESTION_FOREIGN_OBJECT_INTO_CUVETTE_DURING_EXHALATION: (
    <ExhaleResultChip
      color="warning"
      label={t('info.summary.foreignObjectInCuvetteDuringExhalation')}
    />
  ),
  SHORT_EXHALE: <ExhaleResultChip color="warning" label={t('info.summary.shortExhale')} />,
  WEAK_EXHALE: <ExhaleResultChip color="warning" label={t('info.summary.weakExhale')} />,
  ALCOHOL_BACKGROUND: (
    <ExhaleResultChip color="warning" label={t('info.summary.alcoholBackground')} />
  ),
});

export type TypeSummaryExhaleResult = keyof typeof summaryExhaleResult;

export interface Field {
  label?: string | number | ReactNode;
  style?: React.CSSProperties;
  value?: GetTypeOfRowIconValueProps | GetTypeOfRowIconValueProps[];
  type?: TypeOfRows;
  tooltip?: string;
  summaryExhaleResult?: keyof typeof summaryExhaleResult;
  /** Заголовок секции на всю ширину карточки (без колонки значения). */
  rowLayout?: 'sectionTitle';
}

type TypeOfRowIconsType = {
  [key in TypeOfRows]: ReactNode;
};

// Основной компонент для чипов/текста
const TypeOfRowChip = ({
  type,
  label,
  ...chipProps
}: {
  type: TypeOfRows;
  label: ReactNode;
  color?: ChipProps['color'];
}) => {
  const isMobile = window.innerWidth <= 768;
  const ReadyIcon = TypeOfRowIcons[type];
  const color = chipProps.color as string;

  if (isMobile) {
    return <MobileText label={label} color={color} />;
  }

  return (
    <Chip
      className={style.title}
      variant="outlined"
      icon={ReadyIcon ? <>{ReadyIcon}</> : undefined}
      label={label}
      {...chipProps}
    />
  );
};

TypeOfRowChip.propTypes = {
  type: PropTypes.oneOf(Object.values(TypeOfRows)).isRequired,
  label: PropTypes.node.isRequired,
  color: PropTypes.string,
};

export const getTypeOfRowIconLabel = (
  type: TypeOfRows,
  label: string | ReactNode | number,
  props?: ChipProps,
) => {
  return <TypeOfRowChip type={type} label={label} {...props} />;
};

// Добавляем prop-types для функции
getTypeOfRowIconLabel.propTypes = {
  type: PropTypes.oneOf(Object.values(TypeOfRows)).isRequired,
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.node, PropTypes.number]).isRequired,
  props: PropTypes.object,
};
