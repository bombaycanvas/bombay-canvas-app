import { useEffect, useCallback, useState } from 'react';
import {
    useCastSession,
    useRemoteMediaClient,
    MediaRepeatMode,
    MediaPlayerState,
} from 'react-native-google-cast';
import { useCastStore } from '../store/castStore';

interface Episode {
    id: string;
    title: string;
    videoUrl?: string;
    tvVideoUrl?: string;
    thumbnail?: string;
    season?: number;
    episodeNo?: number;
    isPublic?: boolean;
    locked?: boolean;
}

interface Series {
    id: string;
    title: string;
    posterUrl?: string;
    episodes: Episode[];
    isPaidSeries?: boolean;
    userPurchased?: boolean;
}

export const useCastManager = () => {

    const session = useCastSession();
    const client = useRemoteMediaClient();

    const {
        setCasting,
        setQueueLoaded,
        setCurrentEpisode,
    } = useCastStore();

    const [playerState, setPlayerState] = useState<MediaPlayerState>(MediaPlayerState.IDLE);


    useEffect(() => {
        if (session) {
            setCasting(true);
        } else {
            setCasting(false);
            setQueueLoaded(false);
        }
    }, [session, setCasting, setQueueLoaded]);


    const buildQueue = useCallback((series: Series, isAuthenticated: boolean) => {

        return series.episodes
            .map(ep => {

                // Check if accessible
                const isLocked = !ep.isPublic && !isAuthenticated;
                const isPaidEpisode = !isLocked && ep.locked && series.isPaidSeries && !series.userPurchased;

                if (isLocked || isPaidEpisode) return null;

                const url = ep.tvVideoUrl || ep.videoUrl;
                if (!url) return null;

                const contentType = url.includes('.m3u8')
                    ? 'application/x-mpegURL'
                    : 'video/mp4';

                return {
                    mediaInfo: {
                        contentUrl: encodeURI(url),
                        contentType,
                        streamType: 'BUFFERED',

                        metadata: {
                            type: 'tv_show',
                            title: `${ep.title} (S${ep.season || 1} E${ep.episodeNo || 1})`,
                            subtitle: series.title,
                            episodeId: ep.id,
                            seriesTitle: series.title,
                            season: ep.season || 1,
                            episode: ep.episodeNo || 1,
                            images: [{ url: ep.thumbnail || series.posterUrl }],
                        },
                    },

                    autoplay: true,
                    startTime: 0,
                };

            })
            .filter(Boolean);

    }, []);


    const loadQueue = useCallback(
        async (series: Series, episodeId: string, isAuthenticated: boolean) => {

            if (!client || !session) return;

            const queue = buildQueue(series, isAuthenticated);
            if (!queue.length) return;

            // Find start index in the FILTERED queue
            const queueItems = queue as any[];
            const startIndex = queueItems.findIndex(
                item => item.mediaInfo.metadata.episodeId === episodeId,
            );

            if (startIndex < 0) return;
            try {

                await client.loadMedia({
                    queueData: {
                        items: queueItems,
                        startIndex,
                        repeatMode: MediaRepeatMode.OFF,
                    },
                });

                setQueueLoaded(true);
                setCurrentEpisode(episodeId);

            } catch (e) {
                console.log('queueLoad error', e);
            }

        },
        [client, session, buildQueue, setQueueLoaded, setCurrentEpisode],
    );

    /* ---------- SWITCH EPISODE ---------- */

    const switchEpisode = useCallback(
        async (series: Series, episodeId: string, isAuthenticated: boolean) => {

            if (!client) return;

            try {

                const queue = buildQueue(series, isAuthenticated);
                const queueItems = queue as any[];
                const startIndex = queueItems.findIndex(
                    item => item.mediaInfo.metadata.episodeId === episodeId,
                );

                if (startIndex < 0) return;

                await client.loadMedia({
                    queueData: {
                        items: queueItems,
                        startIndex,
                        repeatMode: MediaRepeatMode.OFF,
                    },
                });

                setCurrentEpisode(episodeId);

            } catch (e) {
                console.log('Switch episode error', e);
            }

        },
        [client, buildQueue, setCurrentEpisode],
    );

    /* ---------- PLAYBACK CONTROLS ---------- */

    const play = useCallback(() => {
        client?.play();
    }, [client]);

    const pause = useCallback(() => {
        client?.pause();
    }, [client]);

    const next = useCallback(() => {
        client?.queueNext();
    }, [client]);

    const previous = useCallback(() => {
        client?.queuePrev();
    }, [client]);

    const stop = useCallback(() => {
        client?.stop();
    }, [client]);

    /* ---------- SYNC FROM TV ---------- */

    useEffect(() => {
        if (!client) return;

        const sub = client.onMediaStatusUpdated(status => {
            if (!status) return;

            const currentId = status.currentItemId;
            const items = status.queueItems;
            if (!status.queueItems?.length) return;
            if (currentId === undefined || !items) return;

            const currentItem = items.find(
                item => item.itemId === currentId,
            );

            const episodeId =
                (currentItem?.mediaInfo?.metadata as any)?.episodeId;

            if (episodeId) {
                setCurrentEpisode(episodeId);
            }

            if (status.playerState) {
                setPlayerState(status.playerState);
            }
        });

        return () => {
            if (sub && typeof sub.remove === 'function') {
                sub.remove();
            }
        };
    }, [client, setCurrentEpisode]);

    return {
        loadQueue,
        switchEpisode,
        play,
        pause,
        next,
        previous,
        stop,
        isCasting: !!session,
        playerState,
        MediaPlayerState,
    };
};
