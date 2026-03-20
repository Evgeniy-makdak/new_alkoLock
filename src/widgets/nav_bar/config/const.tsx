/* eslint-disable prettier/prettier */
import AttachmentIcon from '@mui/icons-material/Attachment';
import BallotIcon from '@mui/icons-material/Ballot';
import ContactsOutlinedIcon from '@mui/icons-material/ContactsOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HandymanIcon from '@mui/icons-material/Handyman';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import InsertInvitationOutlinedIcon from '@mui/icons-material/InsertInvitationOutlined';
import InsertLinkOutlinedIcon from '@mui/icons-material/InsertLinkOutlined';
import MapIcon from '@mui/icons-material/Map';
import SettingsRemoteOutlinedIcon from '@mui/icons-material/SettingsRemoteOutlined';
import TimeToLeaveOutlinedIcon from '@mui/icons-material/TimeToLeaveOutlined';

import { RoutePaths } from '@shared/config/routePathsEnum';
import { ExtractTypeFromArray } from '@shared/types/utility';

export const frontendVersion = '1.120.7';

export const NAV_LINKS = [
  { path: RoutePaths.events, nameKey: 'nav.events', icon: <InsertInvitationOutlinedIcon /> },
  { path: RoutePaths.users, nameKey: 'nav.users', icon: <GroupOutlinedIcon /> },
  { path: RoutePaths.roles_new, nameKey: 'nav.roles', icon: <ContactsOutlinedIcon /> },
  { path: RoutePaths.groups, nameKey: 'nav.groups', icon: <HomeWorkOutlinedIcon /> },
  { path: RoutePaths.tc, nameKey: 'nav.transport', icon: <TimeToLeaveOutlinedIcon /> },
  { path: RoutePaths.alkozamki, nameKey: 'nav.alcolocks', icon: <SettingsRemoteOutlinedIcon /> },
  { path: RoutePaths.autoService, nameKey: 'nav.serviceMode', icon: <EngineeringOutlinedIcon /> },
  {
    path: RoutePaths.historyAutoService,
    nameKey: 'nav.serviceModeHistory',
    icon: <BallotIcon />,
  },
  { path: RoutePaths.attachments, nameKey: 'nav.attachments', icon: <InsertLinkOutlinedIcon /> },
  { path: RoutePaths.mailings, nameKey: 'nav.mailings', icon: <EmailOutlinedIcon /> },
  { path: RoutePaths.messages, nameKey: 'nav.messageTemplates', icon: <AttachmentIcon /> },
  { path: RoutePaths.settings, nameKey: 'nav.settings', icon: <HandymanIcon /> },
  { path: RoutePaths.map, nameKey: 'nav.map', icon: <MapIcon /> },
];

export type TypeNavLinks = typeof NAV_LINKS;
export type TypeNavLink = ExtractTypeFromArray<TypeNavLinks>;
export type TypeNavPath = TypeNavLink['path'];
