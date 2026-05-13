import { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { Alkozamki } from '@pages/alkozamki';
import { Attachments } from '@pages/attachments';
import { Authorization } from '@pages/authorization/ui/Authorization';
import { ChangePassword } from '@pages/authorization/ui/ChangePassword';
import { ConfirmPassword } from '@pages/authorization/ui/ConfirmPassword';
import { ForgetPassword } from '@pages/authorization/ui/ForgetPassword';
import { ResetPassword } from '@pages/authorization/ui/ResetPassword';
import { AutoService } from '@pages/auto_service';
import { Events } from '@pages/events';
import { Groups } from '@pages/groups';
import { History } from '@pages/history';
import { Mailings } from '@pages/mailings';
import { MapPage } from '@pages/map/MapPage';
import OperatorChatPopupPage from '@pages/operator_chat_popup/OperatorChatPopupPage';
import { NotFound } from '@pages/not_found';
import { ReportsPage } from '@pages/reports/ui/ReportsPage';
import { Roles_new } from '@pages/roles_new';
import { SettingsPage } from '@pages/settings/SettingsPage';
import EmailTemplatesPage from '@pages/templates/EmailTemplatesPage';
import { Users } from '@pages/users';
import { Vehicles } from '@pages/vehicles';
import { Spinner } from '@shared/ui/spinner';

import { App } from '../../app';
import { RoutePaths } from './routePathsEnum';

export const routers = createBrowserRouter([
  {
    path: RoutePaths.root,
    element: <App />,
    children: [
      {
        path: RoutePaths.events,
        element: <Events />,
      },
      {
        path: RoutePaths.users,
        element: <Users />,
      },
      {
        path: RoutePaths.mailings,
        element: <Mailings />,
      },
      {
        path: RoutePaths.roles_new,
        element: <Roles_new />,
      },
      {
        path: RoutePaths.groups,
        element: <Groups />,
      },
      {
        path: RoutePaths.tc,
        element: <Vehicles />,
      },
      {
        path: RoutePaths.alkozamki,
        element: <Alkozamki />,
      },
      {
        path: RoutePaths.autoService,
        element: <AutoService />,
      },
      {
        path: RoutePaths.historyAutoService,
        element: <History />,
      },
      {
        path: RoutePaths.attachments,
        element: <Attachments />,
      },
      {
        path: RoutePaths.messages,
        element: <EmailTemplatesPage />,
      },
      {
        path: RoutePaths.settings,
        element: <SettingsPage />,
      },
      {
        path: RoutePaths.reports,
        element: <ReportsPage />,
      },
      {
        path: RoutePaths.map,
        element: <MapPage />,
      },
      {
        path: RoutePaths.operatorChatPopup,
        element: <OperatorChatPopupPage />,
      },
    ].map((element) => ({
      ...element,
      element: <Suspense fallback={<Spinner />}>{element.element}</Suspense>,
    })),
  },
  {
    path: RoutePaths.all,
    element: <NotFound />,
  },
  {
    path: RoutePaths.auth,
    element: <Authorization />,
  },
  {
    path: RoutePaths.changePassword,
    element: <ChangePassword />,
  },
  {
    path: RoutePaths.confirmPassword,
    element: <ConfirmPassword />,
  },
  {
    path: RoutePaths.forgetPassword,
    element: <ForgetPassword />,
  },
  {
    path: RoutePaths.resetPassword,
    element: <ResetPassword />,
  },
]);
