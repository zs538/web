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
    // Use IntersectionObserver to lazy load and process images
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          // Set the actual src only when the image is in view
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.onload = () => checkImageAspectRatio(img);
            imageObserver.unobserve(img);
          }
        }
      });
    }, { rootMargin: '200px' }); // Load images when they're within 200px of the viewport

    // Use IntersectionObserver to lazy load videos
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target as HTMLVideoElement;
          if (!video.dataset.src) return;

          // Set preload to metadata to get dimensions first
          video.preload = 'metadata';
          video.src = video.dataset.src;

          // When metadata is loaded, set the container size
          video.onloadedmetadata = () => {
            const mediaItem = video.closest('.media-item');
            if (mediaItem) {
              // Apply aspect ratio class based on video dimensions
              const aspectRatio = video.videoWidth / video.videoHeight;
              applyAspectRatioClass(mediaItem, aspectRatio);

              // Set fixed height based on aspect ratio to prevent layout shifts
              const containerWidth = mediaItem.clientWidth;
              const calculatedHeight = containerWidth / aspectRatio;
              (mediaItem as HTMLElement).style.height = `${calculatedHeight}px`;

              // Create a simple resize handler
              const resizeHandler = () => {
                const newWidth = (mediaItem as HTMLElement).clientWidth;
                const newHeight = newWidth / aspectRatio;
                (mediaItem as HTMLElement).style.height = `${newHeight}px`;
              };

              // Add resize listener
              window.addEventListener('resize', resizeHandler);

              // Clean up when video is removed
              video.addEventListener('emptied', () => {
                window.removeEventListener('resize', resizeHandler);
              });
            }

            videoObserver.unobserve(video);
          };
        }
      });
    }, { rootMargin: '200px' }); // Load videos when they're within 200px of the viewport

    // Observe all images
    const images = document.querySelectorAll('.post img[data-src]') as NodeListOf<HTMLImageElement>;
    images.forEach(img => imageObserver.observe(img));

    // Observe all videos
    const videos = document.querySelectorAll('.post video[data-src]') as NodeListOf<HTMLVideoElement>;
    videos.forEach(video => videoObserver.observe(video));

    return () => {
      // Clean up observers when component is destroyed
      imageObserver.disconnect();
      videoObserver.disconnect();
    };
  });

  // Helper function to apply aspect ratio classes to any media element
  function applyAspectRatioClass(element: Element, aspectRatio: number) {
    // Clear any existing classes
    element.classList.remove('wide-media', 'tall-media', 'square-media', 'very-tall-media');

    // Apply appropriate class based on aspect ratio
    if (aspectRatio > 1.5) {
      // Wide media (landscape)
      element.classList.add('wide-media');
    } else if (aspectRatio < 0.33) {
      // Very tall media (greater than 1:3 ratio)
      element.classList.add('very-tall-media');
    } else if (aspectRatio < 0.67) {
      // Tall media (portrait)
      element.classList.add('tall-media');
    } else {
      // Roughly square media
      element.classList.add('square-media');
    }
  }

  // Check image aspect ratio and apply appropriate class
  function checkImageAspectRatio(img: HTMLImageElement) {
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const mediaItem = img.closest('.media-item');
    if (!mediaItem) return;
    applyAspectRatioClass(mediaItem, aspectRatio);
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
              data-src={media.url}
              alt={media.caption || 'Image'}
              loading="lazy"
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
            />
          {:else if media.type === 'video'}
            <video
              controls
              data-src={media.url}
              preload="none"
              class="video-element"
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
    position: relative;
  }

  .post::after {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 0;
    width: 100%;
    height: 1px;
    background-color: #eaeaea;
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

  /* Video styling - simple and clean */
  .media-item video.video-element {
    object-fit: contain;
    width: 100%;
    display: block;
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
