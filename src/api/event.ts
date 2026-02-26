// src/api/event.ts
import { API_BASE_URL } from "../config/api";

export const trackEvent = async (payload: {
  userId: string;
  contentId: string | number;
  event: "watch_time" | "skip";
  duration: number;
}) => {
  try {
    await fetch(`${API_BASE_URL}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // silent fail (do not break UX)
  }
};
