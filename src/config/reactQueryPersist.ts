import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { defaultShouldDehydrateQuery } from '@tanstack/react-query';
import queryClient from './queryClient';
import { isEntitlementAuthorityKey } from './entitlementQueryKeys';

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 7,
  dehydrateOptions: {
    // Keep subscription/entitlement state OFF disk. maxAge here is 7 days
    // and the client defaults to refetchOnMount:false — so without this
    // filter a "trial available, not subscribed" snapshot written during
    // checkout can be restored and served for a WEEK after the activation
    // webhook proved it wrong, re-selling a subscription the user owns.
    //
    // Those queries opt into refetchOnMount:'always' precisely because they
    // have no disk copy to fall back on: they are cheap, and only the server
    // can answer them correctly. Content lists stay persisted (they are the
    // cold-start UX) and are kept honest by invalidateEntitlementQueries.
    shouldDehydrateQuery: query =>
      defaultShouldDehydrateQuery(query) &&
      !isEntitlementAuthorityKey(query.queryKey),
  },
});
