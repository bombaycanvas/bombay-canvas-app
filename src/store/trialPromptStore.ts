import { create } from 'zustand';

interface TrialPromptState {
  visible: boolean;
  /**
   * The launch-time prompt is a reminder, not a gate: it fires once per app
   * session and then stays out of the way. Explicit triggers — tapping a locked
   * episode — call show() again regardless, because there the user has just
   * asked for the thing the prompt answers.
   */
  promptedThisSession: boolean;
  /**
   * Mirrored off the subscription queries by TrialEndedPrompt, which is mounted
   * once for the whole app.
   *
   * The player reads it from here rather than subscribing to those queries
   * itself: a feed mounts a VideoPlayer per episode, and `subscriptionPlans` is
   * declared `staleTime: 0`, so every new observer would refetch GET /plans —
   * turning a scroll through the feed into a burst of identical requests.
   */
  trialConsumed: boolean;
  setTrialConsumed: (consumed: boolean) => void;
  showTrialPrompt: () => void;
  hideTrialPrompt: () => void;
}

/** Visibility of the "your free trial has ended" dialog, which is mounted app-wide. */
export const useTrialPromptStore = create<TrialPromptState>(set => ({
  visible: false,
  promptedThisSession: false,
  trialConsumed: false,
  setTrialConsumed: consumed => set({ trialConsumed: consumed }),
  showTrialPrompt: () => set({ visible: true, promptedThisSession: true }),
  hideTrialPrompt: () => set({ visible: false }),
}));
