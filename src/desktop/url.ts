// The address bar follows the focused window, so a copied link reopens what
// was on screen. Routes match the static pages the build writes
// (scripts/pages/pages.ts): /projects/, /blog/ and a slug under each;
// everything else is the plain desktop at /.
//
// replaceState, not pushState: switching windows isn't navigation, and Back
// should leave the site rather than replay window focus.
import { bus, type AppKind, type Intent } from './session';
import type { WindowId } from '../types';

/** Apps with pages of their own; the rest live at /. */
const ROUTED: AppKind[] = ['projects', 'blog'];

export const routeFor = (app: AppKind, slug?: string): string =>
  !ROUTED.includes(app) ? '/' : slug ? `/${app}/${slug}/` : `/${app}/`;

/** The window a URL asks for, or null for the plain desktop. */
export function intentFor(pathname: string): Intent | null {
  const m = /^\/(projects|blog)(?:\/([\w-]+))?\/?$/.exec(pathname);
  return m ? { type: 'launch', app: m[1] as AppKind, path: m[2] } : null;
}

const routes = new Map<WindowId, string>();
let focused: WindowId | null = null;

const show = (route: string): void => {
  if (location.pathname !== route) history.replaceState(null, '', route);
};

/** A window's route changed from inside it (a project picked in the roster). */
export function setRoute(id: WindowId, route: string): void {
  routes.set(id, route);
  if (id === focused) show(route);
}

export function syncUrl(): void {
  bus.instructions.subscribe((msg) => {
    switch (msg.type) {
      case 'create':
        routes.set(msg.id, routeFor(msg.app, msg.path));
        return;
      case 'focus':
        focused = msg.id;
        show((msg.id && routes.get(msg.id)) || '/');
        return;
      case 'destroy':
        routes.delete(msg.id);
        return;
    }
  });
}
