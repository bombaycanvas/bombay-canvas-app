import {
  buildPlaybackSources,
  hasPlayableSource,
  isHlsUrl,
} from './videoSource';

const episode = {
  playbackUrl: null,
  videoUrl: 'https://cdn/ep1.mp4',
  tvVideoUrl: 'https://cdn/ep1-tv.mp4',
};

describe('buildPlaybackSources', () => {
  it('prefers the TV master on isTV series, matching the web player', () => {
    expect(buildPlaybackSources(episode, { isTV: true })).toEqual([
      'https://cdn/ep1-tv.mp4',
      'https://cdn/ep1.mp4',
    ]);
  });

  it('prefers the portrait master otherwise', () => {
    expect(buildPlaybackSources(episode, { isTV: false })).toEqual([
      'https://cdn/ep1.mp4',
      'https://cdn/ep1-tv.mp4',
    ]);
  });

  it('always puts the HLS ladder first', () => {
    const sources = buildPlaybackSources(
      { ...episode, playbackUrl: 'https://cdn/ep1/master.m3u8' },
      { isTV: true },
    );
    expect(sources[0]).toBe('https://cdn/ep1/master.m3u8');
    expect(sources).toHaveLength(3);
  });

  it('skips blank URLs and de-duplicates', () => {
    expect(
      buildPlaybackSources(
        {
          playbackUrl: '   ',
          videoUrl: 'https://cdn/a.mp4',
          tvVideoUrl: 'https://cdn/a.mp4',
        },
        null,
      ),
    ).toEqual(['https://cdn/a.mp4']);
  });

  it('encodes spaces without double-encoding an escaped URL', () => {
    expect(
      buildPlaybackSources({ videoUrl: 'https://cdn/my ep.mp4' }, null),
    ).toEqual(['https://cdn/my%20ep.mp4']);
    expect(
      buildPlaybackSources({ videoUrl: 'https://cdn/my%20ep.mp4' }, null),
    ).toEqual(['https://cdn/my%20ep.mp4']);
  });

  it('returns nothing for a locked episode whose URLs were stripped', () => {
    expect(buildPlaybackSources({ id: 'ep1' } as any, { isTV: true })).toEqual(
      [],
    );
    expect(hasPlayableSource({ id: 'ep1' } as any, { isTV: true })).toBe(false);
  });
});

describe('isHlsUrl', () => {
  it('detects m3u8 playlists, with or without a query string', () => {
    expect(isHlsUrl('https://cdn/x/master.m3u8')).toBe(true);
    expect(isHlsUrl('https://cdn/x/master.m3u8?token=abc')).toBe(true);
    expect(isHlsUrl('https://cdn/x.mp4')).toBe(false);
    expect(isHlsUrl(null)).toBe(false);
  });
});
