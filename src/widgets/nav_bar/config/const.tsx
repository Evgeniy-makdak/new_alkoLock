import ContactsOutlinedIcon from '@mui/icons-material/ContactsOutlined';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import InsertInvitationOutlinedIcon from '@mui/icons-material/InsertInvitationOutlined';
import InsertLinkOutlinedIcon from '@mui/icons-material/InsertLinkOutlined';
import SettingsRemoteOutlinedIcon from '@mui/icons-material/SettingsRemoteOutlined';
import TimeToLeaveOutlinedIcon from '@mui/icons-material/TimeToLeaveOutlined';

import { RoutePaths } from '@shared/config/routePathsEnum';
import { ExtractTypeFromArray } from '@shared/types/utility';

export const NAV_LINKS = [
  {
    path: RoutePaths.events,
    name: 'События',
    icon: <InsertInvitationOutlinedIcon />,
  },
  {
    path: RoutePaths.users,
    name: 'Пользователи',
    icon: <GroupOutlinedIcon />,
  },
  {
    path: RoutePaths.roles,
    name: 'Роли',
    icon: <ContactsOutlinedIcon />,
  },
  {
    path: RoutePaths.groups,
    name: 'Группы',
    icon: <HomeWorkOutlinedIcon />,
  },
  {
    path: RoutePaths.tc,
    name: 'Транспорт',
    icon: <TimeToLeaveOutlinedIcon />,
  },
  {
    path: RoutePaths.alkozamki,
    name: 'Алкозамки',
    icon: <SettingsRemoteOutlinedIcon />,
  },
  {
    path: RoutePaths.autoService,
    name: 'Автосервис',
    icon: <EngineeringOutlinedIcon />,
  },
  {
    path: RoutePaths.attachments,
    name: 'Привязки',
    icon: <InsertLinkOutlinedIcon />,
  },
];

export type TypeNavLinks = typeof NAV_LINKS;
export type TypeNavLink = ExtractTypeFromArray<TypeNavLinks>;
export type TypeNavPath = TypeNavLink['path'];
