import { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { Alkozamki } from '@pages/alkozamki';
import { Attachments } from '@pages/attachments';
import { Authorization } from '@pages/authorization/ui/Authorization';
import { ChangePassword } from '@pages/authorization/ui/ChangePassword';
import { AutoService } from '@pages/auto_service';
import { Events } from '@pages/events';
import { History } from '@pages/history';
import { Groups } from '@pages/groups';
import { NotFound } from '@pages/not_found';
import { Roles } from '@pages/roles';
import { Users } from '@pages/users';
import { Vehicles } from '@pages/vehicles';
import { Spinner } from '@shared/ui/spinner';

import { App } from '../../app';
import { RoutePaths } from './routePathsEnum';
import { ForgetPassword } from '@pages/authorization/ui/ForgetPassword';
import { ResetPassword } from '@pages/authorization/ui/ResetPassword';

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
        path: RoutePaths.roles,
        element: <Roles />,
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
    path: RoutePaths.forgetPassword,
    element: <ForgetPassword />,
  },
  {
    path: RoutePaths.resetPassword,
    element: <ResetPassword />,
  },
]);
