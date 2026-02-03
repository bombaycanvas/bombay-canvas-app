import { useEffect, useState } from 'react';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHED_VIDEO_KEY = 'COVER_VIDEO_CACHE_METADATA';

interface CacheMetadata {
    remoteUrl: string;
    localPath: string;
}

export const useVideoCache = (remoteUrl?: string) => {
    const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!remoteUrl) {
            setVideoUrl(undefined);
            return;
        }

        const checkCache = async () => {
            try {
                const metadataJson = await AsyncStorage.getItem(CACHED_VIDEO_KEY);
                const metadata: CacheMetadata | null = metadataJson
                    ? JSON.parse(metadataJson)
                    : null;
                const extension = remoteUrl.split('.').pop() || 'mp4';
                const fileName = `cover_video.${extension}`;
                const localPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

                // If we have a cached version and it matches the current remote URL
                if (metadata && metadata.remoteUrl === remoteUrl) {
                    const exists = await RNFS.exists(localPath);
                    if (exists) {
                        console.log('Using cached video:', localPath);
                        setVideoUrl(localPath);
                        return;
                    }
                }

                // If not cached or URL changed, stream remote URL immediately
                console.log('Streaming remote video:', remoteUrl);
                setVideoUrl(remoteUrl);

                // And start downloading in background
                const downloadDest = localPath;

                // Ensure we clean up old file if it exists (e.g. partial download or old version)
                if (await RNFS.exists(downloadDest)) {
                    await RNFS.unlink(downloadDest);
                }

                const options = {
                    fromUrl: remoteUrl,
                    toFile: downloadDest,
                    background: true,
                    discretionary: true, // Allow OS to optimize timing (optional)
                };

                const ret = RNFS.downloadFile(options);

                ret.promise
                    .then(async res => {
                        if (res.statusCode === 200) {
                            console.log('Video downloaded successfully to:', downloadDest);
                            const newMetadata: CacheMetadata = {
                                remoteUrl,
                                localPath: downloadDest,
                            };
                            await AsyncStorage.setItem(
                                CACHED_VIDEO_KEY,
                                JSON.stringify(newMetadata),
                            );
                        } else {
                            console.log('Video download failed status:', res.statusCode);
                        }
                    })
                    .catch(err => {
                        console.log('Video download error:', err);
                    });
            } catch (error) {
                console.error('Error in useVideoCache:', error);
                setVideoUrl(remoteUrl); // Fallback to remote
            }
        };

        checkCache();
    }, [remoteUrl]);

    return videoUrl;
};
