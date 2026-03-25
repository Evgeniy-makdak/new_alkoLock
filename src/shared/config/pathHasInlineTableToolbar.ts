import { RoutePaths } from './routePathsEnum';

/** Маршруты, где тема и язык живут в строке TableHeaderWrapper (TableHeaderEndToolbar). */
const INLINE_TABLE_TOOLBAR_PREFIXES: readonly string[] = [
  RoutePaths.events,
  RoutePaths.users,
  RoutePaths.mailings,
  RoutePaths.roles_new,
  RoutePaths.groups,
  RoutePaths.tc,
  RoutePaths.alkozamki,
  RoutePaths.attachments,
  RoutePaths.autoService,
  RoutePaths.historyAutoService,
];

export function pathHasInlineTableToolbar(pathname: string): boolean {
  return INLINE_TABLE_TOOLBAR_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
