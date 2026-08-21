/**
 * Playback source resolution shared by the player (and anything else that needs
 * a URL to hand to AVPlayer / ExoPlayer).
 *
 * An episode can carry up to three playable URLs:
 *
 *   - `playbackUrl`  HLS ladder written by the transcode pipeline. Adaptive and
 *                    made of device-safe renditions, so it always wins.
 *   - `tvVideoUrl`   landscape "TV" master, uploaded for `isTV` series.
 *   - `videoUrl`     original progressive MP4 the creator uploaded.
 *
 * The web player picks `tvVideoUrl` whenever `series.isTV` is set
 * (VideoPage `isTVEpisode`); the app used to always play `videoUrl`. That gap is
 * why TV titles play on web but fail on device — the portrait masters of those
 * titles are encoded above what mobile hardware decoders accept (e.g. 2160x4096
 * H.264, past the 4096x2304 iOS ceiling), which surfaces as AVFoundation
 * -11800 / -12746. Mirroring the web order here fixes that class of failure, and
 * returning the *rest* of the URLs as fallbacks means a source the device cannot
 * decode retries instead of dead-ending on a black screen.
 */

export type PlayableEpisode = {
  playbackUrl?: string | null;
  videoUrl?: string | null;
  tvVideoUrl?: string | null;
};

export type PlayableSeries = {
  isTV?: boolean | null;
} | null;

export const isHlsUrl = (url?: string | null): boolean =>
  typeof url === 'string' && /\.m3u8(?:$|[?#])/i.test(url);

/**
 * Legacy uploads can carry raw spaces in the object name. Encode only those, so
 * an already percent-encoded URL is never double-encoded (`%20` -> `%2520`).
 */
const normalizeUrl = (url?: string | null): string | null => {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.includes(' ') ? encodeURI(trimmed) : trimmed;
};

/**
 * Ordered playback candidates for an episode, best first. Empty when the episode
 * carries no playable URL at all (locked episodes have them stripped server-side).
 */
export const buildPlaybackSources = (
  episode?: PlayableEpisode | null,
  series?: PlayableSeries,
): string[] => {
  const progressive = series?.isTV
    ? [episode?.tvVideoUrl, episode?.videoUrl]
    : [episode?.videoUrl, episode?.tvVideoUrl];

  const sources: string[] = [];
  for (const candidate of [episode?.playbackUrl, ...progressive]) {
    const url = normalizeUrl(candidate);
    if (url && !sources.includes(url)) sources.push(url);
  }
  return sources;
};

export const hasPlayableSource = (
  episode?: PlayableEpisode | null,
  series?: PlayableSeries,
): boolean => buildPlaybackSources(episode, series).length > 0;
