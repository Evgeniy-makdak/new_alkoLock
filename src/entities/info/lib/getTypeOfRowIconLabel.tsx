import type { ReactNode } from 'react';
import React from 'react';

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
};

const CustomChipValue = (props: ChipProps) => (
  <Chip className={style.labelText} variant="filled" {...props} />
);

export const summaryExhaleResult = {
  DEVICE_TEST_ERROR_HIGH_CONCENTRATION: (
    <CustomChipValue color="error" label={'Тестирование не пройдено'} />
  ),
  DEVICE_TEST_ERROR_INTERRUPTED: <CustomChipValue color="warning" label="Прерван" />,
  DEVICE_TEST_ERROR_FALSIFICATION: (
    <CustomChipValue color="warning" label={'Фальсификация выдоха'} />
  ),
  FAILED: <CustomChipValue color="error" label={'Нетрезвый'} />,
  PASSED: <CustomChipValue color="success" label={'Трезвый'} />,
};

export type TypeSummaryExhaleResult = keyof typeof summaryExhaleResult;

export interface Field {
  label?: string | number | ReactNode;
  style?: React.CSSProperties;
  value?: GetTypeOfRowIconValueProps | GetTypeOfRowIconValueProps[];
  type?: TypeOfRows;
  summaryExhaleResult?: keyof typeof summaryExhaleResult;
}
type TypeOfRowIconsType = {
  [key in TypeOfRows]: ReactNode;
};

const CustomChip = ({ props }: { props: ChipProps }) => (
  <Chip {...props} className={style.title} variant="outlined" />
);

export const getTypeOfRowIconLabel = (
  type: TypeOfRows,
  label: string | ReactNode | number,
  props?: ChipProps,
) => {
  const readyProps = { ...props, label };

  const ReadyIcon = TypeOfRowIcons[type];

  return CustomChip({
    props: {
      ...readyProps,
      icon: <>{ReadyIcon}</>,
    },
  });
};
