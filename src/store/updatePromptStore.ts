import { create } from 'zustand';

interface UpdatePromptState {
  visible: boolean;
  show: () => void;
  hide: () => void;
}

/**
 * Visibility of the "update the app" prompt, mounted once app-wide. Raised by
 * the API client whenever any endpoint answers APP_UPDATE_REQUIRED, so every
 * screen gets the same response without handling the code itself.
 */
export const useUpdatePromptStore = create<UpdatePromptState>(set => ({
  visible: false,
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
}));
