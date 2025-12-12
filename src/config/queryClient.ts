import { QueryClient } from '@tanstack/react-query';

const queryClient = (() => {
  let instance: QueryClient | null = null;
  return () => {
    if (!instance) {
      instance = new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: true,
            refetchOnMount: false,
            retry: false,
            staleTime: 60000 * 3,
          },
        },
      });
    }
    return instance;
  };
})();

export default queryClient();
