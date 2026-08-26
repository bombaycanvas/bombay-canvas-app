import type { LinkingOptions } from '@react-navigation/native';
import { getStateFromPath as getStateFromPathDefault } from '@react-navigation/native';
import type { RootStackParamList } from './routes';

// Deep links to bare root-stack screens (e.g. Video) resolve to a state with
// nothing underneath them. Without a base screen, Back has nowhere to go.
// This inserts MainTabs as the floor of the stack whenever it's missing.
export const getStateFromPath = <ParamList extends {}>(
  path: string,
  options?: Parameters<NonNullable<typeof getStateFromPathDefault<ParamList>>>[1],
) => {
  if (!getStateFromPathDefault) return undefined;

  const state = getStateFromPathDefault<ParamList>(path, options);
  if (!state) return state;

  const hasBase = state.routes.some(r => r.name === 'MainTabs');
  if (!hasBase) {
    return {
      ...state,
      routes: [
        { name: 'MainTabs' } as (typeof state.routes)[number],
        ...state.routes,
      ],
      index: state.routes.length,
    };
  }

  return state;
};

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'bombaycanvas://',
    'https://www.canvasott.com',
    'https://canvasott.com',
  ],
  config: {
    screens: {
      Video: {
        path: 'video/:id',
        parse: { id: (id: string) => id },
      },
    },
  },
  getStateFromPath,
};

export const pathFromDeepLink = (url: string): string | null => {
  const prefix = linking.prefixes.find(p => url.startsWith(p));
  if (!prefix) return null;
  const path = url.slice(prefix.length);
  return path.startsWith('/') ? path : `/${path}`;
};