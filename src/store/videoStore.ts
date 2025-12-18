import { create } from 'zustand';

interface Episode {
  id: string;
  videoUrl: string;
  title: string;
  description: string;
  [key: string]: any;
}

interface VideoState {
  episodes: Episode[];
  currentEpisodeId: string | null;
  isPaused: boolean;
  setEpisodes: (episodes: Episode[]) => void;
  setCurrentEpisodeId: (episodeId: string | null) => void;
  setPaused: (paused: boolean) => void;
  resetPlayer: () => void;
  isLockedVisibleModal: boolean;
  setIsLockedVisibleModal: (isLockedVisibleModal: boolean) => void;
  isPurchaseModal: boolean;
  setIsPurchaseModal: (isPurchaseModal: boolean) => void;
  purchaseSeries: any | null;
  setPurchaseSeries: (series: any | null) => void;
  resetPurchaseState: () => void;
  controlsVisible: boolean;
  setControlsVisible: (value: boolean) => void;
}

export const useVideoStore = create<VideoState>(set => ({
  episodes: [],
  currentEpisodeId: null,
  isPaused: true,
  controlsVisible: false,
  setEpisodes: episodes => set({ episodes }),
  setCurrentEpisodeId: episodeId =>
    set({ currentEpisodeId: episodeId, isPaused: false }),
  setPaused: paused => set({ isPaused: paused }),
  setControlsVisible: value => set({ controlsVisible: value }),
  resetPlayer: () =>
    set({
      isPaused: true,
      currentEpisodeId: null,
    }),
  isLockedVisibleModal: false,
  setIsLockedVisibleModal: (value: boolean) =>
    set({ isLockedVisibleModal: value }),
  isPurchaseModal: false,
  setIsPurchaseModal: (value: boolean) => set({ isPurchaseModal: value }),
  purchaseSeries: null,
  setPurchaseSeries: (series: any | null) => set({ purchaseSeries: series }),
  resetPurchaseState: () =>
    set({
      purchaseSeries: null,
      isPurchaseModal: false,
    }),
}));
