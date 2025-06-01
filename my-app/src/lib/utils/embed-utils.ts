/**
 * Simple utility for transforming URLs into embeddable formats
 */

// Supported platforms
export type EmbedPlatform = 'youtube' | 'vimeo' | 'spotify' | 'soundcloud';

// Spotify content types
export type SpotifyContentType = 'track' | 'album' | 'playlist' | 'artist';

// Embed info with additional metadata
export interface EmbedInfo {
  embedUrl: string;
  platform: EmbedPlatform;
  title?: string;
  // Additional metadata for specific platforms
  meta?: {
    // Spotify-specific metadata
    spotify?: {
      contentType: SpotifyContentType;
    }
  }
}

/**
 * Transform a URL into an embeddable format
 * @param url The original URL
 * @returns Object with embed URL and platform info, or null if not supported
 */
export function getEmbedInfo(url: string): EmbedInfo | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');

    // YouTube
    if (hostname === 'youtube.com' || hostname === 'youtu.be') {
      let videoId = '';

      if (hostname === 'youtube.com' && urlObj.pathname.includes('/watch')) {
        videoId = urlObj.searchParams.get('v') || '';
      } else if (hostname === 'youtu.be') {
        videoId = urlObj.pathname.substring(1);
      }

      if (videoId) {
        return {
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
          platform: 'youtube'
        };
      }
    }

    // Vimeo
    if (hostname === 'vimeo.com') {
      const videoId = urlObj.pathname.substring(1);
      if (videoId && /^\d+$/.test(videoId)) {
        return {
          embedUrl: `https://player.vimeo.com/video/${videoId}`,
          platform: 'vimeo'
        };
      }
    }

    // Spotify
    if (hostname === 'open.spotify.com') {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const type = parts[0] as SpotifyContentType; // track, album, playlist, artist
        const id = parts[1];

        if (id && ['track', 'album', 'playlist', 'artist'].includes(type)) {
          return {
            embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
            platform: 'spotify',
            meta: {
              spotify: {
                contentType: type
              }
            }
          };
        }
      }
    }

    // SoundCloud
    if (hostname === 'soundcloud.com') {
      return {
        embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true`,
        platform: 'soundcloud'
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a URL is from a supported embed platform
 * @param url The URL to check
 * @returns True if the URL is from a supported platform
 */
export function isSupportedEmbedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');

    return (
      hostname === 'youtube.com' ||
      hostname === 'youtu.be' ||
      hostname === 'vimeo.com' ||
      hostname === 'open.spotify.com' ||
      hostname === 'soundcloud.com'
    );
  } catch (error) {
    return false;
  }
}

/**
 * Get a list of supported embed domains
 * @returns Array of supported domain names
 */
export function getSupportedEmbedDomains(): string[] {
  return [
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'open.spotify.com',
    'soundcloud.com'
  ];
}

/**
 * Fetch metadata for an embed URL
 * @param embedInfo The embed info object
 * @param originalUrl The original URL that was used to create the embed
 * @returns Promise with updated embed info including title
 */
export async function fetchEmbedMetadata(embedInfo: EmbedInfo, originalUrl?: string): Promise<EmbedInfo> {
  try {
    switch (embedInfo.platform) {
      case 'youtube':
        return await fetchYouTubeMetadata(embedInfo);
      case 'vimeo':
        return await fetchVimeoMetadata(embedInfo);
      case 'spotify':
        return await fetchSpotifyMetadata(embedInfo);
      case 'soundcloud':
        return await fetchSoundCloudMetadata(embedInfo, originalUrl);
      default:
        return embedInfo;
    }
  } catch (error) {
    console.warn('Failed to fetch embed metadata:', error);
    return embedInfo;
  }
}

/**
 * Fetch YouTube video metadata using oEmbed API
 */
async function fetchYouTubeMetadata(embedInfo: EmbedInfo): Promise<EmbedInfo> {
  const videoId = embedInfo.embedUrl.split('/embed/')[1]?.split('?')[0];
  if (!videoId) return embedInfo;

  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  try {
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      return {
        ...embedInfo,
        title: data.title || 'YouTube Video'
      };
    }
  } catch (error) {
    console.warn('Failed to fetch YouTube metadata:', error);
  }

  return embedInfo;
}

/**
 * Fetch Vimeo video metadata using oEmbed API
 */
async function fetchVimeoMetadata(embedInfo: EmbedInfo): Promise<EmbedInfo> {
  const videoId = embedInfo.embedUrl.split('/video/')[1]?.split('?')[0];
  if (!videoId) return embedInfo;

  const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`;

  try {
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      return {
        ...embedInfo,
        title: data.title || 'Vimeo Video'
      };
    }
  } catch (error) {
    console.warn('Failed to fetch Vimeo metadata:', error);
  }

  return embedInfo;
}

/**
 * Fetch Spotify metadata using oEmbed API
 */
async function fetchSpotifyMetadata(embedInfo: EmbedInfo): Promise<EmbedInfo> {
  const spotifyUrl = embedInfo.embedUrl.replace('/embed/', '/');
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;

  try {
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      return {
        ...embedInfo,
        title: data.title || 'Spotify Content'
      };
    }
  } catch (error) {
    console.warn('Failed to fetch Spotify metadata:', error);
  }

  return embedInfo;
}

/**
 * Fetch SoundCloud metadata using oEmbed API
 */
async function fetchSoundCloudMetadata(embedInfo: EmbedInfo, originalUrl?: string): Promise<EmbedInfo> {
  // Use the provided original URL, or try to extract it from the embed URL
  let soundcloudUrl = originalUrl;

  if (!soundcloudUrl) {
    const urlMatch = embedInfo.embedUrl.match(/url=([^&]+)/);
    if (!urlMatch) {
      console.warn('Could not extract original URL from SoundCloud embed URL');
      return embedInfo;
    }
    soundcloudUrl = decodeURIComponent(urlMatch[1]);
  }

  // Use a CORS proxy or try the direct oEmbed endpoint
  const oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(soundcloudUrl)}&format=json`;

  try {
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      return {
        ...embedInfo,
        title: data.title || 'SoundCloud Track'
      };
    } else {
      console.warn('SoundCloud oEmbed API returned non-OK status:', response.status);
    }
  } catch (error) {
    console.warn('Failed to fetch SoundCloud metadata:', error);

    // Fallback: try to extract title from the original URL structure
    try {
      const urlParts = soundcloudUrl.split('/');
      if (urlParts.length >= 2) {
        const trackName = urlParts[urlParts.length - 1];
        const artistName = urlParts[urlParts.length - 2];
        if (trackName && artistName) {
          const formattedTitle = `${trackName.replace(/-/g, ' ')} by ${artistName}`;
          return {
            ...embedInfo,
            title: formattedTitle
          };
        }
      }
    } catch (fallbackError) {
      console.warn('Fallback title extraction failed:', fallbackError);
    }
  }

  return embedInfo;
}
