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
            retry: 1,
            staleTime: 1000 * 60 * 1,
          },
        },
      });
    }
    return instance;
  };
})();

export default queryClient();
