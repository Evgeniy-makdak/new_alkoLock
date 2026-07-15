import { RoutePaths } from './routePathsEnum';

/** Маршруты, где тема и язык живут в строке TableHeaderWrapper (TableHeaderEndToolbar). */
const INLINE_TABLE_TOOLBAR_PREFIXES: readonly string[] = [
  RoutePaths.events,
  RoutePaths.reports,
  RoutePaths.users,
  RoutePaths.mailings,
  RoutePaths.roles,
  RoutePaths.groups,
  RoutePaths.transport,
  RoutePaths.alcolocks,
  RoutePaths.links,
  RoutePaths.servicemode,
  RoutePaths.servicemodehistory,
  RoutePaths.settings,
  RoutePaths.templates,
  RoutePaths.mpoConfig,
];

export function pathHasInlineTableToolbar(pathname: string): boolean {
  return INLINE_TABLE_TOOLBAR_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
