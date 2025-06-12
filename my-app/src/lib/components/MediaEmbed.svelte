<script lang="ts">
  import { getEmbedInfo } from '$lib/utils/embed-utils';

  // Props
  export let url: string;
  export let title: string = 'Embedded content';

  // Process the URL if it's not already an embed URL
  let embedUrl = url;
  let isSpotify = false;
  let spotifyContentType: string | undefined = undefined;
  let aspectRatio = 16/9; // Default aspect ratio

  // If the URL doesn't look like an embed URL, try to transform it
  if (!url.includes('/embed/') && !url.includes('player.')) {
    const embedInfo = getEmbedInfo(url);
    if (embedInfo) {
      embedUrl = embedInfo.embedUrl;

      // Handle Spotify embeds specially
      if (embedInfo.platform === 'spotify') {
        isSpotify = true;
        spotifyContentType = embedInfo.meta?.spotify?.contentType;
      }
      // Set aspect ratio based on platform
      else if (embedInfo.platform === 'soundcloud') {
        aspectRatio = 4; // SoundCloud is very wide
      }
    }
  } else if (url.includes('spotify.com/embed')) {
    // Handle direct Spotify embed URLs
    isSpotify = true;
    const match = url.match(/\/embed\/([^/]+)\//);
    if (match) {
      spotifyContentType = match[1];
    }
  }

  // Calculate padding percentage for responsive container (for non-Spotify embeds)
  const paddingPercentage = (1 / aspectRatio) * 100;

  // Get the appropriate height for Spotify embeds based on content type
  function getSpotifyHeight(): string {
    if (!spotifyContentType) return '152px'; // Default fallback

    switch (spotifyContentType) {
      case 'track':
        return '152px';
      case 'album':
        return '380px';
      case 'playlist':
        return '380px';
      case 'artist':
        return '380px';
      default:
        return '152px';
    }
  }
</script>

<div class="embed-container">
  {#if isSpotify}
    <!-- Spotify embeds need fixed heights based on content type -->
    <div class="spotify-embed" style="height: {getSpotifyHeight()}">
      <iframe
        src={embedUrl}
        title={title}
        frameborder="0"
        allow="encrypted-media"
        loading="lazy"
      ></iframe>
    </div>
  {:else}
    <!-- Other embeds use aspect ratio approach -->
    <div class="responsive-embed" style="padding-top: {paddingPercentage}%">
      <iframe
        src={embedUrl}
        title={title}
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
      ></iframe>
    </div>
  {/if}
</div>

<style>
  .embed-container {
    width: 100%;
    margin: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1);
    background: #f6f6f6;
    overflow: hidden;
  }

  /* Responsive embed container for YouTube, Vimeo, etc. */
  .responsive-embed {
    position: relative;
    width: 100%;
    height: 0;
    background: #f6f6f6;
  }

  .responsive-embed iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    background: #f6f6f6 ;
  }

  /* Spotify embed with fixed height based on content type */
  .spotify-embed {
    width: 100%;
    background: #f6f6f6;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spotify-embed iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: #f6f6f6;
  }
</style>
