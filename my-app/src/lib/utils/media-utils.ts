import type { MediaInfo } from '$lib/stores/hoverStore';
import { getEmbedInfo } from './embed-utils';

/**
 * Extract file extension from URL
 */
export function getFileExtension(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const extension = pathname.split('.').pop()?.toUpperCase();
    // Only return extension if it looks like a valid file extension
    if (extension && extension.length >= 2 && extension.length <= 5 && /^[A-Z0-9]+$/.test(extension)) {
      return extension;
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Format file size from bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
}

/**
 * Format duration from seconds to mm:ss format
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get media information from HTML element
 */
export async function getMediaInfo(element: HTMLElement, mediaType: string, url: string, title?: string): Promise<MediaInfo> {
  const fileExtension = getFileExtension(url);
  const baseInfo: MediaInfo = {
    type: mediaType as 'image' | 'video' | 'audio' | 'embed',
    format: fileExtension || undefined,
    title: title || undefined
  };

  try {
    if (mediaType === 'image') {
      // For images, try to get the img element (could be nested in button)
      const imgElement = element instanceof HTMLImageElement ? element : element.querySelector('img');
      if (imgElement && imgElement.naturalWidth && imgElement.naturalHeight) {
        baseInfo.resolution = `${imgElement.naturalWidth}x${imgElement.naturalHeight}`;
      }

      // Try to get file size from network if possible
      try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          baseInfo.size = formatFileSize(parseInt(contentLength));
        }
      } catch {
        // Ignore network errors for file size
      }
    }
    else if (mediaType === 'video') {
      // For videos, try to get the video element
      const videoElement = element instanceof HTMLVideoElement ? element : element.querySelector('video');
      if (videoElement) {
        // Get dimensions
        if (videoElement.videoWidth && videoElement.videoHeight) {
          baseInfo.resolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;
        }

        // Get duration
        if (videoElement.duration && !isNaN(videoElement.duration)) {
          baseInfo.duration = formatDuration(videoElement.duration);
        }
      }

      // Try to get file size
      try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          baseInfo.size = formatFileSize(parseInt(contentLength));
        }
      } catch {
        // Ignore network errors
      }
    }
    else if (mediaType === 'audio') {
      // For audio, find the audio element within the AudioPlayer component
      const audioPlayerDiv = element.querySelector('.audio-player') || element.closest('.audio-player');
      const audioElement = audioPlayerDiv?.querySelector('audio') as HTMLAudioElement;

      if (audioElement) {
        // If duration is already loaded
        if (audioElement.duration && !isNaN(audioElement.duration) && audioElement.duration !== Infinity) {
          baseInfo.duration = formatDuration(audioElement.duration);
        } else {
          // Try to load metadata if not already loaded
          try {
            if (audioElement.readyState < 1) {
              // Set preload to metadata to get duration
              audioElement.preload = 'metadata';

              // Wait for metadata to load
              await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                  audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
                  audioElement.removeEventListener('error', handleError);
                  reject(new Error('Timeout'));
                }, 3000); // 3 second timeout

                const handleLoadedMetadata = () => {
                  clearTimeout(timeout);
                  audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
                  audioElement.removeEventListener('error', handleError);
                  resolve();
                };

                const handleError = () => {
                  clearTimeout(timeout);
                  audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
                  audioElement.removeEventListener('error', handleError);
                  reject(new Error('Audio load error'));
                };

                audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
                audioElement.addEventListener('error', handleError);

                // Trigger loading if src is not set or different
                if (!audioElement.src || audioElement.src !== url) {
                  audioElement.src = url;
                  audioElement.load();
                }
              });
            }

            // Check duration again after loading metadata
            if (audioElement.duration && !isNaN(audioElement.duration) && audioElement.duration !== Infinity) {
              baseInfo.duration = formatDuration(audioElement.duration);
            }
          } catch {
            // Ignore errors in loading metadata
          }
        }
      }

      // Try to get file size
      try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          baseInfo.size = formatFileSize(parseInt(contentLength));
        }
      } catch {
        // Ignore network errors
      }
    }
    else if (mediaType === 'embed') {
      // For embeds, extract source information
      baseInfo.format = 'embed';
      baseInfo.source = getEmbedSource(url);
    }
  } catch (error) {
    console.warn('Error getting media info:', error);
  }

  return baseInfo;
}

/**
 * Extract source website from embed URL
 */
export function getEmbedSource(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    // Map common embed domains to readable names
    const sourceMap: Record<string, string> = {
      'youtube.com': 'YouTube',
      'youtu.be': 'YouTube',
      'vimeo.com': 'Vimeo',
      'open.spotify.com': 'Spotify',
      'soundcloud.com': 'SoundCloud',
      'player.vimeo.com': 'Vimeo',
      'w.soundcloud.com': 'SoundCloud'
    };
    
    return sourceMap[hostname] || hostname;
  } catch {
    return 'Unknown';
  }
}

/**
 * Format date to DD/MM/YYYY
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Format time to hh:mm
 */
export function formatTime(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Time';
  
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Get all content types present in a post
 */
export function getPostContentTypes(post: any): string[] {
  const types: string[] = [];
  
  if (post.text) {
    types.push('text');
  }
  
  if (post.media && post.media.length > 0) {
    const mediaTypes = [...new Set(post.media.map((m: any) => m.type))];
    types.push(...mediaTypes);
  }
  
  return types;
}
