import { API_BASE_URL } from '../config/api';
import { CLIENT_PLATFORM } from '../utils/api';

export const trackEvent = async (payload: {
  userId: string;
  contentId: string | number;
  event: 'watch_time' | 'skip';
  duration: number;
}) => {
  try {
    await fetch(`${API_BASE_URL}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Platform': CLIENT_PLATFORM,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.log('Event tracking failed:', e);
  }
};
