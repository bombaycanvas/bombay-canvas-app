import { create } from 'zustand';

interface Episode {
  id: string;
  videoUrl: string;
  title: string;
  description: string;
  [key: string]: any;
}

interface VideoState {
  series: any | null;
  episodes: Episode[];
  currentEpisodeId: string | null;
  isPaused: boolean;

  setSeries: (series: any | null) => void;
  setEpisodes: (episodes: Episode[]) => void;
  setCurrentEpisodeId: (episodeId: string | null) => void;
  setPaused: (paused: boolean) => void;
  resetPlayer: () => void;

  isLockedVisibleModal: boolean;
  setIsLockedVisibleModal: (value: boolean) => void;

  isPurchaseModal: boolean;
  setIsPurchaseModal: (value: boolean) => void;

  purchaseSeries: any | null;
  setPurchaseSeries: (series: any | null) => void;
  resetPurchaseState: () => void;

  authRedirect: { screen: string; params?: any } | null;
  setAuthRedirect: (redirect: { screen: string; params?: any } | null) => void;
}

export const useVideoStore = create<VideoState>(set => ({
  series: null,
  episodes: [],
  currentEpisodeId: null,
  isPaused: true,

  setSeries: series => set({ series }),
  setEpisodes: episodes => set({ episodes }),
  setCurrentEpisodeId: episodeId =>
    set({ currentEpisodeId: episodeId, isPaused: false }),
  setPaused: paused => set({ isPaused: paused }),

  resetPlayer: () =>
    set({
      isPaused: true,
      currentEpisodeId: null,
      episodes: [],
      series: null,
    }),

  isLockedVisibleModal: false,
  setIsLockedVisibleModal: value => set({ isLockedVisibleModal: value }),

  isPurchaseModal: false,
  setIsPurchaseModal: value => set({ isPurchaseModal: value }),

  purchaseSeries: null,
  setPurchaseSeries: series => set({ purchaseSeries: series }),
  resetPurchaseState: () =>
    set({ purchaseSeries: null, isPurchaseModal: false }),

  authRedirect: null,
  setAuthRedirect: redirect => set({ authRedirect: redirect }),
}));
