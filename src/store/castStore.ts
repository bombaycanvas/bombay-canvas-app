import { create } from 'zustand';

interface CastState {
    isCasting: boolean;
    queueLoaded: boolean;
    currentEpisodeId?: string;
    seriesId?: string;

    setCasting: (v: boolean) => void;
    setQueueLoaded: (v: boolean) => void;
    setCurrentEpisode: (id?: string) => void;
    setSeries: (id?: string) => void;

    reset: () => void;
}

export const useCastStore = create<CastState>(set => ({
    isCasting: false,
    queueLoaded: false,

    setCasting: v => set({ isCasting: v }),
    setQueueLoaded: v => set({ queueLoaded: v }),
    setCurrentEpisode: id => set({ currentEpisodeId: id }),
    setSeries: id => set({ seriesId: id }),

    reset: () =>
        set({
            isCasting: false,
            queueLoaded: false,
            currentEpisodeId: undefined,
            seriesId: undefined,
        }),
}));
