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
}

export const useVideoStore = create<VideoState>(set => ({
  episodes: [],
  currentEpisodeId: null,
  isPaused: true,
  setEpisodes: episodes => set({ episodes }),
  setCurrentEpisodeId: episodeId =>
    set({ currentEpisodeId: episodeId, isPaused: false }),
  setPaused: paused => set({ isPaused: paused }),
  resetPlayer: () =>
    set({
      isPaused: true,
      currentEpisodeId: null,
    }),
}));
