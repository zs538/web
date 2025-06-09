<script lang="ts">
  import { onMount } from 'svelte';
  import { galleryActions, type GalleryImage } from '$lib/stores/galleryStore';
  import { hoverActions } from '$lib/stores/hoverStore';
  import { getMediaInfo, formatDate, formatTime, getPostContentTypes } from '$lib/utils/media-utils';
  import MediaEmbed from './MediaEmbed.svelte';
  import AudioPlayer from './AudioPlayer.svelte';

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

  let postElement: HTMLElement;
  let postsContainer: HTMLElement;



  // Filter images for gallery
  $: postImages = post.media?.filter(media => media.type === 'image').map((media, index): GalleryImage => ({
    id: media.id,
    url: media.url,
    caption: media.caption,
    position: media.position
  })) || [];



  // Handle image click to open gallery
  function handleImageClick(clickedMedia: any) {
    if (postImages.length === 0) return;

    // Find the index of the clicked image
    const clickedIndex = postImages.findIndex(img => img.id === clickedMedia.id);
    if (clickedIndex !== -1) {
      galleryActions.openGallery(postImages, clickedIndex);
    }
  }

  // Handle post hover
  function handlePostMouseEnter(event: MouseEvent) {
    if (!postElement) return;

    const rect = postElement.getBoundingClientRect();
    const positionX = Math.round(event.clientX - rect.left);
    const positionY = Math.round(event.clientY - rect.top);

    hoverActions.setHoverInfo({
      username: post.author.username,
      date: formatDate(post.createdAt),
      time: formatTime(post.createdAt),
      positionX,
      positionY,
      types: getPostContentTypes(post)
    });
  }

  // Handle post mouse move to update position
  function handlePostMouseMove(event: MouseEvent) {
    if (!postElement) return;

    const rect = postElement.getBoundingClientRect();
    const positionX = Math.round(event.clientX - rect.left);
    const positionY = Math.round(event.clientY - rect.top);

    hoverActions.updatePosition(positionX, positionY);
  }

  // Handle post mouse leave
  function handlePostMouseLeave() {
    hoverActions.clearHoverInfo();
  }

  // Handle media hover
  async function handleMediaMouseEnter(event: MouseEvent, media: any) {
    if (!postElement) return;

    const rect = postElement.getBoundingClientRect();
    const positionX = Math.round(event.clientX - rect.left);
    const positionY = Math.round(event.clientY - rect.top);

    // Get media info
    const mediaElement = event.target as HTMLElement;
    const mediaInfo = await getMediaInfo(mediaElement, media.type, media.url, media.caption);

    hoverActions.setHoverInfo({
      username: post.author.username,
      date: formatDate(post.createdAt),
      time: formatTime(post.createdAt),
      positionX,
      positionY,
      types: getPostContentTypes(post),
      media: mediaInfo
    });
  }





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

<article
  class="post"
  bind:this={postElement}
  on:mouseenter={handlePostMouseEnter}
  on:mousemove={handlePostMouseMove}
  on:mouseleave={handlePostMouseLeave}
>
  <!-- Media Gallery -->
  {#if post.media?.length > 0}
    <div class="media-container">
      {#each post.media as media}
        <div class="media-item">
          {#if media.type === 'image'}
            <button
              class="image-button"
              on:click={() => handleImageClick(media)}
              on:mouseenter={(e) => handleMediaMouseEnter(e, media)}
              aria-label="Open image in gallery"
            >
              <img
                data-src={media.url}
                alt={media.caption || 'Image'}
                loading="lazy"
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
                class="clickable-image"
              />
            </button>
          {:else if media.type === 'video'}
            <video
              controls
              data-src={media.url}
              preload="none"
              class="video-element"
              on:mouseenter={(e) => handleMediaMouseEnter(e, media)}
            >
              <track kind="captions" label="Captions" />
            </video>
          {:else if media.type === 'audio'}
            <div on:mouseenter={(e) => handleMediaMouseEnter(e, media)}>
              <AudioPlayer
                src={media.url}
                title={media.caption || 'Audio'}
                preload="metadata"
              />
            </div>
          {:else if media.type === 'embed'}
            <div on:mouseenter={(e) => handleMediaMouseEnter(e, media)}>
              <MediaEmbed
                url={media.url}
                title={media.caption || "Embedded content"}
              />
            </div>
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


</article>

<style>
  .post {
    margin: 24px 0; /* Add both top and bottom margins */
    border-radius: 0px;
    padding: 12px 16px 10px 16px;
    background: #fff;
    position: relative;
  }

  .post::after {
    content: '';
    position: absolute;
    bottom: -24px; /* Position right under the bottom margin (24px) */
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

  /* Image button styling */
  .image-button {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    width: 100%;
    display: block;
    cursor: pointer;
  }

  .image-button:focus {
    outline: 2px solid #007acc;
    outline-offset: 2px;
  }

  /* Clickable image inherits from media-item img */

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
    max-height: 80vh; /* Responsive max-height based on viewport */
    width: 100%;
  }

  /* Styling for audio player and embeds */
  :global(.media-item .audio-player) {
    width: 100%;
    display: block;
  }

  .post-text {
    margin: 10px 0;
    font-size: 1.1em;
    line-height: 1.7;
    overflow-wrap: break-word; /* Break long words */
    word-wrap: break-word; /* Legacy property for IE support */
    word-break: break-word; /* More elegant breaking than break-all */
    hyphens: auto; /* Add hyphens when breaking words */
    -webkit-hyphens: auto;
    -ms-hyphens: auto;
    white-space: pre-wrap; /* Preserve whitespace and newlines */
  }


</style>
