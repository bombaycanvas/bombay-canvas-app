import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './routes';

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
        parse: {
          id: (id: string) => id,
        },
      },
    },
  },
};

export const pathFromDeepLink = (url: string): string | null => {
  const prefix = linking.prefixes.find(p => url.startsWith(p));
  if (!prefix) {
    return null;
  }

  const path = url.slice(prefix.length);
  return path.startsWith('/') ? path : `/${path}`;
};
