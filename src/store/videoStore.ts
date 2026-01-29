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
  animationSeriesId: string | null;
  shouldRestoreSeriesAnimation: boolean;

  setSeries: (series: any | null) => void;
  setEpisodes: (episodes: Episode[]) => void;
  setCurrentEpisodeId: (episodeId: string | null) => void;
  setPaused: (paused: boolean) => void;
  resetPlayer: () => void;
  activeCardRef: React.RefObject<any> | null;
  setActiveCardRef: (ref: React.RefObject<any> | null) => void;

  isLockedVisibleModal: boolean;
  setIsLockedVisibleModal: (value: boolean) => void;

  isPurchaseModal: boolean;
  setIsPurchaseModal: (value: boolean) => void;

  purchaseSeries: any | null;
  setPurchaseSeries: (series: any | null) => void;
  resetPurchaseState: () => void;

  authRedirect: { screen: string; params?: any } | null;
  setAuthRedirect: (redirect: { screen: string; params?: any } | null) => void;

  setAnimationSeriesId: (id: string | null) => void;
  setShouldRestoreSeriesAnimation: (value: boolean) => void;
}

export const useVideoStore = create<VideoState>(set => ({
  series: null,
  episodes: [],
  currentEpisodeId: null,
  isPaused: true,
  animationSeriesId: null,
  shouldRestoreSeriesAnimation: false,

  activeCardRef: null,
  setActiveCardRef: ref => set({ activeCardRef: ref }),

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

  setAnimationSeriesId: id => set({ animationSeriesId: id }),
  setShouldRestoreSeriesAnimation: value =>
    set({ shouldRestoreSeriesAnimation: value }),

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

  resetPlayerSoft: () =>
    set({
      isPaused: true,
      currentEpisodeId: null,
    }),
}));
