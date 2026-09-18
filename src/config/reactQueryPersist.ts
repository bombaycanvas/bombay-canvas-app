import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import queryClient from './queryClient';

const persister = createAsyncStoragePersister({
    storage: AsyncStorage,
});

// Queries whose answer belongs to the device rather than to the Canvas account,
// and so must never be restored from a previous run.
const NEVER_PERSIST = ['appleCatalogue'];

persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    // Bump whenever what may be persisted changes. Without it the blob already
    // on a device is still restored on the next launch, so the very prices this
    // stopped saving come back once more before they age out.
    buster: 'v3-series-language',
    dehydrateOptions: {
        // The App Store catalogue carries the charged price and the intro-offer
        // eligibility, both owned by the Apple ID signed into the device and both
        // able to change between launches — a storefront switch, a price edit, a
        // subscribe on another device. Restoring last week's copy paints the
        // paywall with a price the store will not honour, and the tap then charges
        // something else. A blank card while StoreKit answers is the honest state.
        shouldDehydrateQuery: query =>
            query.state.status === 'success' &&
            !NEVER_PERSIST.includes(String(query.queryKey[0])),
    },
});
