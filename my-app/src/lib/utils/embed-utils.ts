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
