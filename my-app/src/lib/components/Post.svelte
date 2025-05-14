<script lang="ts">
  export let post: {
    id: string;
    text: string | null;
    author: { id: string; username: string };
    createdAt: Date | string | number;
    media: Array<{
      id: string;
      type: string;
      url: string;
      caption: string | null;
      position: number;
    }>;
  };

  // Utility for readable timestamp
  function formatDate(ts: Date | string | number) {
    return new Date(ts).toLocaleString();
  }

  import { onMount } from 'svelte';

  // Handle media aspect ratios after component mounts
  onMount(() => {
    // Process images
    const images = document.querySelectorAll('.post img') as NodeListOf<HTMLImageElement>;
    images.forEach(img => {
      if (img.complete) {
        checkImageAspectRatio(img);
      } else {
        img.onload = () => checkImageAspectRatio(img);
      }
    });

    // Process videos
    const videos = document.querySelectorAll('.post video') as NodeListOf<HTMLVideoElement>;
    videos.forEach(video => {
      if (video.readyState >= 1) {
        checkVideoAspectRatio(video);
      } else {
        video.onloadedmetadata = () => checkVideoAspectRatio(video);
      }
    });
  });

  // Check image aspect ratio and apply appropriate class
  function checkImageAspectRatio(img: HTMLImageElement) {
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const mediaItem = img.closest('.media-item');
    if (!mediaItem) return;

    // Clear any existing classes
    mediaItem.classList.remove('wide-media', 'tall-media', 'square-media', 'very-tall-media');

    // Apply appropriate class based on aspect ratio
    if (aspectRatio > 1.5) {
      // Wide image (landscape)
      mediaItem.classList.add('wide-media');
    } else if (aspectRatio < 0.33) {
      // Very tall image (greater than 1:3 ratio)
      mediaItem.classList.add('very-tall-media');
    } else if (aspectRatio < 0.67) {
      // Tall image (portrait)
      mediaItem.classList.add('tall-media');
    } else {
      // Roughly square image
      mediaItem.classList.add('square-media');
    }
  }

  // Check video aspect ratio and apply appropriate class
  function checkVideoAspectRatio(video: HTMLVideoElement) {
    const aspectRatio = video.videoWidth / video.videoHeight;
    const mediaItem = video.closest('.media-item');
    if (!mediaItem) return;

    // Clear any existing classes
    mediaItem.classList.remove('wide-media', 'tall-media', 'square-media', 'very-tall-media');

    // Apply appropriate class based on aspect ratio
    if (aspectRatio > 1.5) {
      // Wide video (landscape)
      mediaItem.classList.add('wide-media');
    } else if (aspectRatio < 0.33) {
      // Very tall video (greater than 1:3 ratio)
      mediaItem.classList.add('very-tall-media');
    } else if (aspectRatio < 0.67) {
      // Tall video (portrait)
      mediaItem.classList.add('tall-media');
    } else {
      // Roughly square video
      mediaItem.classList.add('square-media');
    }
  }
</script>

<article class="post">
  <!-- Media Gallery -->
  {#if post.media?.length > 0}
    <div class="media-container">
      {#each post.media as media}
        <div class="media-item">
          {#if media.type === 'image'}
            <img
              src={media.url}
              alt={media.caption || 'Image'}
            />
          {:else if media.type === 'video'}
            <video
              controls
              src={media.url}
            >
              <track kind="captions" label="Captions" />
            </video>
          {:else if media.type === 'audio'}
            <audio controls src={media.url}></audio>
          {:else if media.type === 'embed'}
            <iframe
              src={media.url}
              frameborder="0"
              allowfullscreen
              style="width:100%; min-height:320px"
              title={media.caption || "Embed"}>
            </iframe>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Post Text -->
  {#if post.text}
    <div class="post-text suisse-font">
      {post.text}
    </div>
  {/if}

  <!-- Author and Timestamp -->
  <div class="post-signature">
    —{post.author?.username} <span class="separator">|</span> <span class="timestamp">{formatDate(post.createdAt)}</span>
  </div>
</article>

<style>
  .post {
    margin-bottom: 24px;
    border-radius: 0px;
    padding: 12px 16px;
    background: #fff;
  }

  .media-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 10px;
  }

  .media-item {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1);
    border-radius: 0px;
    overflow: hidden;
    transform: translateZ(0); /* Helps with rendering the shadow */
    margin: 4px 0;
    width: 100%;
    background: #f6f6f6;
  }

  .media-item img,
  .media-item video {
    width: 100%;
    /* No default max-height to allow images to fill width */
    object-fit: contain; /* Default to contain to prevent cropping */
    border-radius: 0px;
    background: #f6f6f6;
    display: block; /* Removes any bottom spacing */
  }

  /* Wide media (landscape) */
  :global(.media-item.wide-media) img,
  :global(.media-item.wide-media) video {
    object-fit: cover;
    width: 100%;
  }

  /* Square-ish media */
  :global(.media-item.square-media) img,
  :global(.media-item.square-media) video {
    object-fit: contain;
    width: 100%;
  }

  /* Tall media (portrait) */
  :global(.media-item.tall-media) img,
  :global(.media-item.tall-media) video {
    object-fit: contain;
    width: 100%;
  }

  /* Very tall media (greater than 1:3 ratio) */
  :global(.media-item.very-tall-media) img,
  :global(.media-item.very-tall-media) video {
    object-fit: contain;
    max-height: 800px;
    width: 100%;
  }

  .media-item iframe {
    width: 100%;
    min-height: 320px;
    border-radius: 0px;
    background: #f6f6f6;
    display: block;
  }
  .media-item audio {
    width: 100%;
    display: block;
  }

  .post-text {
    margin: 10px 0;
    font-size: 1.1em;
    line-height: 1.7;
  }

  .post-signature {
    text-align: right;
    font-size: 0.93em;
    color: #888;
    font-style: italic;
    margin-top: 6px;
  }
  .post-signature .separator {
    margin: 0 6px;
    color: #ccc;
    font-style: normal;
  }

  .post-signature .timestamp {
    font-size: 0.8em;
    color: #bbb;
    font-style: normal;
  }
</style>
